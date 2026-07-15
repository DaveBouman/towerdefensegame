import { BODY_MOD_IDS, isSeventhStrikeAttack } from '../../run/bodyMods';
import { getBattleEnergyBonus, getRunMaxHealth } from '../../run/runResources';
import { GRID_CONFIG, isTrapPlacementColumn } from '../../config/gridConfig';
import {
    GAME_RULES,
    getCardDefinitionOrThrow,
    isCardUnplayable,
    getCardHandEndPenalty,
    getCardDiscardFromHandCount,
    isCardExhaustOnPlay,
    getCardHealOnKill,
    type CardDefinition,
} from '../config/cardRegistry';
import {
    type LoadedCardGameEnemyDefinition,
} from '../config/enemyCatalog';
import { buildAttackSequence as buildRawAttackSequence, getUnchainedHazardSlots, planAttack } from '../combat/AttackPipeline';
import {
    aggregateBattleModifiers,
    applyPlayerBuffModifier,
    scaleIncomingDamage,
    type BattleModifier,
    type BattleModifierDuration,
    type BattleModifierStat,
} from '../combat/battleModifiers';
import {
    getEnemyAllyActions,
    mergeAllyStepsIntoTurn,
    planAllySupportSteps,
} from '../combat/enemyAllySupport';
import { collectBattleModifierApplications } from '../combat/chainBattleModifiers';
import { planEnemyTurn } from '../combat/enemyTurn';
import {
    applyEnemyPassivesToSequence,
    applyTileDampening,
    computeThornsReflectDamage,
    isDampenedTile,
    placeSilenceTiles,
    resolvePostAttackPassives,
    type DampenField,
} from '../enemyPassives/applyEnemyPassives';
import { getEnemyPassive } from '../enemyPassives/defaults';
import { slotKey } from '../domain/cardDirections';
import { buildDeckFromDefinitionIds, buildPlayerDeck, shuffleInPlace } from '../domain/buildPlayerDeck';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { isEnemyOwnedCard, isFieldOwnedCard, isPlayerOwnedCard } from '../domain/cardOwnership';
import { randomInBoundsDirectionForPool } from '../domain/cardDirections';
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
import { pickRandom } from '../../random/rng';
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
    private readonly hand: CardInstance[] = [];
    private readonly deck: CardInstance[] = [];
    private readonly discard: CardInstance[] = [];
    /** Definition ids exhausted (played) this battle — battle-scoped only. */
    private readonly exhaustedDefinitionIds: string[] = [];
    private readonly combatants: EnemyCombatant[] = [];
    private attackTargetId: string | null = null;
    private enemyTurnsTaken = 0;
    private dampenField: (DampenField & { turnsRemaining: number }) | null = null;
    private readonly silencedSlots = new Set<string>();
    private readonly bombDisabledSlots = new Set<string>();
    private player: PlayerState;
    private energy: number;
    private readonly maxEnergy: number;
    private attackInProgress = false;
    private enemyTurnInProgress = false;
    private damageDealtThisAttack = 0;
    private armorGrantedThisAttack = 0;
    private readonly battleModifiers: BattleModifier[] = [];
    private queuedEnemyTurn: EnemyTurnAction | null = null;
    private enemyPhaseQueue: EnemyTurnAction[] = [];
    private enemyPhasePrepared = false;
    private rerollsRemaining: number;
    private readonly puzzleMode: PuzzleModeConfig | null;
    private puzzleFinished = false;
    private readonly bodyMods: readonly string[];
    private runAttackCount: number;
    private doubleDamageThisAttack = false;
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
        this.runAttackCount = Math.max(0, Math.round(runAttackCount));

        for (const [ index, definitionId ] of normalizeEnemyIds(enemyIds).entries())
        {
            this.combatants.push(createEnemyCombatant(`enemy-${index}`, definitionId));
        }

        this.board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const maxHealth = getRunMaxHealth(bodyMods);
        this.player = {
            health: startHealth !== undefined
                ? Math.min(maxHealth, Math.max(1, Math.round(startHealth)))
                : maxHealth,
            maxHealth,
            shield: 0,
        };

        this.deck.push(
            ...(deckDefinitionIds && deckDefinitionIds.length > 0
                ? buildDeckFromDefinitionIds(deckDefinitionIds)
                : buildPlayerDeck()),
        );
        this.rerollsRemaining = puzzleMode ? 0 : GAME_RULES.fightRerollsPerFight;
        const bonusEnergy = getBattleEnergyBonus(bodyMods);
        this.maxEnergy = puzzleMode
            ? 1
            : Math.max(1, Math.round(GAME_RULES.energyPerTurn) + bonusEnergy);
        this.energy = this.maxEnergy;

        if (puzzleMode)
        {
            this.deck.length = 0;
            this.discard.length = 0;
            this.hand.length = 0;

            for (const spec of puzzleMode.handCards)
            {
                this.hand.push(createCardInstance(
                    spec.definitionId,
                    spec.arrow,
                    'player',
                    spec.loopArrow,
                ));
            }

            this.queuedEnemyTurn = null;
            CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });
            this.emitPilesChanged();
        }
        else
        {
            this.renewHand();
            this.queueNextEnemyTurn();
        }

        this.emitRerollsChanged();
    }

    getDeckSize (): number
    {
        return this.deck.length;
    }

    getDiscardSize (): number
    {
        return this.discard.length;
    }

    getPileCounts (): { deckSize: number; discardSize: number }
    {
        return {
            deckSize: this.deck.length,
            discardSize: this.discard.length,
        };
    }

    /** Draw-pile card definition ids (order intentionally not implied — callers should group/sort). */
    getDeckDefinitionIds (): string[]
    {
        return this.deck.map((card) => card.definitionId);
    }

    /** Discard-pile card definition ids. */
    getDiscardDefinitionIds (): string[]
    {
        return this.discard.map((card) => card.definitionId);
    }

    /** Next card that would be drawn (`deck.pop()`). */
    getDeckTopCard (): CardInstance | undefined
    {
        return this.deck.length > 0 ? this.deck[this.deck.length - 1] : undefined;
    }

    /** Most recently discarded card. */
    getDiscardTopCard (): CardInstance | undefined
    {
        return this.discard.length > 0 ? this.discard[this.discard.length - 1] : undefined;
    }

    /** Single-use cards played this battle (for tests and debugging). */
    getExhaustedDefinitionIds (): readonly string[]
    {
        return [ ...this.exhaustedDefinitionIds ];
    }

    /** Run-wide attack counter (increments each time the player starts an attack). */
    getRunAttackCount (): number
    {
        return this.runAttackCount;
    }

    /** Whether the current attack has Mark VII double damage active. */
    isDoubleDamageThisAttack (): boolean
    {
        return this.doubleDamageThisAttack;
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

    resolveAllyHeal (amount: number, targetInstanceId: string): EnemyState
    {
        const combatant = this.getCombatantOrThrow(targetInstanceId);
        const heal = Math.max(0, amount);

        combatant.state.health = Math.min(
            combatant.state.maxHealth,
            combatant.state.health + heal,
        );

        return { ...combatant.state };
    }

    resolveAllyShield (amount: number, targetInstanceId: string): EnemyState
    {
        return this.resolveEnemyShield(amount, targetInstanceId);
    }

    clearBattleModifiers (): void
    {
        this.battleModifiers.length = 0;
    }

    clearTransientBattleModifiers (): void
    {
        // All battle modifiers last the full energy round.
    }

    private getModifierTotals ()
    {
        return aggregateBattleModifiers(this.battleModifiers);
    }

    private scalePlayerDamageDealt (damage: number): number
    {
        let scaled = applyPlayerBuffModifier(damage, this.getModifierTotals().playerDamageDealt);

        if (this.doubleDamageThisAttack)
        {
            scaled *= 2;
        }

        return scaled;
    }

    private scalePlayerArmorGain (armor: number): number
    {
        return applyPlayerBuffModifier(armor, this.getModifierTotals().playerArmor);
    }

    /** Enemy turn telegraph with ramp + active battle modifiers baked in. */
    getTelegraphedEnemyTurn (instanceId: string): EnemyTurnAction | null
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant?.queuedTurn)
        {
            return null;
        }

        return this.rampEnemyAction(combatant.queuedTurn);
    }

    getScaledArmorGain (armor: number): number
    {
        return this.scalePlayerArmorGain(armor);
    }

    private scaleEnemyAttackDamage (damage: number): number
    {
        const totals = this.getModifierTotals();

        return scaleIncomingDamage(damage, totals.enemyAttack, totals.playerDamageTaken);
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
        const missing = GAME_RULES.handSize - this.hand.length;

        if (missing <= 0)
        {
            return;
        }

        this.hand.push(...this.drawCards(missing));

        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });
        this.emitPilesChanged();
    }

    /** Adds a card to the hand (used by curse passives and future events). */
    addCardToHand (definitionId: string, ignoreHandLimit = false): boolean
    {
        if (!ignoreHandLimit && this.hand.length >= GAME_RULES.handSize)
        {
            return false;
        }

        this.hand.push(createCardInstance(definitionId));
        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });

        return true;
    }

    /**
     * Damages the player for each hand card with a hand-end penalty still held
     * when the turn ends. Returns the breakdown without discarding the cards.
     */
    resolveHandEndPenalties (): HandPenaltyResult
    {
        const penalizedCards: { definitionId: string; damage: number }[] = [];
        let totalDamage = 0;

        for (const card of this.hand)
        {
            const definition = getCardDefinitionOrThrow(card.definitionId);
            const damage = getCardHandEndPenalty(definition);

            if (damage <= 0)
            {
                continue;
            }

            penalizedCards.push({ definitionId: card.definitionId, damage });
            totalDamage += damage;
        }

        if (totalDamage > 0)
        {
            this.resolveEnemyAttack(totalDamage);
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

    private emitPilesChanged (): void
    {
        CardGameEventBus.emit(CARD_GAME_EVENTS.PILES_CHANGED, this.getPileCounts());
    }

    private emitRerollsChanged (): void
    {
        CardGameEventBus.emit(CARD_GAME_EVENTS.REROLLS_CHANGED, {
            rerollsRemaining: this.rerollsRemaining,
            maxRerollsPerFight: GAME_RULES.fightRerollsPerFight,
        });
    }

    getRerollsRemaining (): number
    {
        return this.rerollsRemaining;
    }

    canReroll (): boolean
    {
        return this.canEditBoard() && this.rerollsRemaining > 0;
    }

    /** Discards selected hand cards and draws replacements. Uses one fight reroll. */
    rerollHandCards (handIndices: number[]): boolean
    {
        if (!this.canReroll() || handIndices.length === 0)
        {
            return false;
        }

        const uniqueIndices = [ ...new Set(handIndices) ].sort((a, b) => a - b);

        for (const index of uniqueIndices)
        {
            if (index < 0 || index >= this.hand.length)
            {
                return false;
            }
        }

        const toDiscard = uniqueIndices.map((index) => this.hand[index]!);

        this.discard.push(...toDiscard);

        const drawn = this.drawCards(toDiscard.length);

        if (drawn.length < toDiscard.length)
        {
            return false;
        }

        uniqueIndices.forEach((handIndex, i) =>
        {
            this.hand[handIndex] = drawn[i]!;
        });

        this.rerollsRemaining -= 1;

        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });
        this.emitPilesChanged();
        this.emitRerollsChanged();

        return true;
    }

    private reshuffleDiscardIntoDeck (): void
    {
        if (this.discard.length === 0)
        {
            return;
        }

        const recyclable = this.discard.splice(0).filter((card) => !card.exhausted);

        if (recyclable.length === 0)
        {
            return;
        }

        this.deck.push(...recyclable);
        shuffleInPlace(this.deck);
    }

    private drawCards (count: number): CardInstance[]
    {
        const drawn: CardInstance[] = [];

        for (let i = 0; i < count; i++)
        {
            if (this.deck.length === 0)
            {
                this.reshuffleDiscardIntoDeck();
            }

            const card = this.deck.pop();

            if (!card)
            {
                break;
            }

            drawn.push(card);
        }

        return drawn;
    }

    /** Discards the current hand and draws a fresh one for the next player turn. */
    renewHand (): void
    {
        this.player.shield = 0;

        if (this.hand.length > 0)
        {
            const leavingHand = this.hand.splice(0);
            const recyclable = leavingHand.filter((card) => !card.exhausted);

            if (recyclable.length > 0)
            {
                this.discard.push(...recyclable);
            }
        }

        this.hand.push(...this.drawCards(GAME_RULES.handSize));

        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });
        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.player.shield });
        this.emitPilesChanged();
    }

    getChainStartSlot (): SlotPosition
    {
        return { ...this.chainStart };
    }

    setChainStartSlot (slot: SlotPosition): boolean
    {
        if (this.attackInProgress || this.enemyTurnInProgress)
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
        return this.hand;
    }

    getSilencedSlots (): SlotPosition[]
    {
        return this.board.slotsInOrder().filter((slot) => this.silencedSlots.has(slotKey(slot)));
    }

    getBombDisabledSlots (): SlotPosition[]
    {
        return this.board.slotsInOrder().filter((slot) => this.bombDisabledSlots.has(slotKey(slot)));
    }

    isSlotSilenced (slot: SlotPosition): boolean
    {
        return this.silencedSlots.has(slotKey(slot));
    }

    isSlotBombDisabled (slot: SlotPosition): boolean
    {
        return this.bombDisabledSlots.has(slotKey(slot));
    }

    isSlotBlockedForPlayer (slot: SlotPosition): boolean
    {
        return this.isSlotSilenced(slot) || this.isSlotBombDisabled(slot);
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

        return this.dampenField ? applyTileDampening(sequence, this.dampenField) : sequence;
    }

    /** Casts the Dead Zone field (from the dampenTiles ability) for the coming player turns. */
    activateDampenField (): DampenField | null
    {
        for (const combatant of this.getLivingCombatants())
        {
            const dampen = getEnemyPassive(combatant.definition.passives, 'dampenTiles');

            if (!dampen)
            {
                continue;
            }

            this.dampenField = {
                parity: dampen.parity,
                multiplier: dampen.multiplier,
                turnsRemaining: Math.max(1, dampen.duration),
            };

            return { parity: dampen.parity, multiplier: dampen.multiplier };
        }

        return null;
    }

    getDampenField (): DampenField | null
    {
        return this.dampenField
            ? { parity: this.dampenField.parity, multiplier: this.dampenField.multiplier }
            : null;
    }

    /** Ages the Dead Zone field by one player turn, expiring it when it runs out. */
    tickDampenField (): void
    {
        if (!this.dampenField)
        {
            return;
        }

        this.dampenField.turnsRemaining -= 1;

        if (this.dampenField.turnsRemaining <= 0)
        {
            this.dampenField = null;
        }
    }

    /** Tiles currently weakened by the Dead Zone field (empty when inactive). */
    getDampenedSlots (): SlotPosition[]
    {
        if (!this.dampenField)
        {
            return [];
        }

        const slots: SlotPosition[] = [];

        for (const slot of this.board.slotsInOrder())
        {
            if (isDampenedTile(slot, this.dampenField.parity))
            {
                slots.push({ ...slot });
            }
        }

        return slots;
    }

    getPlayer (): PlayerState
    {
        return { ...this.player };
    }

    isAttackInProgress (): boolean
    {
        return this.attackInProgress;
    }

    isEnemyTurnInProgress (): boolean
    {
        return this.enemyTurnInProgress;
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
        if (instanceId)
        {
            const combatant = this.getCombatant(instanceId);

            return combatant?.queuedTurn ? { ...combatant.queuedTurn } : null;
        }

        const living = this.getLivingCombatants()[0];

        return living?.queuedTurn ? { ...living.queuedTurn } : null;
    }

    getQueuedEnemyTurns (): EnemyTurnAction[]
    {
        return this.getLivingCombatants()
            .filter((combatant) => combatant.queuedTurn !== null)
            .map((combatant) => ({ ...combatant.queuedTurn! }));
    }

    queueNextEnemyTurn (): EnemyTurnAction
    {
        for (const combatant of this.combatants)
        {
            if (!isCombatantAlive(combatant))
            {
                combatant.queuedTurn = null;
                continue;
            }

            const baseTurn = planEnemyTurn({
                enemy: combatant.definition,
                enemyState: combatant.state,
                enrageStacks: combatant.enrageStacks,
                turnsTaken: combatant.turnsTaken,
            });
            const allySteps = planAllySupportSteps(
                combatant,
                this.getLivingCombatants(),
                getEnemyAllyActions(combatant.definition),
            );

            combatant.queuedTurn = {
                ...baseTurn,
                steps: mergeAllyStepsIntoTurn(baseTurn.steps, allySteps),
                instanceId: combatant.instanceId,
                enemyId: combatant.definitionId,
            };
        }

        this.queuedEnemyTurn = this.getQueuedEnemyTurn();

        return this.queuedEnemyTurn ? { ...this.queuedEnemyTurn } : {
            enemyId: this.combatants[0]?.definitionId ?? GAME_RULES.defaultEnemyId,
            steps: [],
        };
    }

    getAttackReadiness (): AttackReadiness
    {
        if (this.attackInProgress)
        {
            return { canAttack: false, reason: 'attack-in-progress' };
        }

        if (this.enemyTurnInProgress)
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
        if (this.attackInProgress || this.enemyTurnInProgress || this.isEnemyDefeated() || this.isPlayerDefeated())
        {
            return null;
        }

        const chain = planAttack(this.board, this.chainStart).chain;

        if (chain.length === 0)
        {
            return null;
        }

        this.attackInProgress = true;
        this.damageDealtThisAttack = 0;
        this.armorGrantedThisAttack = 0;
        this.doubleDamageThisAttack = false;

        if (!this.puzzleMode)
        {
            this.runAttackCount += 1;

            if (this.bodyMods.includes(BODY_MOD_IDS.markSeven)
                && isSeventhStrikeAttack(this.runAttackCount))
            {
                this.doubleDamageThisAttack = true;
            }
        }

        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_STARTED, { chainStart: { ...this.chainStart } });

        return { ...this.chainStart };
    }

    emitAttackStep (stepIndex: number, sequence: AttackSequence): void
    {
        const step = sequence.steps[stepIndex];

        if (!step)
        {
            return;
        }

        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_STEP, { step, stepIndex, sequence });
    }

    /** Grants player shield during an attack (called as each defend step finishes). */
    grantPlayerShield (amount: number): void
    {
        const scaled = this.scalePlayerArmorGain(amount);

        if (scaled <= 0)
        {
            return;
        }

        this.player.shield += scaled;
        this.armorGrantedThisAttack += amount;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.player.shield });
    }

    healPlayer (amount: number): void
    {
        if (amount <= 0)
        {
            return;
        }

        this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
        CardGameEventBus.emit(CARD_GAME_EVENTS.PLAYER_HEALED, { player: this.getPlayer(), amount });
    }

    /** Applies attack damage to a specific enemy's shield first, then health. */
    dealAttackDamage (
        damage: number,
        targetInstanceId?: string,
        sourceDefinitionId?: string,
    ): DamageResult
    {
        const targetId = this.resolveAttackTargetId(targetInstanceId);
        const combatant = this.getCombatantOrThrow(targetId);
        const scaledDamage = this.scalePlayerDamageDealt(damage);

        if (scaledDamage <= 0)
        {
            return {
                enemy: { ...combatant.state },
                shieldAbsorbed: 0,
                healthDamage: 0,
                targetInstanceId: targetId,
            };
        }

        const wasAlive = isCombatantAlive(combatant);
        const shieldAbsorbed = Math.min(combatant.state.shield, scaledDamage);
        const healthDamage = scaledDamage - shieldAbsorbed;

        combatant.state.shield -= shieldAbsorbed;
        combatant.state.health = Math.max(0, combatant.state.health - healthDamage);
        this.damageDealtThisAttack += scaledDamage;

        const enemyKilled = wasAlive && combatant.state.health <= 0;
        let healOnKill = 0;

        if (enemyKilled)
        {
            if (this.attackTargetId === targetId)
            {
                this.attackTargetId = null;
            }

            CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_DEFEATED, {
                enemy: { ...combatant.state },
                instanceId: targetId,
            });

            if (sourceDefinitionId)
            {
                const sourceDefinition = getCardDefinitionOrThrow(sourceDefinitionId);
                healOnKill = getCardHealOnKill(sourceDefinition);

                if (healOnKill > 0)
                {
                    this.healPlayer(healOnKill);
                }
            }
        }

        const thornsDamage = computeThornsReflectDamage(
            combatant.definition.passives,
            scaledDamage,
        );

        if (thornsDamage > 0)
        {
            const reflect = this.resolveEnemyAttack(thornsDamage);

            return {
                enemy: { ...combatant.state },
                shieldAbsorbed,
                healthDamage,
                targetInstanceId: targetId,
                enemyKilled,
                healOnKill: healOnKill > 0 ? healOnKill : undefined,
                thornsDamage: reflect.healthDamage + reflect.shieldAbsorbed,
                thornsShieldAbsorbed: reflect.shieldAbsorbed,
                thornsHealthDamage: reflect.healthDamage,
            };
        }

        return {
            enemy: { ...combatant.state },
            shieldAbsorbed,
            healthDamage,
            targetInstanceId: targetId,
            enemyKilled,
            healOnKill: healOnKill > 0 ? healOnKill : undefined,
        };
    }

    completeAttack (sequence: AttackSequence): void
    {
        const remainingDamage = sequence.totalDamage - this.damageDealtThisAttack;

        if (remainingDamage > 0)
        {
            this.dealAttackDamage(remainingDamage);
        }

        const target = this.getTargetCombatant();
        const postAttack = resolvePostAttackPassives(
            this.board,
            sequence,
            target.definition.passives,
        );

        target.enrageStacks = postAttack.enrageStacks;

        if (postAttack.jammerShield > 0)
        {
            this.resolveEnemyShield(postAttack.jammerShield, target.instanceId);
        }

        if (postAttack.loopHunterDamage > 0)
        {
            this.resolveEnemyAttack(postAttack.loopHunterDamage);
        }

        this.bombDisabledSlots.clear();
        for (const slot of getUnchainedHazardSlots(this.board, sequence.chain))
        {
            this.bombDisabledSlots.add(slotKey(slot));
        }

        const totalArmor = sequence.chain.reduce((sum, step) => sum + step.armor, 0)
            + sequence.offChainArmor
            + sequence.abilityArmorGain;
        const remainingArmor = Math.max(0, totalArmor - this.armorGrantedThisAttack);

        this.player.shield += this.scalePlayerArmorGain(remainingArmor);

        if (sequence.abilityPoisonStacks > 0)
        {
            target.state.poison = (target.state.poison ?? 0) + sequence.abilityPoisonStacks;
        }

        this.damageDealtThisAttack = 0;
        this.armorGrantedThisAttack = 0;

        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_COMPLETED, {
            sequence,
            enemy: this.getEnemy(target.instanceId),
        });
        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.player.shield });
    }

    /** Releases the attack lock so the player can edit the board between attacks in a round. */
    releaseAttackLock (): void
    {
        this.attackInProgress = false;
        this.doubleDamageThisAttack = false;
    }

    hasQueuedEnemyTurn (): boolean
    {
        return this.getLivingCombatants().some((combatant) => combatant.queuedTurn !== null);
    }

    /** True while more combatants remain in the current prepared enemy phase. */
    hasMoreEnemyTurnsInPhase (): boolean
    {
        return this.enemyPhaseQueue.length > 0;
    }

    prepareEnemyPhase (): EnemyTurnAction[]
    {
        if (this.isEnemyDefeated() || this.isPlayerDefeated())
        {
            return [];
        }

        if (!this.hasQueuedEnemyTurn())
        {
            this.queueNextEnemyTurn();
        }

        this.enemyPhaseQueue = this.getLivingCombatants()
            .filter((combatant) => combatant.queuedTurn !== null)
            .map((combatant) => this.rampEnemyAction(combatant.queuedTurn!));

        this.enemyPhasePrepared = this.enemyPhaseQueue.length > 0;

        return [ ...this.enemyPhaseQueue ];
    }

    beginEnemyTurn (): EnemyTurnAction | null
    {
        if (this.enemyTurnInProgress || this.isEnemyDefeated() || this.isPlayerDefeated())
        {
            return null;
        }

        if (this.enemyPhaseQueue.length === 0)
        {
            if (this.enemyPhasePrepared)
            {
                return null;
            }

            const prepared = this.prepareEnemyPhase();

            if (prepared.length === 0)
            {
                return null;
            }
        }

        const next = this.enemyPhaseQueue.shift();

        if (!next)
        {
            return null;
        }

        const combatant = next.instanceId
            ? this.getCombatant(next.instanceId)
            : this.getLivingCombatants()[0];

        if (!combatant)
        {
            return null;
        }

        combatant.state.shield = 0;
        combatant.queuedTurn = null;
        this.queuedEnemyTurn = next;
        this.enemyTurnInProgress = true;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_TURN_STARTED, { action: next });

        return next;
    }

    completeSingleEnemyTurn (action: EnemyTurnAction): void
    {
        const combatant = action.instanceId
            ? this.getCombatant(action.instanceId)
            : this.getLivingCombatants()[0];

        if (combatant)
        {
            combatant.turnsTaken += 1;
            combatant.enrageStacks = 0;
        }

        this.queuedEnemyTurn = null;
        this.enemyTurnInProgress = false;
    }

    /** Enemy-side cleanup after all combatants in the current phase have acted. */
    completeEnemyPhase (): void
    {
        this.enemyPhaseQueue.length = 0;
        this.enemyPhasePrepared = false;
        this.enemyTurnInProgress = false;

        const allPassives = this.getLivingCombatants().flatMap((entry) => entry.definition.passives);

        placeSilenceTiles(this.board, this.silencedSlots, allPassives);

        CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_TURN_COMPLETED, {
            action: { enemyId: GAME_RULES.defaultEnemyId, steps: [] },
            enemy: this.getEnemy(),
            player: this.getPlayer(),
        });

        if (this.isPlayerDefeated())
        {
            CardGameEventBus.emit(CARD_GAME_EVENTS.PLAYER_DEFEATED, { player: this.getPlayer() });
            return;
        }

        this.enemyTurnsTaken += 1;

        if (!this.isEnemyDefeated())
        {
            this.queueNextEnemyTurn();
        }
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
        const scaledDamage = this.scaleEnemyAttackDamage(damage);

        if (scaledDamage <= 0)
        {
            return {
                player: this.getPlayer(),
                shieldAbsorbed: 0,
                healthDamage: 0,
            };
        }

        const shieldAbsorbed = Math.min(this.player.shield, scaledDamage);
        const healthDamage = scaledDamage - shieldAbsorbed;

        this.player.shield -= shieldAbsorbed;
        this.player.health = Math.max(0, this.player.health - healthDamage);

        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.player.shield });

        return {
            player: this.getPlayer(),
            shieldAbsorbed,
            healthDamage,
        };
    }

    resolveEnemyShield (shield: number, instanceId?: string): EnemyState
    {
        const combatant = instanceId
            ? this.getCombatantOrThrow(instanceId)
            : this.getTargetCombatant();

        combatant.state.shield += shield;

        return { ...combatant.state };
    }

    getEnemyPoison (instanceId?: string): number
    {
        const combatant = instanceId
            ? this.getCombatant(instanceId)
            : this.getTargetCombatant();

        return combatant?.state.poison ?? 0;
    }

    /**
     * Applies one poison tick to an enemy (poison ignores shield) then decays the
     * stack count by 1. Called at the start of each enemy turn.
     */
    tickPoison (instanceId?: string): DamageResult
    {
        const combatant = instanceId
            ? this.getCombatantOrThrow(instanceId)
            : this.getTargetCombatant();
        const stacks = combatant.state.poison ?? 0;

        if (stacks <= 0)
        {
            return {
                enemy: { ...combatant.state },
                shieldAbsorbed: 0,
                healthDamage: 0,
                targetInstanceId: combatant.instanceId,
            };
        }

        const wasAlive = isCombatantAlive(combatant);
        const healthDamage = Math.min(combatant.state.health, stacks);

        combatant.state.health = Math.max(0, combatant.state.health - stacks);
        combatant.state.poison = Math.max(0, stacks - 1);

        const enemyKilled = wasAlive && combatant.state.health <= 0;

        if (enemyKilled)
        {
            if (this.attackTargetId === combatant.instanceId)
            {
                this.attackTargetId = null;
            }

            CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_DEFEATED, {
                enemy: { ...combatant.state },
                instanceId: combatant.instanceId,
            });
        }

        return {
            enemy: { ...combatant.state },
            shieldAbsorbed: 0,
            healthDamage,
            targetInstanceId: combatant.instanceId,
            enemyKilled,
        };
    }

    /** Places an enemy trap on a random empty slot in the last three columns, avoiding tiles next to another trap when possible. */
    placeEnemyHazard (): SlotPosition | null
    {
        const hazardId = GAME_RULES.hazard.definitionId;
        const emptySlots: SlotPosition[] = [];
        const hazardSlots: SlotPosition[] = [];

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (card === null)
            {
                if (isTrapPlacementColumn(slot.col))
                {
                    emptySlots.push({ ...slot });
                }
            }
            else if (card.definitionId === hazardId)
            {
                hazardSlots.push({ ...slot });
            }
        }

        if (emptySlots.length === 0)
        {
            return null;
        }

        const isAdjacentToHazard = (candidate: SlotPosition): boolean =>
            hazardSlots.some((hazard) =>
                Math.abs(hazard.row - candidate.row) <= 1
                && Math.abs(hazard.col - candidate.col) <= 1);

        // Prefer spacing traps apart; fall back to any eligible empty slot on a crowded board.
        const spacedSlots = emptySlots.filter((candidate) => !isAdjacentToHazard(candidate));
        const candidates = spacedSlots.length > 0 ? spacedSlots : emptySlots;

        const slot = pickRandom(candidates);
        const hazardDefinition = getCardDefinitionOrThrow(GAME_RULES.hazard.definitionId);
        const hazardArrow = randomInBoundsDirectionForPool(
            slot,
            GRID_CONFIG.rows,
            GRID_CONFIG.cols,
            hazardDefinition.arrowPool,
        );
        const card = createCardInstance(GAME_RULES.hazard.definitionId, hazardArrow, 'enemy');

        this.board.placeCard(slot, card);

        return slot;
    }

    /** Places a field boost on a random empty board slot (any row/column). */
    placeFieldBoost (): SlotPosition | null
    {
        const emptySlots: SlotPosition[] = [];

        for (const slot of this.board.slotsInOrder())
        {
            if (this.board.isEmpty(slot))
            {
                emptySlots.push({ ...slot });
            }
        }

        if (emptySlots.length === 0)
        {
            return null;
        }

        const slot = pickRandom(emptySlots);
        const boostDefinition = getCardDefinitionOrThrow(GAME_RULES.fieldBoost.definitionId);
        const boostArrow = randomInBoundsDirectionForPool(
            slot,
            GRID_CONFIG.rows,
            GRID_CONFIG.cols,
            boostDefinition.arrowPool,
        );
        const card = createCardInstance(GAME_RULES.fieldBoost.definitionId, boostArrow, 'field');

        this.board.placeCard(slot, card);

        return slot;
    }

    /** Trap explosions hit the player after the chain resolves. */
    resolveHazardDamage (damage: number): PlayerDamageResult
    {
        return this.resolveEnemyAttack(damage);
    }

    completeEnemyTurn (action: EnemyTurnAction): void
    {
        this.completeSingleEnemyTurn(action);

        if (this.enemyPhaseQueue.length > 0)
        {
            return;
        }

        this.completeEnemyPhase();

        if (this.energy > 0)
        {
            this.refreshPlayerAfterMidRoundEnemy();
        }
    }

    /** Clears player cards from the board at end of player round (before the enemy acts). */
    clearBoard (): void
    {
        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (card && isPlayerOwnedCard(card))
            {
                if (!card.exhausted)
                {
                    this.discard.push(card);
                }
            }
        }

        this.board.clear();
        this.emitPilesChanged();
    }

    cancelAttack (): void
    {
        this.damageDealtThisAttack = 0;
        this.armorGrantedThisAttack = 0;
        this.attackInProgress = false;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_CANCELLED);
    }

    cancelEnemyTurn (): void
    {
        this.enemyTurnInProgress = false;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_TURN_CANCELLED);
    }

    placeCardFromHand (handIndex: number, slot: SlotPosition): boolean
    {
        if (this.attackInProgress || this.enemyTurnInProgress)
        {
            return false;
        }

        const card = this.hand[handIndex];

        if (!card)
        {
            return false;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);

        if (isCardUnplayable(definition))
        {
            return false;
        }

        if (card.exhausted)
        {
            return false;
        }

        const existing = this.board.getCardAt(slot);

        if (existing && (isEnemyOwnedCard(existing) || isFieldOwnedCard(existing)))
        {
            return false;
        }

        if (!existing)
        {
            if (this.isSlotBlockedForPlayer(slot))
            {
                return false;
            }

            if (!this.board.placeCard(slot, card))
            {
                return false;
            }

            this.hand.splice(handIndex, 1);
            this.markExhaustedIfNeeded(card, definition);
            CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card });
            CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });
            this.discardFromHandOnPlay(getCardDiscardFromHandCount(definition));

            return true;
        }

        this.board.removeCard(slot);
        this.board.placeCard(slot, card);
        this.hand[handIndex] = existing;
        this.markExhaustedIfNeeded(card, definition);
        CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card });
        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });
        this.discardFromHandOnPlay(getCardDiscardFromHandCount(definition));

        return true;
    }

    /** Discards up to `count` cards from the left of hand into the graveyard. */
    private discardFromHandOnPlay (count: number): void
    {
        if (count <= 0)
        {
            return;
        }

        const discarded = this.hand.splice(0, Math.min(count, this.hand.length));

        if (discarded.length === 0)
        {
            return;
        }

        this.discard.push(...discarded);
        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });
        this.emitPilesChanged();
    }

    private markExhaustedIfNeeded (card: CardInstance, definition: CardDefinition): void
    {
        if (!isCardExhaustOnPlay(definition))
        {
            return;
        }

        card.exhausted = true;
        this.exhaustedDefinitionIds.push(definition.id);
    }

    removeCardFromBoard (slot: SlotPosition): boolean
    {
        if (this.attackInProgress || this.enemyTurnInProgress)
        {
            return false;
        }

        const card = this.board.removeCard(slot);

        if (!card || isEnemyOwnedCard(card) || isFieldOwnedCard(card))
        {
            if (card)
            {
                this.board.placeCard(slot, card);
            }

            return false;
        }

        this.hand.push(card);
        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });

        return true;
    }

    moveCardOnBoard (from: SlotPosition, to: SlotPosition): boolean
    {
        if (this.attackInProgress || this.enemyTurnInProgress)
        {
            return false;
        }

        const card = this.board.getCardAt(from);

        if (!card || isEnemyOwnedCard(card) || isFieldOwnedCard(card))
        {
            return false;
        }

        const target = this.board.getCardAt(to);

        if (target && (isEnemyOwnedCard(target) || isFieldOwnedCard(target)))
        {
            return false;
        }

        if (!target && this.isSlotBlockedForPlayer(to))
        {
            return false;
        }

        if (!this.board.moveCard(from, to))
        {
            return false;
        }

        return true;
    }

    swapCardsOnBoard (a: SlotPosition, b: SlotPosition): boolean
    {
        if (this.attackInProgress || this.enemyTurnInProgress)
        {
            return false;
        }

        const cardA = this.board.getCardAt(a);
        const cardB = this.board.getCardAt(b);

        if (!cardA || isEnemyOwnedCard(cardA) || isFieldOwnedCard(cardA)
            || (cardB && (isEnemyOwnedCard(cardB) || isFieldOwnedCard(cardB))))
        {
            return false;
        }

        return this.board.swapCards(a, b);
    }

    canEditBoard (): boolean
    {
        if (this.puzzleFinished)
        {
            return false;
        }

        return !this.attackInProgress && !this.enemyTurnInProgress;
    }
}
