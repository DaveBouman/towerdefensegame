import type { AttackReadiness, RerollState } from '../cardGame/domain/types';
import type { Scene } from 'phaser';

export interface GameEventMap {
    'current-scene-ready': Scene;
    'attack': void;
    'attack-rejected': { reason: AttackReadiness['reason'] };
    'card-attack-ready': AttackReadiness;
    'reroll-begin': void;
    'reroll-confirm': void;
    'reroll-cancel': void;
    'reroll-state': RerollState;
    'start-battle': { enemyId: string; startHealth: number };
    'battle-won': { playerHealth: number };
    'battle-lost': void;
}
