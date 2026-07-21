import { getBattleEnergyBonus, getRunMaxHealth } from '../../run/runResources';
import { GRID_CONFIG } from '../../config/gridConfig';
import {
    GAME_RULES,
    getCardDefinitionOrThrow,
    getCardHandEndPenalty,
} from '../config/cardRegistry';
import {
    type LoadedCardGameEnemyDefinition,
} from '../config/enemyCatalog';
import { buildAttackSequence as buildRawAttackSequence, planAttack } from '../combat/AttackPipeline';
import {
    aggregateBattleModifiers,
    scaleIncomingDamage,
    type BattleModifier,
    type BattleModifierDuration,
    type BattleModifierStat,
} from '../combat/battleModifiers';
import { collectBattleModifierApplications } from '../combat/chainBattleModifiers';
import {
    applyEnemyPassivesToSequence,
    type DampenField,
} from '../enemyPassives/applyEnemyPassives';
import { getEnemyPassive } from '../enemyPassives/defaults';
import { collectCombatTraitsFromBodyMods } from '../combat/combatTraits/collect';
import { getCombatTrait } from '../combat/combatTraits/defaults';
import type { CombatTraitConfig } from '../combat/combatTraits/types';
import { BoardEditController } from '../domain/BoardEditController';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { CombatResolver } from '../domain/CombatResolver';
import { DeckHand } from '../domain/DeckHand';
import { EnemyPhaseController } from '../domain/EnemyPhaseController';
import { FieldEffects } from '../domain/FieldEffects';
import { isPlayerOwnedCard } from '../domain/cardOwnership';
import { createCardInstance } from '../domain/createCardInstance';
import { createEnemyCombatant, isCombatantAlive, normalizeEnemyIds } from './enemyCombatants';
import type {
    ActivationStep,
    AttackReadiness,
    AttackSequence,
    CardInstance,
    DamageResult,
    EnemyCombatant,
    EnemyState,
    EnemyTurnAction,
    PlayerState,
    PlayerDamageResult,
    SlotPosition,
    HandPenaltyResult,
} from './types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';
import type { CardDirection } from './cardDirections';

export interface PuzzleModeConfig {
    handCards: readonly {
        definitionId: string;
        arrow?: CardDirection;
        loopArrow?: CardDirection;
    }[];
    damageTarget: number;
}

export class CardGameSession
{
    readonly board: BoardModel;
    private readonly deckHand: DeckHand;
    private readonly fieldEffects: FieldEffects;
    private readonly combat: CombatResolver;
    private readonly enemyPhase: EnemyPhaseController;
    private readonly boardEdit: BoardEditController;
    /** Definition ids exhausted (played) this battle — battle-scoped only. */
    private readonly exhaustedDefinitionIds: string[] = [];
    private readonly combatants: EnemyCombatant[] = [];
    private attackTargetId: string | null = null;
    private player: PlayerState;
    private energy: number;
    private readonly maxEnergy: number;
    private readonly battleModifiers: BattleModifier[] = [];
    private readonly puzzleMode: PuzzleModeConfig | null;
    private puzzleFinished = false;
    private readonly bodyMods: readonly string[];
    private chainStart: SlotPosition = {
        row: GAME_RULES.activationStart.row,
        col: GAME_RULES.activationStartColumn,
    };

    constructor (
        enemyIds: string | readonly string[] = GAME_RULES.defaultEnemyId,
        startHealth?: number,
        deckDefinitionIds?: readonly string[],
        bodyMods: readonly string[] = [],
        puzzleMode: PuzzleModeConfig | null = null,
        runAttackCount = 0,
    )
    {
        this.puzzleMode = puzzleMode;
        this.bodyMods = bodyMods;

        for (const [ index, definitionId ] of normalizeEnemyIds(enemyIds).entries())
        {
            this.combatants.push(createEnemyCombatant(`enemy-${index}`, definitionId));
        }

        const maxHealth = getRunMaxHealth(bodyMods);
        this.player = {
            health: startHealth !== undefined
                ? Math.min(maxHealth, Math.max(1, Math.round(startHealth)))
                : maxHealth,
            maxHealth,
            shield: 0,
        };

        this.board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        this.fieldEffects = new FieldEffects(this.board);
        this.deckHand = new DeckHand(
            deckDefinitionIds,
            puzzleMode ? 0 : GAME_RULES.fightRerollsPerFight,
        );
        this.combat = new CombatResolver({
            board: this.board,
            fieldEffects: this.fieldEffects,
            bodyMods: this.bodyMods,
            puzzleMode: this.puzzleMode,
            battleModifiers: this.battleModifiers,
            player: this.player,
            getCombatants: () => this.combatants,
            getLivingCombatants: () => this.getLivingCombatants(),
            getCombatant: (instanceId) => this.getCombatant(instanceId),
            getCombatantOrThrow: (instanceId) => this.getCombatantOrThrow(instanceId),
            getTargetCombatant: () => this.getTargetCombatant(),
            getAttackTargetId: () => this.getAttackTargetId(),
            setAttackTargetId: (instanceId) => { this.attackTargetId = instanceId; },
            ensureAttackTarget: () => this.ensureAttackTarget(),
            resolveAttackTargetId: (explicit) => this.resolveAttackTargetId(explicit),
        }, runAttackCount);
        this.enemyPhase = new EnemyPhaseController({
            combatants: this.combatants,
            getLivingCombatants: () => this.getLivingCombatants(),
            getCombatant: (instanceId) => this.getCombatant(instanceId),
            isEnemyDefeated: () => this.isEnemyDefeated(),
            isPlayerDefeated: () => this.isPlayerDefeated(),
            getPlayer: () => this.getPlayer(),
            getEnemy: (instanceId) => this.getEnemy(instanceId),
            rampEnemyAction: (action) => this.rampEnemyAction(action),
            applySilenceTilesFromPassives: () =>
            {
                const passives = this.getLivingCombatants().flatMap((entry) => entry.definition.passives);
                this.fieldEffects.applySilenceTiles(passives);
            },
        });
        this.boardEdit = new BoardEditController({
            board: this.board,
            deckHand: this.deckHand,
            isBusy: () => this.combat.isAttackInProgress() || this.enemyPhase.isEnemyTurnInProgress(),
            isPuzzleFinished: () => this.puzzleFinished,
            isSlotBlockedForPlayer: (slot) => this.isSlotBlockedForPlayer(slot),
            onCardExhausted: (definitionId) =>
            {
                this.exhaustedDefinitionIds.push(definitionId);
            },
        });

        const hitWard = getCombatTrait(collectCombatTraitsFromBodyMods(bodyMods), 'hitWard');

        if (hitWard)
        {
            this.combat.initPlayerHitWard(hitWard.hitsBlocked);
        }

        const bonusEnergy = getBattleEnergyBonus(bodyMods);
        this.maxEnergy = puzzleMode
            ? 1
            : Math.max(1, Math.round(GAME_RULES.energyPerTurn) + bonusEnergy);
        this.energy = this.maxEnergy;

        if (puzzleMode)
        {
            this.deckHand.initPuzzleHand(
                puzzleMode.handCards.map((spec) => createCardInstance(
                    spec.definitionId,
                    spec.arrow,
                    'player',
                    spec.loopArrow,
                )),
            );
            this.enemyPhase.clearQueuedTurn();
        }
        else
        {
            this.renewHand();
            this.enemyPhase.queueNextEnemyTurn();
        }

        this.deckHand.emitRerollsChanged();
    }

    getDeckSize (): number
    {
        return this.deckHand.getDeckSize();
    }

    getDiscardSize (): number
    {
        return this.deckHand.getDiscardSize();
    }

    getPileCounts (): { deckSize: number; discardSize: number }
    {
        return this.deckHand.getPileCounts();
    }

    /** Draw-pile card definition ids. */
    getDeckDefinitionIds (): string[]
    {
        return this.deckHand.getDeckDefinitionIds();
    }

    /** Draw pile cards (includes arrow / loopArrow for inspectors). */
    getDeckCards (): readonly CardInstance[]
    {
        return this.deckHand.getDeckCards();
    }

    /** Discard-pile card definition ids. */
    getDiscardDefinitionIds (): string[]
    {
        return this.deckHand.getDiscardDefinitionIds();
    }

    /** Discard pile cards (includes arrow / loopArrow for inspectors). */
    getDiscardCards (): readonly CardInstance[]
    {
        return this.deckHand.getDiscardCards();
    }

    /** Next card that would be drawn (`deck.pop()`). */
    getDeckTopCard (): CardInstance | undefined
    {
        return this.deckHand.getDeckTopCard();
    }

    /** Most recently discarded card. */
    getDiscardTopCard (): CardInstance | undefined
    {
        return this.deckHand.getDiscardTopCard();
    }

    /** Single-use cards played this battle (for tests and debugging). */
    getExhaustedDefinitionIds (): readonly string[]
    {
        return [ ...this.exhaustedDefinitionIds ];
    }

    /** Run-wide attack counter (increments each time the player starts an attack). */
    getRunAttackCount (): number
    {
        return this.combat.getRunAttackCount();
    }

    /** Whether the current attack has Mark VII double damage active. */
    isDoubleDamageThisAttack (): boolean
    {
        return this.combat.isDoubleDamageThisAttack();
    }

    getEnergy (): number
    {
        return this.energy;
    }

    getMaxEnergy (): number
    {
        return this.maxEnergy;
    }

    hasEnergy (): boolean
    {
        return this.energy > 0;
    }

    /** Attacks the player has taken so far this round (one energy spent per attack). */
    getAttacksThisRound (): number
    {
        return this.maxEnergy - this.energy;
    }

    /** Bonus damage the enemy gains for the player's escalating attacks this round. */
    getEnemyDamageRamp (): number
    {
        const perAttack = Math.max(0, GAME_RULES.enemyDamageRampPerAttack ?? 0);

        // The first attack of a round is baseline; each additional attack ramps enemy damage.
        return Math.max(0, this.getAttacksThisRound() - 1) * perAttack;
    }

    /** Applies the round's escalation ramp to an enemy action's attack steps. */
    private rampEnemyAction (action: EnemyTurnAction): EnemyTurnAction
    {
        const bonus = this.getEnemyDamageRamp();
        const totals = aggregateBattleModifiers(this.battleModifiers);

        return {
            ...action,
            steps: action.steps.map((step) =>
            {
                if (step.kind !== 'attack')
                {
                    return { ...step };
                }

                const base = (step.amount ?? 0) + bonus;

                return {
                    ...step,
                    amount: scaleIncomingDamage(base, totals.enemyAttack, totals.playerDamageTaken),
                };
            }),
        };
    }

    addBattleModifier (
        stat: BattleModifierStat,
        delta: number,
        source: BattleModifier['source'],
        duration: BattleModifierDuration = 'energy-round',
    ): void
    {
        if (delta === 0)
        {
            return;
        }

        this.battleModifiers.push({ stat, delta, source, duration });
    }

    addBattleModifierFromCard (definitionId: string): void
    {
        const definition = getCardDefinitionOrThrow(definitionId);

        if (!definition.battleModifier)
        {
            return;
        }

        this.addBattleModifier(
            definition.battleModifier.stat,
            definition.battleModifier.delta,
            'player',
            definition.battleModifier.duration ?? 'energy-round',
        );
    }

    applyBattleModifiersFromChain (chain: readonly ActivationStep[]): void
    {
        for (const definitionId of collectBattleModifierApplications(chain))
        {
            this.addBattleModifierFromCard(definitionId);
        }
    }

    addBattleModifierFromEnemyStep (step: import('../domain/types').EnemyTurnStep): void
    {
        if (step.kind !== 'battle-mod' || step.modifierStat === undefined || step.modifierDelta === undefined)
        {
            return;
        }

        this.addBattleModifier(step.modifierStat, step.modifierDelta, 'enemy', 'energy-round');
    }

    getBattleModifiers (): readonly BattleModifier[]
    {
        return [ ...this.battleModifiers ];
    }

    getPlayerCombatTraits (): readonly CombatTraitConfig[]
    {
        return this.combat.getPlayerCombatTraits();
    }

    resolveAllyHeal (amount: number, targetInstanceId: string): EnemyState
    {
        return this.combat.resolveAllyHeal(amount, targetInstanceId);
    }

    resolveAllyShield (amount: number, targetInstanceId: string): EnemyState
    {
        return this.combat.resolveAllyShield(amount, targetInstanceId);
    }

    clearBattleModifiers (): void
    {
        this.battleModifiers.length = 0;
    }

    clearTransientBattleModifiers (): void
    {
        // All battle modifiers last the full energy round.
    }

    /** Enemy turn telegraph with ramp + active battle modifiers baked in. */
    getTelegraphedEnemyTurn (instanceId: string): EnemyTurnAction | null
    {
        return this.enemyPhase.getTelegraphedEnemyTurn(instanceId);
    }

    getScaledArmorGain (armor: number): number
    {
        return this.combat.getScaledArmorGain(armor);
    }

    /** Spends one energy for an attack. Returns false when none remains. */
    spendEnergy (): boolean
    {
        if (this.energy <= 0)
        {
            return false;
        }

        this.energy -= 1;

        return true;
    }

    private resetEnergy (): void
    {
        this.energy = this.maxEnergy;
    }

    /** Tops the hand back up to the full hand size without discarding held cards. */
    refillHand (): void
    {
        this.deckHand.refillHand();
    }

    /** Adds a card to the hand (used by curse passives and future events). */
    addCardToHand (definitionId: string, ignoreHandLimit = false): boolean
    {
        return this.deckHand.addCardToHand(definitionId, ignoreHandLimit);
    }

    /**
     * Damages the player for each hand card with a hand-end penalty still held
     * when the turn ends, then exhausts those cards (battle-scoped removal).
     */
    resolveHandEndPenalties (): HandPenaltyResult
    {
        const penalizedCards: { definitionId: string; damage: number }[] = [];
        const penalizedIndices: number[] = [];
        let totalDamage = 0;

        for (let handIndex = 0; handIndex < this.deckHand.getHandLength(); handIndex++)
        {
            const card = this.deckHand.getHand()[handIndex]!;
            const definition = getCardDefinitionOrThrow(card.definitionId);
            const damage = getCardHandEndPenalty(definition);

            if (damage <= 0)
            {
                continue;
            }

            penalizedCards.push({ definitionId: card.definitionId, damage });
            penalizedIndices.push(handIndex);
            totalDamage += damage;
        }

        if (totalDamage > 0)
        {
            this.resolveEnemyAttack(totalDamage);
        }

        for (const card of this.deckHand.exhaustHandCardsAt(penalizedIndices))
        {
            this.exhaustedDefinitionIds.push(card.definitionId);
        }

        return { totalDamage, penalizedCards };
    }

    /** Enemy passives that slip curse cards into the player's hand between turns. */
    private applyEnemyCurseHand (): void
    {
        for (const combatant of this.getLivingCombatants())
        {
            const curseHand = getEnemyPassive(combatant.definition.passives, 'curseHand');

            if (!curseHand)
            {
                continue;
            }

            for (let i = 0; i < curseHand.count; i++)
            {
                this.addCardToHand(curseHand.cardId, true);
            }
        }
    }

    getRerollsRemaining (): number
    {
        return this.deckHand.getRerollsRemaining();
    }

    canReroll (): boolean
    {
        return this.canEditBoard() && this.deckHand.getRerollsRemaining() > 0;
    }

    /** Discards selected hand cards and draws replacements. Uses one fight reroll. */
    rerollHandCards (handIndices: number[]): boolean
    {
        if (!this.canReroll())
        {
            return false;
        }

        return this.deckHand.rerollHandCards(handIndices);
    }

    /** Discards the current hand and draws a fresh one for the next player turn. */
    renewHand (): void
    {
        this.player.shield = 0;
        this.deckHand.renewHand();
        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.player.shield });
    }

    getChainStartSlot (): SlotPosition
    {
        return { ...this.chainStart };
    }

    setChainStartSlot (slot: SlotPosition): boolean
    {
        if (this.combat.isAttackInProgress() || this.enemyPhase.isEnemyTurnInProgress())
        {
            return false;
        }

        if (slot.col !== GAME_RULES.activationStartColumn || slot.row < 0 || slot.row >= GRID_CONFIG.rows)
        {
            return false;
        }

        this.chainStart = { row: slot.row, col: slot.col };

        return true;
    }

    isPuzzleMode (): boolean
    {
        return this.puzzleMode !== null;
    }

    getPuzzleDamageTarget (): number | null
    {
        return this.puzzleMode?.damageTarget ?? null;
    }

    isPuzzleFinished (): boolean
    {
        return this.puzzleFinished;
    }

    evaluatePuzzleAttack (sequence: AttackSequence): { success: boolean; damageDealt: number }
    {
        const damageDealt = sequence.totalDamage
            + sequence.offChainDamage
            + sequence.abilityEnemyDamage;
        const target = this.puzzleMode?.damageTarget ?? 0;

        return {
            success: damageDealt >= target,
            damageDealt,
        };
    }

    finishPuzzle (): void
    {
        this.puzzleFinished = true;
    }

    getCombatants (): readonly EnemyCombatant[]
    {
        return this.combatants;
    }

    getCombatant (instanceId: string): EnemyCombatant | undefined
    {
        return this.combatants.find((combatant) => combatant.instanceId === instanceId);
    }

    getLivingCombatants (): EnemyCombatant[]
    {
        return this.combatants.filter((combatant) => isCombatantAlive(combatant));
    }

    hasMultipleEnemies (): boolean
    {
        return this.combatants.length > 1;
    }

    getAttackTargetId (): string | null
    {
        if (!this.attackTargetId)
        {
            return null;
        }

        const combatant = this.getCombatant(this.attackTargetId);

        return combatant && isCombatantAlive(combatant) ? this.attackTargetId : null;
    }

    setAttackTarget (instanceId: string): boolean
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant || !isCombatantAlive(combatant))
        {
            return false;
        }

        this.attackTargetId = instanceId;

        return true;
    }

    hasValidAttackTarget (): boolean
    {
        return this.getAttackTargetId() !== null;
    }

    /** Picks a lone living enemy automatically; returns null when the player must choose. */
    ensureAttackTarget (): string | null
    {
        const current = this.getAttackTargetId();

        if (current)
        {
            return current;
        }

        const living = this.getLivingCombatants();

        if (living.length === 1)
        {
            this.attackTargetId = living[0]!.instanceId;

            return this.attackTargetId;
        }

        return null;
    }

    private getTargetCombatant (): EnemyCombatant
    {
        const targetId = this.getAttackTargetId() ?? this.getLivingCombatants()[0]?.instanceId;
        const combatant = targetId ? this.getCombatant(targetId) : this.combatants[0];

        if (!combatant)
        {
            throw new Error('No enemy combatants in session');
        }

        return combatant;
    }

    private getCombatantOrThrow (instanceId: string): EnemyCombatant
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant)
        {
            throw new Error(`Unknown enemy combatant: ${instanceId}`);
        }

        return combatant;
    }

    private resolveAttackTargetId (explicit?: string): string
    {
        if (explicit)
        {
            return explicit;
        }

        const targetId = this.ensureAttackTarget();

        if (!targetId)
        {
            throw new Error('Attack target required');
        }

        return targetId;
    }

    getEnemy (instanceId?: string): EnemyState
    {
        const combatant = instanceId
            ? this.getCombatant(instanceId)
            : this.getTargetCombatant();

        return combatant ? { ...combatant.state } : { health: 0, maxHealth: 0, shield: 0 };
    }

    getEnemyDefinition (instanceId?: string): LoadedCardGameEnemyDefinition
    {
        const combatant = instanceId
            ? this.getCombatant(instanceId)
            : this.getTargetCombatant();

        return combatant.definition;
    }

    getHand (): readonly CardInstance[]
    {
        return this.deckHand.getHand();
    }

    getSilencedSlots (): SlotPosition[]
    {
        return this.fieldEffects.getSilencedSlots();
    }

    getBombDisabledSlots (): SlotPosition[]
    {
        return this.fieldEffects.getBombDisabledSlots();
    }

    isSlotSilenced (slot: SlotPosition): boolean
    {
        return this.fieldEffects.isSlotSilenced(slot);
    }

    isSlotBombDisabled (slot: SlotPosition): boolean
    {
        return this.fieldEffects.isSlotBombDisabled(slot);
    }

    isSlotBlockedForPlayer (slot: SlotPosition): boolean
    {
        return this.fieldEffects.isSlotBlockedForPlayer(slot);
    }

    buildAttackSequence (
        chain: import('../domain/types').ActivationStep[],
        stepMs = GAME_RULES.activationStepMs,
    ): AttackSequence
    {
        const target = this.getTargetCombatant();
        const sequence = applyEnemyPassivesToSequence(
            buildRawAttackSequence(chain, this.board, stepMs),
            target.state,
            target.definition.passives,
        );

        return this.fieldEffects.applyDampeningToSequence(sequence);
    }

    /** Casts the Dead Zone field (from the dampenTiles ability) for the coming player turns. */
    activateDampenField (): DampenField | null
    {
        const passives = this.getLivingCombatants().flatMap((combatant) => combatant.definition.passives);

        return this.fieldEffects.activateDampenField(passives);
    }

    getDampenField (): DampenField | null
    {
        return this.fieldEffects.getDampenField();
    }

    /** Ages the Dead Zone field by one player turn, expiring it when it runs out. */
    tickDampenField (): void
    {
        this.fieldEffects.tickDampenField();
    }

    /** Tiles currently weakened by the Dead Zone field (empty when inactive). */
    getDampenedSlots (): SlotPosition[]
    {
        return this.fieldEffects.getDampenedSlots();
    }

    getPlayer (): PlayerState
    {
        return { ...this.player };
    }

    isAttackInProgress (): boolean
    {
        return this.combat.isAttackInProgress();
    }

    isEnemyTurnInProgress (): boolean
    {
        return this.enemyPhase.isEnemyTurnInProgress();
    }

    isEnemyDefeated (): boolean
    {
        return this.getLivingCombatants().length === 0;
    }

    isPlayerDefeated (): boolean
    {
        return this.player.health <= 0;
    }

    getQueuedEnemyTurn (instanceId?: string): EnemyTurnAction | null
    {
        return this.enemyPhase.getQueuedEnemyTurn(instanceId);
    }

    getQueuedEnemyTurns (): EnemyTurnAction[]
    {
        return this.enemyPhase.getQueuedEnemyTurns();
    }

    queueNextEnemyTurn (): EnemyTurnAction
    {
        return this.enemyPhase.queueNextEnemyTurn();
    }

    getAttackReadiness (): AttackReadiness
    {
        if (this.combat.isAttackInProgress())
        {
            return { canAttack: false, reason: 'attack-in-progress' };
        }

        if (this.enemyPhase.isEnemyTurnInProgress())
        {
            return { canAttack: false, reason: 'enemy-turn' };
        }

        if (this.isEnemyDefeated())
        {
            return { canAttack: false, reason: 'enemy-defeated' };
        }

        if (this.isPlayerDefeated())
        {
            return { canAttack: false, reason: 'player-defeated' };
        }

        if (this.hasMultipleEnemies() && !this.hasValidAttackTarget())
        {
            return { canAttack: false, reason: 'no-target' };
        }

        if (this.energy <= 0)
        {
            return { canAttack: false, reason: 'no-energy' };
        }

        const sequence = planAttack(this.board, this.chainStart);

        if (sequence.chain.length === 0)
        {
            return { canAttack: false, reason: 'no-cards-on-board' };
        }

        return { canAttack: true, reason: null };
    }

    planAttack (): AttackSequence | null
    {
        const readiness = this.getAttackReadiness();

        if (!readiness.canAttack)
        {
            return null;
        }

        return planAttack(this.board, this.chainStart);
    }

    beginAttack (): SlotPosition | null
    {
        if (this.combat.isAttackInProgress()
            || this.enemyPhase.isEnemyTurnInProgress()
            || this.isEnemyDefeated()
            || this.isPlayerDefeated())
        {
            return null;
        }

        const chain = planAttack(this.board, this.chainStart).chain;

        if (!this.combat.beginAttack(chain.length))
        {
            return null;
        }

        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_STARTED, { chainStart: { ...this.chainStart } });

        return { ...this.chainStart };
    }

    emitAttackStep (stepIndex: number, sequence: AttackSequence): void
    {
        this.combat.emitAttackStep(stepIndex, sequence);
    }

    grantPlayerShield (amount: number): void
    {
        this.combat.grantPlayerShield(amount);
    }

    healPlayer (amount: number): void
    {
        this.combat.healPlayer(amount);
    }

    dealAttackDamage (
        damage: number,
        targetInstanceId?: string,
        sourceDefinitionId?: string,
    ): DamageResult
    {
        return this.combat.dealAttackDamage(damage, targetInstanceId, sourceDefinitionId);
    }

    completeAttack (sequence: AttackSequence): void
    {
        this.combat.completeAttack(sequence);
    }

    releaseAttackLock (): void
    {
        this.combat.releaseAttackLock();
    }

    hasQueuedEnemyTurn (): boolean
    {
        return this.enemyPhase.hasQueuedEnemyTurn();
    }

    hasMoreEnemyTurnsInPhase (): boolean
    {
        return this.enemyPhase.hasMoreEnemyTurnsInPhase();
    }

    prepareEnemyPhase (): EnemyTurnAction[]
    {
        return this.enemyPhase.prepareEnemyPhase();
    }

    beginEnemyTurn (): EnemyTurnAction | null
    {
        return this.enemyPhase.beginEnemyTurn();
    }

    completeSingleEnemyTurn (action: EnemyTurnAction): void
    {
        this.enemyPhase.completeSingleEnemyTurn(action);
    }

    completeEnemyPhase (): void
    {
        this.enemyPhase.completeEnemyPhase();
    }

    /** Refreshes the player between attacks in the same energy round (board persists). */
    refreshPlayerAfterMidRoundEnemy (): void
    {
        if (this.isPlayerDefeated() || this.isEnemyDefeated())
        {
            return;
        }

        this.refillHand();
        this.clearTransientBattleModifiers();
        this.applyEnemyCurseHand();
    }

    /** Starts the next energy round after the board has been cleared. */
    finishPlayerRound (): void
    {
        if (this.isPlayerDefeated() || this.isEnemyDefeated())
        {
            return;
        }

        this.renewHand();
        this.resetEnergy();
        this.clearBattleModifiers();
        this.applyEnemyCurseHand();
    }

    finishEnemyPhase (): void
    {
        this.completeEnemyPhase();

        if (this.isPlayerDefeated() || this.isEnemyDefeated())
        {
            return;
        }

        if (this.energy <= 0)
        {
            this.finishPlayerRound();
        }
        else
        {
            this.refreshPlayerAfterMidRoundEnemy();
        }
    }

    resolveEnemyAttack (damage: number): PlayerDamageResult
    {
        return this.combat.resolveEnemyAttack(damage);
    }

    resolveEnemyShield (shield: number, instanceId?: string): EnemyState
    {
        return this.combat.resolveEnemyShield(shield, instanceId);
    }

    getEnemyPoison (instanceId?: string): number
    {
        return this.combat.getEnemyPoison(instanceId);
    }

    tickPoison (instanceId?: string): DamageResult
    {
        return this.combat.tickPoison(instanceId);
    }

    /** Places an enemy trap on a random empty slot in the last three columns, avoiding tiles next to another trap when possible. */
    placeEnemyHazard (): SlotPosition | null
    {
        return this.fieldEffects.placeEnemyHazard();
    }

    /** Places a field boost on a random empty board slot (any row/column). */
    placeFieldBoost (): SlotPosition | null
    {
        return this.fieldEffects.placeFieldBoost();
    }

    /** Trap explosions hit the player after the chain resolves. */
    resolveHazardDamage (damage: number): PlayerDamageResult
    {
        return this.combat.resolveHazardDamage(damage);
    }

    completeEnemyTurn (action: EnemyTurnAction): void
    {
        this.enemyPhase.completeSingleEnemyTurn(action);

        if (this.enemyPhase.hasMoreEnemyTurnsInPhase())
        {
            return;
        }

        this.enemyPhase.completeEnemyPhase();

        if (this.energy > 0)
        {
            this.refreshPlayerAfterMidRoundEnemy();
        }
    }

    /** Clears player cards from the board at end of player round (before the enemy acts). */
    clearBoard (): void
    {
        const toDiscard: CardInstance[] = [];

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (card && isPlayerOwnedCard(card) && !card.exhausted)
            {
                toDiscard.push(card);
            }
        }

        this.board.clear();
        this.deckHand.discardToPile(toDiscard);
    }

    cancelAttack (): void
    {
        this.combat.cancelAttack();
    }

    cancelEnemyTurn (): void
    {
        this.enemyPhase.cancelEnemyTurn();
    }

    placeCardFromHand (handIndex: number, slot: SlotPosition): boolean
    {
        return this.boardEdit.placeCardFromHand(handIndex, slot);
    }

    removeCardFromBoard (slot: SlotPosition): boolean
    {
        return this.boardEdit.removeCardFromBoard(slot);
    }

    moveCardOnBoard (from: SlotPosition, to: SlotPosition): boolean
    {
        return this.boardEdit.moveCardOnBoard(from, to);
    }

    swapCardsOnBoard (a: SlotPosition, b: SlotPosition): boolean
    {
        return this.boardEdit.swapCardsOnBoard(a, b);
    }

    canEditBoard (): boolean
    {
        return this.boardEdit.canEditBoard();
    }
}
