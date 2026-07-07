import type {
    EnemyPassiveConfig,
    EnemyPassiveId,
    EnemyPassiveInput,
} from './types';

export const ENEMY_PASSIVE_DEFAULTS: Record<EnemyPassiveId, EnemyPassiveConfig> = {
    thorns: { id: 'thorns', reflectDamage: 2 },
    enrage: { id: 'enrage', attackBonusPerTrap: 2, extraTrapsPerTrap: 0 },
    lastStand: {
        id: 'lastStand',
        healthRatio: 0.25,
        attackDamage: 12,
        shieldGain: 10,
        hazardsPerTurn: 2,
        forceAttack: true,
    },
    smoke: { id: 'smoke', suppressedPoisonCards: 1 },
    wetBlanket: { id: 'wetBlanket', fireAlternationMultiplier: 0.5 },
    silenceTile: { id: 'silenceTile', tilesPerTurn: 1 },
    loopHunter: { id: 'loopHunter', damage: 3 },
    jammer: { id: 'jammer', minChainLength: 6, shieldGain: 5 },
    escalate: { id: 'escalate', trapsPerRamp: 1, maxTraps: 4 },
    dampenTiles: { id: 'dampenTiles', parity: 'even', multiplier: 0.5, everyTurns: 2, duration: 1 },
};

export const normalizeEnemyPassives = (
    passives: readonly EnemyPassiveInput[] = [],
): EnemyPassiveConfig[] =>
    passives.map((passive) =>
    {
        if (typeof passive === 'string')
        {
            return { ...ENEMY_PASSIVE_DEFAULTS[passive] };
        }

        return {
            ...ENEMY_PASSIVE_DEFAULTS[passive.id],
            ...passive,
        } as EnemyPassiveConfig;
    });

export const getEnemyPassive = <T extends EnemyPassiveConfig['id']>(
    passives: readonly EnemyPassiveConfig[],
    id: T,
): Extract<EnemyPassiveConfig, { id: T }> | undefined =>
    passives.find((passive): passive is Extract<EnemyPassiveConfig, { id: T }> => passive.id === id);
