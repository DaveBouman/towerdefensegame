import type { GameStateSnapshot } from './types';

export const isCombatActive = (state: GameStateSnapshot): boolean =>
    state.runOutcome === 'playing'
    && state.wave > 0
    && !state.canStartWave;

export const canPlaceTowers = (state: GameStateSnapshot): boolean =>
    state.runOutcome === 'playing'
    && state.canStartWave;
