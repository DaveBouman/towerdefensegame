import type { GameStateSnapshot } from '../game/domain/types';

/** Mirrors WaveRoundController.isCombatActive for React UI. */
export const isCombatActive = (
    state: Pick<GameStateSnapshot, 'wave' | 'upgradePick' | 'towerDraftPick' | 'canStartWave'>,
): boolean =>
    state.wave > 0
    && !state.upgradePick
    && !state.towerDraftPick
    && !state.canStartWave;
