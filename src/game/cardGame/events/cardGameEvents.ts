export const CARD_GAME_EVENTS = {
    CARD_PLACED: 'card-game-card-placed',
    ARMOR_CHANGED: 'card-game-armor-changed',
    HAND_CHANGED: 'card-game-hand-changed',
    ATTACK_STARTED: 'card-game-attack-started',
    ATTACK_STEP: 'card-game-attack-step',
    ATTACK_COMPLETED: 'card-game-attack-completed',
    ATTACK_CANCELLED: 'card-game-attack-cancelled',
    ENEMY_DEFEATED: 'card-game-enemy-defeated',
    ENEMY_TURN_STARTED: 'card-game-enemy-turn-started',
    ENEMY_TURN_COMPLETED: 'card-game-enemy-turn-completed',
    ENEMY_TURN_CANCELLED: 'card-game-enemy-turn-cancelled',
    PLAYER_DEFEATED: 'card-game-player-defeated',
} as const;
