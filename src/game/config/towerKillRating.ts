import type { TowerUpgradeModifiers } from './towerUpgradeCatalog';
import {
    KILL_RATING_DAMAGE_PER_KILL,
    KILL_RATING_MAX_HEALTH_PER_KILL,
} from './towerExperienceConfig';

export const computeKillRatingModifiers = (
    kills: number,
    killRating: number,
): TowerUpgradeModifiers =>
{
    if (kills <= 0 || killRating <= 0)
    {
        return {};
    }

    const scale = kills * killRating;

    return {
        damage: scale * KILL_RATING_DAMAGE_PER_KILL,
        maxHealth: scale * KILL_RATING_MAX_HEALTH_PER_KILL,
    };
};
