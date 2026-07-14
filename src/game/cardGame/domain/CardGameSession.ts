import { BODY_MOD_IDS } from '../../run/bodyMods';
import { GRID_CONFIG } from '../../config/gridConfig';
import {
    GAME_RULES,
    getCardDefinitionOrThrow,
    isCardUnplayable,
    getCardHandEndPenalty,
    getCardDiscardFromHandCount,
    isCardExhaustOnPlay,
    type CardDefinition,
} from '../config/cardRegistry';
import {
    type LoadedCardGameEnemyDefinition,
    getCardGameEnemyDefinitionOrThrow,
} from '../config/enemyCatalog';
import { buildAttackSequence as buildRawAttackSequence, getUnchainedHazardSlots, planAttack } from '../combat/AttackPipeline';
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
import type {
    AttackReadiness,
    AttackSequence,
    CardInstance,
    DamageResult,
    EnemyState,
    EnemyTurnAction,
    PlayerState,
    PlayerDamageResult,
    SlotPosition,
    HandPenaltyResult,
} from '../domain/types';
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
    /** Definition ids removed from the run deck when this battle ends (single-use cards). */
    private readonly exhaustedDefinitionIds: string[] = [];
    private readonly enemyDefinition: LoadedCardGameEnemyDefinition;
    private enemy: EnemyState;
    private enrageStacks = 0;
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
    private queuedEnemyTurn: EnemyTurnAction | null = null;
    private rerollsRemaining: number;
    private readonly puzzleMode: PuzzleModeConfig | null;
    private puzzleFinished = false;
    private chainStart: SlotPosition = {
        row: GAME_RULES.activationStart.row,
        col: GAME_RULES.activationStartColumn,
    };

    constructor (
        enemyId: string = GAME_RULES.defaultEnemyId,
        startHealth?: number,
        deckDefinitionIds?: readonly string[],
        bodyMods: readonly string[] = [],
        puzzleMode: PuzzleModeConfig | null = null,
    )
    {
        this.puzzleMode = puzzleMode;
        this.enemyDefinition = getCardGameEnemyDefinitionOrThrow(enemyId);
        this.board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        this.enemy = {
            health: this.enemyDefinition.maxHealth,
            maxHealth: this.enemyDefinition.maxHealth,
            shield: 0,
            poison: 0,
        };
        const maxHealth = GAME_RULES.player.maxHealth
            + (bodyMods.includes(BODY_MOD_IDS.chromeHeart) ? 10 : 0);
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
        const bonusEnergy = bodyMods.includes(BODY_MOD_IDS.overclockCell) ? 1 : 0;
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

    /** Single-use cards played this battle — remove one copy each from the run deck on victory. */
    getExhaustedDefinitionIds (): readonly string[]
    {
        return [ ...this.exhaustedDefinitionIds ];
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

        if (bonus <= 0)
        {
            return { ...action, steps: action.steps.map((step) => ({ ...step })) };
        }

        return {
            ...action,
            steps: action.steps.map((step) => (
                step.kind === 'attack'
                    ? { ...step, amount: (step.amount ?? 0) + bonus }
                    : { ...step }
            )),
        };
    }

    /** The queued enemy turn scaled by the current round ramp (for telegraphing). */
    getScaledEnemyIntent (): EnemyTurnAction | null
    {
        return this.queuedEnemyTurn ? this.rampEnemyAction(this.queuedEnemyTurn) : null;
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
        const curseHand = getEnemyPassive(this.enemyDefinition.passives, 'curseHand');

        if (!curseHand)
        {
            return;
        }

        for (let i = 0; i < curseHand.count; i++)
        {
            this.addCardToHand(curseHand.cardId, true);
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

        this.deck.push(...this.discard.splice(0));
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
            this.discard.push(...this.hand.splice(0));
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

    getHand (): readonly CardInstance[]
    {
        return this.hand;
    }

    getEnemy (): EnemyState
    {
        return { ...this.enemy };
    }

    getEnemyDefinition (): LoadedCardGameEnemyDefinition
    {
        return this.enemyDefinition;
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
        const sequence = applyEnemyPassivesToSequence(
            buildRawAttackSequence(chain, this.board, stepMs),
            this.getEnemy(),
            this.enemyDefinition.passives,
        );

        return this.dampenField ? applyTileDampening(sequence, this.dampenField) : sequence;
    }

    /** Casts the Dead Zone field (from the dampenTiles ability) for the coming player turns. */
    activateDampenField (): DampenField | null
    {
        const dampen = getEnemyPassive(this.enemyDefinition.passives, 'dampenTiles');

        if (!dampen)
        {
            return null;
        }

        this.dampenField = {
            parity: dampen.parity,
            multiplier: dampen.multiplier,
            turnsRemaining: Math.max(1, dampen.duration),
        };

        return { parity: dampen.parity, multiplier: dampen.multiplier };
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
        return this.enemy.health <= 0;
    }

    isPlayerDefeated (): boolean
    {
        return this.player.health <= 0;
    }

    getQueuedEnemyTurn (): EnemyTurnAction | null
    {
        return this.queuedEnemyTurn ? { ...this.queuedEnemyTurn } : null;
    }

    queueNextEnemyTurn (): EnemyTurnAction
    {
        this.queuedEnemyTurn = planEnemyTurn({
            enemy: this.enemyDefinition,
            enemyState: this.getEnemy(),
            enrageStacks: this.enrageStacks,
            turnsTaken: this.enemyTurnsTaken,
        });

        return { ...this.queuedEnemyTurn };
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
        if (amount <= 0)
        {
            return;
        }

        this.player.shield += amount;
        this.armorGrantedThisAttack += amount;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.player.shield });
    }

    /** Applies attack damage to enemy shield first, then health. */
    dealAttackDamage (damage: number): DamageResult
    {
        if (damage <= 0)
        {
            return {
                enemy: this.getEnemy(),
                shieldAbsorbed: 0,
                healthDamage: 0,
            };
        }

        const shieldBefore = this.enemy.shield;
        const shieldAbsorbed = Math.min(this.enemy.shield, damage);
        const healthDamage = damage - shieldAbsorbed;

        this.enemy.shield -= shieldAbsorbed;
        this.enemy.health = Math.max(0, this.enemy.health - healthDamage);
        this.damageDealtThisAttack += damage;

        const thornsDamage = computeThornsReflectDamage(
            this.enemyDefinition.passives,
            damage,
        );

        if (thornsDamage > 0)
        {
            const reflect = this.resolveEnemyAttack(thornsDamage);

            return {
                enemy: this.getEnemy(),
                shieldAbsorbed,
                healthDamage,
                thornsDamage: reflect.healthDamage + reflect.shieldAbsorbed,
                thornsShieldAbsorbed: reflect.shieldAbsorbed,
                thornsHealthDamage: reflect.healthDamage,
            };
        }

        return {
            enemy: this.getEnemy(),
            shieldAbsorbed,
            healthDamage,
        };
    }

    completeAttack (sequence: AttackSequence): void
    {
        const remainingDamage = sequence.totalDamage - this.damageDealtThisAttack;

        if (remainingDamage > 0)
        {
            this.dealAttackDamage(remainingDamage);
        }

        const postAttack = resolvePostAttackPassives(
            this.board,
            sequence,
            this.enemyDefinition.passives,
        );

        this.enrageStacks = postAttack.enrageStacks;

        if (postAttack.jammerShield > 0)
        {
            this.resolveEnemyShield(postAttack.jammerShield);
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

        this.player.shield += remainingArmor;

        if (sequence.abilityPoisonStacks > 0)
        {
            this.enemy.poison = (this.enemy.poison ?? 0) + sequence.abilityPoisonStacks;
        }

        this.damageDealtThisAttack = 0;
        this.armorGrantedThisAttack = 0;

        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_COMPLETED, {
            sequence,
            enemy: this.getEnemy(),
        });
        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.player.shield });

        if (this.isEnemyDefeated())
        {
            CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_DEFEATED, { enemy: this.getEnemy() });
        }
    }

    /** Releases the attack lock so the player can edit the board between attacks in a round. */
    releaseAttackLock (): void
    {
        this.attackInProgress = false;
    }

    /** @deprecated Use releaseAttackLock — player round ends in Game.onEndTurn, not here. */
    finishPlayerTurn (): void
    {
        this.releaseAttackLock();
    }

    hasQueuedEnemyTurn (): boolean
    {
        return this.queuedEnemyTurn !== null;
    }

    beginEnemyTurn (): EnemyTurnAction | null
    {
        if (this.enemyTurnInProgress || this.isEnemyDefeated() || this.isPlayerDefeated() || !this.queuedEnemyTurn)
        {
            return null;
        }

        // Expire shield that was not fully used during the player's turn.
        this.enemy.shield = 0;

        // Bake the round's escalation ramp into the attack the enemy is about to make.
        const action = this.rampEnemyAction(this.queuedEnemyTurn);

        this.queuedEnemyTurn = null;
        this.enemyTurnInProgress = true;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_TURN_STARTED, { action });

        return action;
    }

    resolveEnemyAttack (damage: number): PlayerDamageResult
    {
        if (damage <= 0)
        {
            return {
                player: this.getPlayer(),
                shieldAbsorbed: 0,
                healthDamage: 0,
            };
        }

        const shieldAbsorbed = Math.min(this.player.shield, damage);
        const healthDamage = damage - shieldAbsorbed;

        this.player.shield -= shieldAbsorbed;
        this.player.health = Math.max(0, this.player.health - healthDamage);

        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.player.shield });

        return {
            player: this.getPlayer(),
            shieldAbsorbed,
            healthDamage,
        };
    }

    resolveEnemyShield (shield: number): EnemyState
    {
        this.enemy.shield += shield;

        return this.getEnemy();
    }

    getEnemyPoison (): number
    {
        return this.enemy.poison ?? 0;
    }

    /**
     * Applies one poison tick to the enemy (poison ignores shield) then decays the
     * stack count by 1. Called at the start of each enemy turn.
     */
    tickPoison (): DamageResult
    {
        const stacks = this.enemy.poison ?? 0;

        if (stacks <= 0)
        {
            return {
                enemy: this.getEnemy(),
                shieldAbsorbed: 0,
                healthDamage: 0,
            };
        }

        const healthDamage = Math.min(this.enemy.health, stacks);

        this.enemy.health = Math.max(0, this.enemy.health - stacks);
        this.enemy.poison = Math.max(0, stacks - 1);

        if (this.isEnemyDefeated())
        {
            CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_DEFEATED, { enemy: this.getEnemy() });
        }

        return {
            enemy: this.getEnemy(),
            shieldAbsorbed: 0,
            healthDamage,
        };
    }

    /** Places an enemy trap on a random empty board slot, avoiding tiles next to another trap when possible. */
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
                emptySlots.push({ ...slot });
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

        // Prefer spacing traps apart; fall back to any empty slot on a crowded board.
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
        placeSilenceTiles(this.board, this.silencedSlots, this.enemyDefinition.passives);
        this.enrageStacks = 0;
        this.enemyTurnInProgress = false;

        CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_TURN_COMPLETED, {
            action,
            enemy: this.getEnemy(),
            player: this.getPlayer(),
        });

        if (this.isPlayerDefeated())
        {
            CardGameEventBus.emit(CARD_GAME_EVENTS.PLAYER_DEFEATED, { player: this.getPlayer() });
            return;
        }

        // Count completed enemy turns — drives Escalate ramp and Dead Zone cadence.
        this.enemyTurnsTaken += 1;

        if (!this.isEnemyDefeated())
        {
            this.queueNextEnemyTurn();
        }

        if (!this.isPlayerDefeated() && !this.isEnemyDefeated())
        {
            this.renewHand();

            if (this.energy <= 0)
            {
                this.resetEnergy();
            }

            this.applyEnemyCurseHand();
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
