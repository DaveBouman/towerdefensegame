import { GRID_CONFIG } from '../../config/gridConfig';
import { GAME_RULES } from '../config/cardRegistry';
import { planAttack } from '../combat/AttackPipeline';
import { planEnemyTurn } from '../combat/enemyTurn';
import { buildPlayerDeck, shuffleInPlace } from '../domain/buildPlayerDeck';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
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
    private enemy: EnemyState;
    private player: PlayerState;
    private attackInProgress = false;
    private enemyTurnInProgress = false;
    private damageDealtThisAttack = 0;
    private queuedEnemyTurn: EnemyTurnAction | null = null;
    private chainStart: SlotPosition = {
        row: GAME_RULES.activationStart.row,
        col: GAME_RULES.activationStartColumn,
    };

    constructor ()
    {
        this.board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        this.enemy = {
            health: GAME_RULES.enemy.maxHealth,
            maxHealth: GAME_RULES.enemy.maxHealth,
            shield: 0,
        };
        this.player = {
            health: GAME_RULES.player.maxHealth,
            maxHealth: GAME_RULES.player.maxHealth,
            shield: 0,
        };

        this.deck.push(...buildPlayerDeck());
        this.renewHand();
        this.queueNextEnemyTurn();
    }

    getDeckSize (): number
    {
        return this.deck.length;
    }

    getDiscardSize (): number
    {
        return this.discard.length;
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

    private drawCard (): CardInstance | null
    {
        if (this.deck.length === 0)
        {
            this.reshuffleDiscardIntoDeck();
        }

        return this.deck.pop() ?? null;
    }

    /** Discards the current hand and draws a fresh one for the next player turn. */
    renewHand (): void
    {
        this.player.shield = 0;

        if (this.hand.length > 0)
        {
            this.discard.push(...this.hand.splice(0));
        }

        while (this.hand.length < GAME_RULES.handSize)
        {
            const card = this.drawCard();

            if (!card)
            {
                break;
            }

            this.hand.push(card);
        }

        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });
        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.player.shield });
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
        this.queuedEnemyTurn = planEnemyTurn();

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

    beginAttack (): AttackSequence | null
    {
        if (this.attackInProgress || this.enemyTurnInProgress || this.isEnemyDefeated() || this.isPlayerDefeated())
        {
            return null;
        }

        const sequence = planAttack(this.board, this.chainStart);

        if (sequence.chain.length === 0)
        {
            return null;
        }

        this.attackInProgress = true;
        this.damageDealtThisAttack = 0;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_STARTED, { sequence });

        return sequence;
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

        const shieldAbsorbed = Math.min(this.enemy.shield, damage);
        const healthDamage = damage - shieldAbsorbed;

        this.enemy.shield -= shieldAbsorbed;
        this.enemy.health = Math.max(0, this.enemy.health - healthDamage);
        this.damageDealtThisAttack += damage;

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

        const chainArmor = sequence.chain.reduce((sum, step) => sum + step.armor, 0);

        this.player.shield += chainArmor;
        this.damageDealtThisAttack = 0;
        this.attackInProgress = false;

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

    completeEnemyTurn (action: EnemyTurnAction): void
    {
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

            if (card)
            {
                this.discard.push(card);
            }
        }

        this.board.clear();
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

        if (!existing)
        {
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

        if (!card)
        {
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

        return this.board.swapCards(a, b);
    }

    canEditBoard (): boolean
    {
        return !this.attackInProgress && !this.enemyTurnInProgress;
    }
}
