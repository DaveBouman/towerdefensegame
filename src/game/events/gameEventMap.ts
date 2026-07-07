import type { AttackReadiness, RerollState } from '../cardGame/domain/types';
import type { Scene } from 'phaser';

export interface PileCardEntry {
    definitionId: string;
    label: string;
    power: number;
    behaviorId: string;
}

export interface PileViewPayload {
    kind: 'deck' | 'graveyard';
    title: string;
    cards: PileCardEntry[];
}

export interface GameEventMap {
    'current-scene-ready': Scene;
    'attack': void;
    'attack-rejected': { reason: AttackReadiness['reason'] };
    'card-attack-ready': AttackReadiness;
    'reroll-begin': void;
    'reroll-confirm': void;
    'reroll-cancel': void;
    'reroll-state': RerollState;
    'start-battle': { enemyId: string; startHealth: number; deck: string[]; seed: number };
    'battle-won': { playerHealth: number };
    'battle-lost': void;
    'pile-view-open': PileViewPayload;
}
