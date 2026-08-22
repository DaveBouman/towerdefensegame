import type {
    EnemyPassiveConfig,
    EnemyPassiveId,
    EnemyPassiveInput,
} from './types';

export const ENEMY_PASSIVE_DEFAULTS: Record<EnemyPassiveId, EnemyPassiveConfig> = {
    thorns: { id: 'thorns', reflectDamage: 1 },
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
    jammer: { id: 'jammer', minChainLength: 6, shieldGain: 5 },
    escalate: { id: 'escalate', trapsPerRamp: 1, maxTraps: 4 },
    dampenTiles: { id: 'dampenTiles', parity: 'even', multiplier: 0.5, everyTurns: 2, duration: 1 },
    curseHand: { id: 'curseHand', cardId: 'burden', count: 1 },
    pressureColumn: { id: 'pressureColumn', avoidStartColumn: true },
    nullifyLane: { id: 'nullifyLane', axes: 'any', avoidStartColumn: true },
    spawnMinion: {
        id: 'spawnMinion',
        minionId: 'wire-drone',
        everyTurns: 2,
        maxLivingMinions: 1,
        healthRatio: 0.5,
    },
    shatterOnDeath: {
        id: 'shatterOnDeath',
        parts: [ 'android-arm', 'android-core', 'android-legs' ],
    },
    credLeech: { id: 'credLeech', amountPerTurn: 3 },
    rerollTax: { id: 'rerollTax', attackBonus: 4, extraTraps: 1 },
    cardThief: { id: 'cardThief', fleeAfterTurns: 5 },
    skillJam: { id: 'skillJam', suppressedSkillCards: 3 },
    linkRage: { id: 'linkRage', attackBonus: 6, extraTraps: 1 },
    bodyguard: { id: 'bodyguard', protectDefinitionId: 'glass-striker' },
    stutterClock: { id: 'stutterClock', everyGlobalTurns: 2 },
    phantomIntent: { id: 'phantomIntent' },
    phaseShift: {
        id: 'phaseShift',
        healthRatio: 0.5,
        label: 'Phase 2',
        message: 'Systems overclock — pressure intensifies.',
        attackBonus: 4,
        extraTraps: 1,
    },
    handRedirect: { id: 'handRedirect', everyTurns: 1 },
    siphonNode: { id: 'siphonNode', nodesPerTurn: 1 },
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
