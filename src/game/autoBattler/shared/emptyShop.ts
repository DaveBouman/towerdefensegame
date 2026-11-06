import type { PlayerShopState, Team } from '../types';
import { DEFAULT_PUBLIC_RULES } from './publicRules';

export const createEmptyTeam = (size = DEFAULT_PUBLIC_RULES.teamSize): Team =>
    Array.from({ length: size }, () => null);

export const createEmptyShopState = (): PlayerShopState =>
    ({
        gold: 0,
        tier: 1,
        turn: 1,
        lives: DEFAULT_PUBLIC_RULES.startingLives,
        wins: 0,
        team: createEmptyTeam(),
        offers: [],
    });
