import { BODY_MOD_IDS } from '../../run/bodyMods';
import type { RunDeckCard } from '../../run/runDeck';
import { getBattleEnergyBonus, getRunMaxHealth } from '../../run/runResources';
import { collectRunModifierBattleModifiers } from '../../run/runModifiers';
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
import { scaleBoostedDelta } from '../combat/chainBoost';
import { getBattleModifierAnchor } from '../combat/battleModifierDisplay';
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
import {
    clearLatchSlots,
    getLatchKeepInstanceIds,
    noteLatchPlacement,
    noteLatchRemoval,
    type LatchSlots,
} from '../domain/boardPersist';
import { createCardInstance } from '../domain/createCardInstance';
import { createEnemyCombatant, isCombatantAlive, normalizeEnemyIds } from './enemyCombatants';
import { shatterPartsThatFit, shouldSpawnMinionAfterTurn } from '../enemyPassives/spawnShatter';
import {
    applyLinkRageToAllies,
    applyRerollTaxToCombatants,
    getCardThiefPassive,
    shouldFleeThisTurn,
    shouldStealCardThisTurn,
    stealCredFromRun,
} from '../enemyPassives/interactionPassives';
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
import { randomDirectionForPool, randomOrthogonalPair } from './cardDirections';

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
    private readonly runGold: number;
    private goldStolen = 0;
    private readonly permanentlyStolenCardIds: string[] = [];
    private nextCombatantIndex = 0;
    private attackTargetId: string | null = null;
    private player: PlayerState;
    private energy: number;
    private readonly maxEnergy: number;
    /** Original arrows for cards scrambled by redirect-hand this energy round. */
    private readonly handRedirectOriginals = new Map<string, {
        arrow: CardDirection;
        loopArrow?: CardDirection;
    }>();
    /** When true, scramble the next renewed hand (enemy acted as energy hit 0). */
    private pendingHandRedirect = false;
    /** Hand arrows stay twisted until the current energy round ends. */
    private handRedirectActiveThisRound = false;
    private readonly battleModifiers: BattleModifier[] = [];
    private readonly puzzleMode: PuzzleModeConfig | null;
    private puzzleFinished = false;
    private readonly bodyMods: readonly string[];
    private readonly latchSlots: LatchSlots = {};
    private chainStart: SlotPosition = {
        row: GAME_RULES.activationStart.row,
        col: GAME_RULES.activationStartColumn,
    };

    constructor (
        enemyIds: string | readonly string[] = GAME_RULES.defaultEnemyId,
        startHealth?: number,
        runDeck?: readonly RunDeckCard[],
        bodyMods: readonly string[] = [],
        puzzleMode: PuzzleModeConfig | null = null,
        runAttackCount = 0,
        rerollsRemaining?: number,
        runModifiers: readonly string[] = [],
        runGold = 0,
        enemyHealthMultiplier = 1,
    )
    {
        this.puzzleMode = puzzleMode;
        this.bodyMods = bodyMods;
        this.runGold = Math.max(0, runGold);

        const healthMultiplier = Math.max(0.5, enemyHealthMultiplier);

        for (const [ index, definitionId ] of normalizeEnemyIds(enemyIds).entries())
        {
            this.combatants.push(createEnemyCombatant(`enemy-${index}`, definitionId, healthMultiplier));
            this.nextCombatantIndex = index + 1;
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
            runDeck,
            puzzleMode ? 0 : (rerollsRemaining ?? GAME_RULES.rerollsPerFloor),
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
            shatterCombatantIfNeeded: (instanceId) => this.shatterCombatantIfNeeded(instanceId),
            onCombatantKilled: (instanceId) => this.onCombatantKilled(instanceId),
            tryTriggerPhaseShift: (combatant) => this.tryTriggerPhaseShift(combatant),
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
            isBusy: () => this.isBusy(),
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
        this.applyRunModifierBattleModifiers(runModifiers);

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

    private applyRunModifierBattleModifiers (runModifierIds: readonly string[]): void
    {
        for (const preset of collectRunModifierBattleModifiers(runModifierIds))
        {
            const anchor = getBattleModifierAnchor(preset.stat);

            this.addBattleModifier(
                preset.stat,
                preset.delta,
                anchor === 'player' ? 'player' : 'enemy',
            );
        }
    }

    addBattleModifierFromCard (definitionId: string, boostMultiplier = 1): void
    {
        const definition = getCardDefinitionOrThrow(definitionId);

        if (!definition.battleModifier)
        {
            return;
        }

        this.addBattleModifier(
            definition.battleModifier.stat,
            scaleBoostedDelta(definition.battleModifier.delta, boostMultiplier),
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

    registerCapacitorDefendStep (): void
    {
        this.combat.registerCapacitorDefendStep();
    }

    isCapacitorChargeReady (): boolean
    {
        return this.combat.isCapacitorChargeReady();
    }

    scalePoisonStacks (stacks: number): number
    {
        return this.combat.scalePoisonStacks(stacks);
    }

    scaleAbilityEnemyDamage (abilityId: string, damage: number): number
    {
        return this.combat.scaleAbilityEnemyDamage(abilityId, damage);
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

    /** Discards selected hand cards and draws replacements. Uses one floor reroll. */
    rerollHandCards (handIndices: number[]): boolean
    {
        if (!this.canReroll())
        {
            return false;
        }

        const rerolled = this.deckHand.rerollHandCards(handIndices);

        if (rerolled)
        {
            this.applyRerollTaxPassives();
        }

        return rerolled;
    }

    /** Applies reroll-tax passives after a successful hand reroll. */
    private applyRerollTaxPassives (): void
    {
        applyRerollTaxToCombatants(this.getLivingCombatants());
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
        return this.getLivingCombatants().length > 1;
    }

    tryTriggerPhaseShift (combatant: EnemyCombatant): { label: string; message: string } | null
    {
        if (combatant.phaseShiftActive)
        {
            return null;
        }

        const passive = getEnemyPassive(combatant.definition.passives, 'phaseShift');

        if (!passive || combatant.state.maxHealth <= 0)
        {
            return null;
        }

        const ratio = combatant.state.health / combatant.state.maxHealth;

        if (ratio > passive.healthRatio)
        {
            return null;
        }

        combatant.phaseShiftActive = true;

        const payload = {
            label: passive.label,
            message: passive.message,
        };

        CardGameEventBus.emit(CARD_GAME_EVENTS.PHASE_SHIFT, payload);

        return payload;
    }

    getCombatRecap (): { damageDealt: number; armorGained: number; damageTaken: number }
    {
        return this.combat.getCombatRecap();
    }

    getBattleDamageTotals (): { dealt: number; taken: number }
    {
        return this.combat.getBattleDamageTotals();
    }

    /** Adds a living combatant mid-battle (spawn / shatter). */
    addCombatant (definitionId: string): EnemyCombatant
    {
        const combatant = createEnemyCombatant(`enemy-${this.nextCombatantIndex}`, definitionId);
        this.nextCombatantIndex += 1;
        this.combatants.push(combatant);

        return combatant;
    }

    removeCombatant (instanceId: string): boolean
    {
        const index = this.combatants.findIndex((combatant) => combatant.instanceId === instanceId);

        if (index < 0)
        {
            return false;
        }

        if (this.attackTargetId === instanceId)
        {
            this.attackTargetId = null;
        }

        this.combatants.splice(index, 1);

        return true;
    }

    private emitCombatantsChanged (
        added: readonly string[],
        removed: readonly string[],
        reason: 'spawn' | 'shatter' | 'flee',
    ): void
    {
        CardGameEventBus.emit(CARD_GAME_EVENTS.COMBATANTS_CHANGED, {
            added: [ ...added ],
            removed: [ ...removed ],
            reason,
        });
    }

    /**
     * On kill: if the combatant has shatterOnDeath, remove it and spawn parts.
     * Emits COMBATANTS_CHANGED for UI sync.
     */
    shatterCombatantIfNeeded (instanceId: string): string[]
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant)
        {
            return [];
        }

        const livingOthers = this.getLivingCombatants()
            .filter((entry) => entry.instanceId !== instanceId)
            .length;
        const partIds = shatterPartsThatFit(combatant, livingOthers);

        if (partIds.length === 0)
        {
            return [];
        }

        this.removeCombatant(instanceId);
        const added = partIds.map((definitionId) => this.addCombatant(definitionId).instanceId);
        this.emitCombatantsChanged(added, [ instanceId ], 'shatter');

        return added;
    }

    /** After a host finishes its turn, maybe spawn a minion. */
    trySpawnMinionAfterEnemyTurn (instanceId: string): EnemyCombatant | null
    {
        const host = this.getCombatant(instanceId);

        if (!host)
        {
            return null;
        }

        const passive = shouldSpawnMinionAfterTurn(host, this.combatants);

        if (!passive)
        {
            return null;
        }

        const spawned = this.addCombatant(passive.minionId);
        this.emitCombatantsChanged([ spawned.instanceId ], [], 'spawn');

        return spawned;
    }

    onCombatantKilled (instanceId: string): void
    {
        const combatant = this.getCombatant(instanceId);

        if (combatant?.stolenCardId)
        {
            this.deckHand.returnStolenCardToDeck(combatant.stolenCardId);
            combatant.stolenCardId = undefined;
        }

        applyLinkRageToAllies(
            this.getLivingCombatants().filter((entry) => entry.instanceId !== instanceId),
        );
    }

    fleeCombatant (instanceId: string): void
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant)
        {
            return;
        }

        if (combatant.stolenCardId)
        {
            this.permanentlyStolenCardIds.push(combatant.stolenCardId);
            combatant.stolenCardId = undefined;
        }

        this.removeCombatant(instanceId);
        this.emitCombatantsChanged([], [ instanceId ], 'flee');
    }

    getRunBattleDeltas (): { goldStolen: number; stolenCardIds: readonly string[] }
    {
        return {
            goldStolen: this.goldStolen,
            stolenCardIds: [ ...this.permanentlyStolenCardIds ],
        };
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

    /** Cycles lock target to the next living enemy in squad order (wraps). */
    cycleAttackTarget (): string | null
    {
        const living = this.getLivingCombatants();

        if (living.length === 0)
        {
            return null;
        }

        if (living.length === 1)
        {
            this.attackTargetId = living[0]!.instanceId;

            return this.attackTargetId;
        }

        const ids = living.map((combatant) => combatant.instanceId);
        const current = this.getAttackTargetId();
        const currentIndex = current ? ids.indexOf(current) : -1;
        const nextIndex = (currentIndex + 1) % ids.length;

        this.attackTargetId = ids[nextIndex]!;

        return this.attackTargetId;
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
            const combatant = this.getCombatant(explicit);

            if (combatant && isCombatantAlive(combatant))
            {
                return explicit;
            }
        }

        const targetId = this.ensureAttackTarget();

        if (targetId)
        {
            return targetId;
        }

        const living = this.getLivingCombatants();

        if (living.length > 0)
        {
            this.attackTargetId = living[0]!.instanceId;

            return this.attackTargetId;
        }

        throw new Error('Attack target required');
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

    getLockedColumnSlots (): SlotPosition[]
    {
        return this.fieldEffects.getLockedColumnSlots();
    }

    /** Silenced tiles plus the locked pressure column — for board overlays. */
    getPlacementBlockedSlots (): SlotPosition[]
    {
        return [ ...this.getSilencedSlots(), ...this.getLockedColumnSlots() ];
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

    /** Locks a board column from a Gridlock `lock-column` turn step. */
    lockBoardColumn (column: number): number
    {
        return this.fieldEffects.lockColumn(column);
    }

    /** Nullifies a board column or row from a `nullify-lane` turn step. */
    nullifyBoardLane (lane: { axis: 'column' | 'row'; index: number }): { axis: 'column' | 'row'; index: number }
    {
        return this.fieldEffects.setNullifyLane(lane);
    }

    isSlotNullified (slot: SlotPosition): boolean
    {
        return this.fieldEffects.isSlotNullified(slot);
    }

    getNullifiedSlots (): SlotPosition[]
    {
        return this.fieldEffects.getNullifiedSlots();
    }

    getNullifyLane (): { axis: 'column' | 'row'; index: number } | null
    {
        return this.fieldEffects.getNullifyLane();
    }

    buildAttackSequence (
        chain: import('../domain/types').ActivationStep[],
        stepMs = GAME_RULES.activationStepMs,
    ): AttackSequence
    {
        const target = this.getTargetCombatant();
        const raw = buildRawAttackSequence(chain, this.board, stepMs);
        const passives = this.getLivingCombatants().flatMap((combatant) => combatant.definition.passives);
        const sequence = applyEnemyPassivesToSequence(
            raw,
            target.state,
            passives,
            chain,
        );

        return this.fieldEffects.applyDampeningToSequence(sequence);
    }

    /** Casts the Dead Zone field (from the dampenTiles ability) for the coming player turns. */
    activateDampenField (): DampenField | null
    {
        const passives = this.getLivingCombatants().flatMap((combatant) => combatant.definition.passives);

        return this.fieldEffects.activateDampenField(passives);
    }

    /**
     * Scrambles arrows on cards currently in hand for the rest of this energy round.
     * If energy is already spent, queues the scramble for the next renewed hand.
     */
    applyHandRedirect (): number
    {
        if (this.energy <= 0)
        {
            this.pendingHandRedirect = true;

            return 0;
        }

        this.handRedirectActiveThisRound = true;

        return this.scrambleHandArrows();
    }

    /** True while hand arrows are twisted (or queued for the next hand). */
    hasHandRedirect (): boolean
    {
        return this.handRedirectActiveThisRound
            || this.handRedirectOriginals.size > 0
            || this.pendingHandRedirect;
    }

    private scrambleHandArrows (): number
    {
        let changed = 0;

        for (const card of this.deckHand.getHand())
        {
            const definition = getCardDefinitionOrThrow(card.definitionId);

            if (definition.arrowPool === 'joker')
            {
                continue;
            }

            if (!this.handRedirectOriginals.has(card.instanceId))
            {
                this.handRedirectOriginals.set(card.instanceId, {
                    arrow: card.arrow,
                    loopArrow: card.loopArrow,
                });
            }

            if (definition.behaviorId === 'loop-reset')
            {
                const pair = randomOrthogonalPair();
                card.arrow = pair.arrow;
                card.loopArrow = pair.loopArrow;
            }
            else
            {
                card.arrow = randomDirectionForPool(definition.arrowPool);
            }

            changed += 1;
        }

        if (changed > 0)
        {
            CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, {
                hand: [ ...this.deckHand.getHand() ],
            });
        }

        return changed;
    }

    /** Restores any arrows twisted this round (hand, board, or piles). */
    private clearHandRedirect (): void
    {
        if (this.handRedirectOriginals.size === 0)
        {
            return;
        }

        const restore = (card: CardInstance): void =>
        {
            const original = this.handRedirectOriginals.get(card.instanceId);

            if (!original)
            {
                return;
            }

            card.arrow = original.arrow;

            if (original.loopArrow !== undefined)
            {
                card.loopArrow = original.loopArrow;
            }
            else
            {
                delete card.loopArrow;
            }
        };

        for (const card of this.deckHand.getHand())
        {
            restore(card);
        }

        for (const card of this.deckHand.getDeckCards())
        {
            restore(card);
        }

        for (const card of this.deckHand.getDiscardCards())
        {
            restore(card);
        }

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (card)
            {
                restore(card);
            }
        }

        this.handRedirectOriginals.clear();
        this.handRedirectActiveThisRound = false;
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

    /** True while a player attack or enemy turn is resolving — single busy gate for UI. */
    isBusy (): boolean
    {
        return this.combat.isAttackInProgress() || this.enemyPhase.isEnemyTurnInProgress();
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
        sourceBehaviorId?: string,
        sourceArrow?: import('./cardDirections').CardDirection,
    ): DamageResult
    {
        return this.combat.dealAttackDamage(
            damage,
            targetInstanceId,
            sourceDefinitionId,
            sourceBehaviorId,
            sourceArrow,
        );
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

        if (action.instanceId)
        {
            this.applyPostEnemyTurnPassives(action.instanceId);
            this.trySpawnMinionAfterEnemyTurn(action.instanceId);
        }
    }

    private applyPostEnemyTurnPassives (instanceId: string): void
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant || !isCombatantAlive(combatant))
        {
            return;
        }

        const credLeech = getEnemyPassive(combatant.definition.passives, 'credLeech');

        if (credLeech && this.runGold > 0)
        {
            const result = stealCredFromRun(this.runGold, this.goldStolen, credLeech.amountPerTurn);
            this.goldStolen = result.goldStolen;
        }

        const thief = getCardThiefPassive(combatant);

        if (thief)
        {
            if (shouldStealCardThisTurn(combatant, thief))
            {
                const stolen = this.deckHand.stealRandomDeckCard();

                if (stolen)
                {
                    combatant.stolenCardId = stolen;
                }
            }

            if (shouldFleeThisTurn(combatant, thief))
            {
                this.fleeCombatant(instanceId);
            }
        }
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

        if (this.handRedirectActiveThisRound)
        {
            this.scrambleHandArrows();
        }

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

        this.clearHandRedirect();
        this.renewHand();
        this.resetEnergy();
        this.clearBattleModifiers();

        if (this.pendingHandRedirect)
        {
            this.pendingHandRedirect = false;
            this.handRedirectActiveThisRound = true;
            this.scrambleHandArrows();
        }

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

    applyPoisonStacks (stacks: number, targetInstanceId?: string): number
    {
        return this.combat.applyPoisonStacks(stacks, targetInstanceId);
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

    placeEnemySiphon (): SlotPosition | null
    {
        return this.fieldEffects.placeEnemySiphon();
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

    /** Unchained leech nodes heal a living enemy (no revive if the fight is over). */
    resolveSiphonHeal (amount: number): { healed: number; targetInstanceId?: string }
    {
        return this.combat.resolveSiphonHeal(amount);
    }

    completeEnemyTurn (action: EnemyTurnAction): void
    {
        this.completeSingleEnemyTurn(action);

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
        const keepIds = this.getLatchKeepInstanceIds();
        const toDiscard: CardInstance[] = [];

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (!card)
            {
                continue;
            }

            if (keepIds.has(card.instanceId))
            {
                continue;
            }

            if (isPlayerOwnedCard(card) && !card.exhausted)
            {
                toDiscard.push(card);
            }

            this.board.removeCard(slot);
        }

        this.deckHand.discardToPile(toDiscard);
        this.reseedLatchFromBoard();
    }

    /** Instance ids Latch Array keeps on the grid through an energy-round wipe. */
    getLatchKeepInstanceIds (): ReadonlySet<string>
    {
        if (!this.bodyMods.includes(BODY_MOD_IDS.latchArray))
        {
            return new Set();
        }

        const pinned = getLatchKeepInstanceIds(this.latchSlots);
        const onBoard = new Set<string>();

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (
                card
                && pinned.has(card.instanceId)
                && isPlayerOwnedCard(card)
                && !card.exhausted
            )
            {
                onBoard.add(card.instanceId);
            }
        }

        return onBoard;
    }

    private reseedLatchFromBoard (): void
    {
        clearLatchSlots(this.latchSlots);

        if (!this.bodyMods.includes(BODY_MOD_IDS.latchArray))
        {
            return;
        }

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (card && isPlayerOwnedCard(card) && !card.exhausted)
            {
                this.trackLatchPlace(card);
            }
        }
    }

    private trackLatchPlace (card: CardInstance): void
    {
        if (!this.bodyMods.includes(BODY_MOD_IDS.latchArray))
        {
            return;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);
        noteLatchPlacement(this.latchSlots, definition.behaviorId, card.instanceId);
    }

    private trackLatchRemove (card: CardInstance): void
    {
        noteLatchRemoval(this.latchSlots, card.instanceId);
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
        const existing = this.board.getCardAt(slot);
        const placed = this.boardEdit.placeCardFromHand(handIndex, slot);

        if (placed)
        {
            if (existing)
            {
                this.trackLatchRemove(existing);
            }

            const card = this.board.getCardAt(slot);

            if (card)
            {
                this.trackLatchPlace(card);
            }
        }

        return placed;
    }

    removeCardFromBoard (slot: SlotPosition): boolean
    {
        const existing = this.board.getCardAt(slot);
        const removed = this.boardEdit.removeCardFromBoard(slot);

        if (removed && existing)
        {
            this.trackLatchRemove(existing);
        }

        return removed;
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
