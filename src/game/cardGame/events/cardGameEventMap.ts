import type {
    AttackSequence,
    AttackStep,
    CardInstance,
    EnemyState,
    EnemyTurnAction,
    PlayerState,
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
    'card-game-enemy-turn-started': { action: EnemyTurnAction };
    'card-game-enemy-turn-completed': { action: EnemyTurnAction; enemy: EnemyState; player: PlayerState };
    'card-game-enemy-turn-cancelled': void;
    'card-game-player-defeated': { player: PlayerState };
}
