/** EXP granted per enemy kill scales with wave (exponential). */
const KILL_EXP_BASE = 12;
const KILL_EXP_WAVE_GROWTH = 1.22;

/** Flat wave-clear bonus for every tower — exponential so late recruits catch up. */
const WAVE_BONUS_EXP_BASE = 30;
const WAVE_BONUS_EXP_GROWTH = 1.48;

export const getKillExperience = (enemyGoldValue: number, wave: number): number =>
{
    const w = Math.max(1, wave);
    const waveFactor = Math.pow(KILL_EXP_WAVE_GROWTH, w - 1);

    return Math.floor((KILL_EXP_BASE + enemyGoldValue * 0.5) * waveFactor);
};

export const getWaveBonusExperience = (wave: number): number =>
{
    const w = Math.max(1, wave);

    return Math.floor(WAVE_BONUS_EXP_BASE * Math.pow(WAVE_BONUS_EXP_GROWTH, w - 1));
};

/** Permanent stat growth per kill, scaled by the unit's kill rating. */
export const KILL_RATING_DAMAGE_PER_KILL = 0.35;
export const KILL_RATING_MAX_HEALTH_PER_KILL = 2;
