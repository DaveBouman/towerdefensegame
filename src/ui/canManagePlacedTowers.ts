import type { GameStateSnapshot } from '../game/domain/types';

/** True when placed towers can be repositioned or sold (between waves / deployment). */
export const canManagePlacedTowers = (
    state: Pick<GameStateSnapshot, 'upgradePick' | 'towerDraftPick' | 'canStartWave' | 'deployment'>,
): boolean =>
    !state.upgradePick
    && !state.towerDraftPick
    && (state.deployment?.active === true || state.canStartWave);
