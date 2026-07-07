export const GAME_EVENTS = {
    ATTACK: 'attack',
    ATTACK_REJECTED: 'attack-rejected',
    CARD_ATTACK_READY: 'card-attack-ready',
    REROLL_BEGIN: 'reroll-begin',
    REROLL_CONFIRM: 'reroll-confirm',
    REROLL_CANCEL: 'reroll-cancel',
    REROLL_STATE: 'reroll-state',
    SCENE_READY: 'current-scene-ready',
    START_BATTLE: 'start-battle',
    BATTLE_WON: 'battle-won',
    BATTLE_LOST: 'battle-lost',
    PILE_VIEW_OPEN: 'pile-view-open',
} as const;
