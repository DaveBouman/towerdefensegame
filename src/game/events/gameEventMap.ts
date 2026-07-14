import type { AttackReadiness, RerollState, TurnState } from '../cardGame/domain/types';
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

export interface PuzzleState {
    puzzleId: string;
    title: string;
    hint: string;
    damageTarget: number;
    cardCount: number;
    isPuzzle: true;
}

export interface PuzzleResolvedPayload {
    puzzleId: string;
    success: boolean;
    damageDealt: number;
    damageTarget: number;
}

export interface GameEventMap {
    'current-scene-ready': Scene;
    'attack': void;
    'end-turn': void;
    'attack-rejected': { reason: AttackReadiness['reason'] };
    'card-attack-ready': AttackReadiness;
    'turn-state': TurnState;
    'reroll-begin': void;
    'reroll-confirm': void;
    'reroll-cancel': void;
    'reroll-state': RerollState;
    'start-battle': {
        enemyId?: string;
        enemyIds?: string[];
        startHealth: number;
        deck: string[];
        seed: number;
        bodyMods: string[];
        runAttackCount: number;
    };
    'start-puzzle': { puzzleId: string; startHealth: number; seed: number; bodyMods: string[]; runAttackCount: number };
    'puzzle-state': PuzzleState;
    'puzzle-resolved': PuzzleResolvedPayload;
    'battle-won': { playerHealth: number; runAttackCount: number };
    'battle-lost': { runAttackCount: number };
    'run-attack-count': { runAttackCount: number };
    'pile-view-open': PileViewPayload;
}
