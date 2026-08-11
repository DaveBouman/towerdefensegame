import { random } from '../random/rng';

export const MEDIC_DUO_CHANCE = 0.22;
export const MEDIC_DUO_START_ROW = 4;
export const MEDIC_DUO_END_ROW = 8;

/** Primary enemies that already spawn with a fixed partner — no Field Medic addon. */
const MEDIC_DUO_BLOCKLIST = new Set([
    'field-medic',
    'android',
    'broodframe',
    'twin-clip',
    'bulwark-runner',
    'chrome-saint',
]);

/** Expands a rolled primary id into multi-enemy lineups when applicable. */
export const expandRolledEnemy = (
    enemyId: string,
): { enemyId: string; enemyIds?: string[] } =>
{
    switch (enemyId)
    {
        case 'broodframe':
            return { enemyId, enemyIds: [ 'broodframe', 'wire-drone' ] };
        case 'twin-clip':
            return { enemyId, enemyIds: [ 'twin-clip', 'twin-clip' ] };
        case 'bulwark-runner':
            return { enemyId, enemyIds: [ 'bulwark-runner', 'glass-striker' ] };
        case 'chrome-saint':
            return { enemyId, enemyIds: [ 'chrome-saint', 'glass-striker' ] };
        default:
            return { enemyId };
    }
};

/** Optional Field Medic partner on mid-run street ops (22% in columns 4–8). */
export const maybeAppendFieldMedic = (
    roll: { enemyId: string; enemyIds?: string[] },
    row: number,
    enabled: boolean,
): { enemyId: string; enemyIds?: string[] } =>
{
    if (
        !enabled
        || row < MEDIC_DUO_START_ROW
        || row > MEDIC_DUO_END_ROW
        || MEDIC_DUO_BLOCKLIST.has(roll.enemyId)
        || random() >= MEDIC_DUO_CHANCE
    )
    {
        return roll;
    }

    return { enemyId: roll.enemyId, enemyIds: [ roll.enemyId, 'field-medic' ] };
};
