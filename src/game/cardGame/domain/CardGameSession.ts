import { GRID_CONFIG } from '../../config/gridConfig';
import { GAME_RULES } from '../config/cardRegistry';
import { planAttack } from '../combat/AttackPipeline';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { createCardInstance } from '../domain/createCardInstance';
import type {
    AttackSequence,
    CardInstance,
    EnemyState,
    SlotPosition,
} from '../domain/types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';

export class CardGameSession
{
    readonly board: BoardModel;
    private readonly hand: CardInstance[] = [];
    private enemy: EnemyState;
    private attackInProgress = false;

    constructor ()
    {
        this.board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        this.enemy = {
            health: GAME_RULES.enemy.maxHealth,
            maxHealth: GAME_RULES.enemy.maxHealth,
        };

        for (const definitionId of GAME_RULES.startingHand)
        {
            this.hand.push(createCardInstance(definitionId));
        }
    }

    getHand (): readonly CardInstance[]
    {
        return this.hand;
    }

    getEnemy (): EnemyState
    {
        return { ...this.enemy };
    }

    isAttackInProgress (): boolean
    {
        return this.attackInProgress;
    }

    isEnemyDefeated (): boolean
    {
        return this.enemy.health <= 0;
    }

    planAttack (): AttackSequence | null
    {
        const sequence = planAttack(this.board);

        if (sequence.steps.length === 0 || sequence.totalDamage <= 0)
        {
            return null;
        }

        return sequence;
    }

    beginAttack (): AttackSequence | null
    {
        if (this.attackInProgress || this.isEnemyDefeated())
        {
            return null;
        }

        const sequence = this.planAttack();

        if (!sequence)
        {
            return null;
        }

        this.attackInProgress = true;
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

    completeAttack (sequence: AttackSequence): void
    {
        this.enemy.health = Math.max(0, this.enemy.health - sequence.totalDamage);
        this.attackInProgress = false;

        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_COMPLETED, {
            sequence,
            enemy: this.getEnemy(),
        });

        if (this.isEnemyDefeated())
        {
            CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_DEFEATED, { enemy: this.getEnemy() });
        }
    }

    cancelAttack (): void
    {
        this.attackInProgress = false;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_CANCELLED);
    }

    placeCardFromHand (handIndex: number, slot: SlotPosition): boolean
    {
        if (this.attackInProgress)
        {
            return false;
        }

        const card = this.hand[handIndex];

        if (!card || !this.board.placeCard(slot, card))
        {
            return false;
        }

        this.hand.splice(handIndex, 1);
        CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card });
        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });

        return true;
    }
}
