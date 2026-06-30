import { GRID_CONFIG } from '../../config/gridConfig';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import {
    type LoadedCardGameEnemyDefinition,
    getCardGameEnemyDefinitionOrThrow,
} from '../config/enemyCatalog';
import { buildAttackSequence as buildRawAttackSequence, getUnchainedHazardSlots, planAttack } from '../combat/AttackPipeline';
import { planEnemyTurn } from '../combat/enemyTurn';
import {
    applyEnemyPassivesToSequence,
    computeThornsReflectDamage,
    placeSilenceTiles,
    resolvePostAttackPassives,
} from '../enemyPassives/applyEnemyPassives';
import { slotKey } from '../domain/cardDirections';
import { buildPlayerDeck, shuffleInPlace } from '../domain/buildPlayerDeck';
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
} from '../domain/types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';

export class CardGameSession
{
    readonly board: BoardModel;
    private readonly hand: CardInstance[] = [];
    private readonly deck: CardInstance[] = [];
    private readonly discard: CardInstance[] = [];
    private readonly enemyDefinition: LoadedCardGameEnemyDefinition;
    private enemy: EnemyState;
    private enrageStacks = 0;
    private readonly silencedSlots = new Set<string>();
    private readonly bombDisabledSlots = new Set<string>();
    private player: PlayerState;
    private attackInProgress = false;
    private enemyTurnInProgress = false;
    private damageDealtThisAttack = 0;
    private queuedEnemyTurn: EnemyTurnAction | null = null;
    private rerollsRemaining: number;
    private chainStart: SlotPosition = {
        row: GAME_RULES.activationStart.row,
        col: GAME_RULES.activationStartColumn,
    };

    constructor (enemyId: string = GAME_RULES.defaultEnemyId)
    {
        this.enemyDefinition = getCardGameEnemyDefinitionOrThrow(enemyId);
        this.board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        this.enemy = {
            health: this.enemyDefinition.maxHealth,
            maxHealth: this.enemyDefinition.maxHealth,
            shield: 0,
        };
        this.player = {
            health: GAME_RULES.player.maxHealth,
            maxHealth: GAME_RULES.player.maxHealth,
            shield: 0,
        };

        this.deck.push(...buildPlayerDeck());
        this.rerollsRemaining = GAME_RULES.fightRerollsPerFight;
        this.renewHand();
        this.queueNextEnemyTurn();
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
        const sequence = buildRawAttackSequence(chain, this.board, stepMs);

        return applyEnemyPassivesToSequence(
            sequence,
            this.getEnemy(),
            this.enemyDefinition.passives,
        );
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
            shieldBefore,
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

        const chainArmor = sequence.chain.reduce((sum, step) => sum + step.armor, 0);

        this.player.shield += chainArmor + sequence.offChainArmor + sequence.abilityArmorGain;
        this.damageDealtThisAttack = 0;

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

    /** Clears the attack lock after board cleanup and enemy turn resolve. */
    finishPlayerTurn (): void
    {
        this.attackInProgress = false;
    }

    beginEnemyTurn (): EnemyTurnAction | null
    {
        if (this.enemyTurnInProgress || this.isEnemyDefeated() || this.isPlayerDefeated() || !this.queuedEnemyTurn)
        {
            return null;
        }

        // Expire shield that was not fully used during the player's turn.
        this.enemy.shield = 0;

        const action = { ...this.queuedEnemyTurn };

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

    /** Places an enemy trap on a random empty board slot. */
    placeEnemyHazard (): SlotPosition | null
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

        const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)]!;
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

    /** Places a field boost on a random empty board slot for the next player round. */
    placeFieldBoost (): SlotPosition | null
    {
        const emptySlots: SlotPosition[] = [];

        for (const slot of this.board.slotsInOrder())
        {
            if (this.board.isEmpty(slot) && !this.isSlotBlockedForPlayer(slot))
            {
                emptySlots.push({ ...slot });
            }
        }

        if (emptySlots.length === 0)
        {
            return null;
        }

        const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)]!;
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

        if (!this.isEnemyDefeated())
        {
            this.queueNextEnemyTurn();
        }

        if (!this.isPlayerDefeated() && !this.isEnemyDefeated())
        {
            this.renewHand();
        }
    }

    /** Clears all cards from the board after a chain resolves. */
    clearBoard (): void
    {
        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (card && isPlayerOwnedCard(card))
            {
                this.discard.push(card);
            }
        }

        this.board.clear();
        this.emitPilesChanged();
    }

    cancelAttack (): void
    {
        this.damageDealtThisAttack = 0;
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
            CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card });
            CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });

            return true;
        }

        this.board.removeCard(slot);
        this.board.placeCard(slot, card);
        this.hand[handIndex] = existing;
        CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card });
        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });

        return true;
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
        return !this.attackInProgress && !this.enemyTurnInProgress;
    }
}
