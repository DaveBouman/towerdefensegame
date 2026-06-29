import type {
    AttackSequence,
    AttackStep,
    CardInstance,
    EnemyState,
    SlotPosition,
} from '../domain/types';

export interface CardGameEventMap {
    'card-game-card-placed': { slot: SlotPosition; card: CardInstance };
    'card-game-armor-changed': { armor: number };
    'card-game-hand-changed': { hand: CardInstance[] };
    'card-game-attack-started': { sequence: AttackSequence };
    'card-game-attack-step': { step: AttackStep; stepIndex: number; sequence: AttackSequence };
    'card-game-attack-completed': { sequence: AttackSequence; enemy: EnemyState };
    'card-game-attack-cancelled': void;
    'card-game-enemy-defeated': { enemy: EnemyState };
}
