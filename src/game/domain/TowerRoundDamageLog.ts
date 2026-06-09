import { getWaveBonusExperience } from '../config/towerExperienceConfig';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type {
    EnemyAttackPayload,
    EnemyNexusAttackPayload,
    TowerAttackPayload,
    TowerCombatDamagePayload,
    TowerRoundDamageEntry,
    WaveTowerDamageLog,
} from './types';

type TowerLabel = { id: string; unitType: string };

export class TowerRoundDamageLog
{
    private wave = 0;
    private readonly dealt = new Map<string, number>();
    private readonly taken = new Map<string, number>();
    private readonly killExp = new Map<string, number>();
    private readonly history: WaveTowerDamageLog[] = [];
    private bound = false;

    bindEventBus (): void
    {
        if (this.bound)
        {
            return;
        }

        this.bound = true;
        EventBus.on(GAME_EVENTS.TOWER_ATTACKED, this.onTowerAttacked);
        EventBus.on(GAME_EVENTS.ENEMY_ATTACKED, this.onEnemyAttacked);
        EventBus.on(GAME_EVENTS.ENEMY_NEXUS_ATTACKED, this.onEnemyNexusAttacked);
        EventBus.on(GAME_EVENTS.TOWER_COMBAT_DAMAGE, this.onTowerCombatDamage);
        EventBus.on(GAME_EVENTS.TOWER_KILL_EXP, this.onTowerKillExp);
    }

    reset (): void
    {
        this.wave = 0;
        this.dealt.clear();
        this.taken.clear();
        this.killExp.clear();
        this.history.length = 0;
    }

    beginWave (wave: number): void
    {
        this.wave = wave;
        this.dealt.clear();
        this.taken.clear();
        this.killExp.clear();
    }

    getWaveBonusExperience (wave: number): number
    {
        return getWaveBonusExperience(wave);
    }

    recordDealt (towerId: string, amount: number): void
    {
        if (amount <= 0)
        {
            return;
        }

        this.dealt.set(towerId, (this.dealt.get(towerId) ?? 0) + amount);
    }

    recordTaken (towerId: string, amount: number): void
    {
        if (amount <= 0)
        {
            return;
        }

        this.taken.set(towerId, (this.taken.get(towerId) ?? 0) + amount);
    }

    finalizeWave (towers: readonly TowerLabel[]): WaveTowerDamageLog
    {
        const waveBonusExp = getWaveBonusExperience(this.wave);
        const entries: TowerRoundDamageEntry[] = towers.map((tower) =>
        {
            const killExp = this.killExp.get(tower.id) ?? 0;

            return {
                towerId: tower.id,
                unitType: tower.unitType,
                damageDealt: this.dealt.get(tower.id) ?? 0,
                damageTaken: this.taken.get(tower.id) ?? 0,
                killExp,
                waveBonusExp,
                expGained: killExp + waveBonusExp,
            };
        });

        entries.sort((a, b) => a.unitType.localeCompare(b.unitType) || a.towerId.localeCompare(b.towerId));

        const log: WaveTowerDamageLog = { wave: this.wave, entries };

        this.history.push(log);

        return log;
    }

    getHistory (): readonly WaveTowerDamageLog[]
    {
        return this.history;
    }

    private readonly onTowerAttacked = (payload: TowerAttackPayload): void =>
    {
        this.recordDealt(payload.towerId, payload.damage);
    };

    private readonly onEnemyAttacked = (payload: EnemyAttackPayload): void =>
    {
        if (payload.targetKind !== 'tower' || !payload.towerId)
        {
            return;
        }

        this.recordTaken(payload.towerId, payload.damage);
    };

    private readonly onEnemyNexusAttacked = (payload: EnemyNexusAttackPayload): void =>
    {
        if (payload.targetKind !== 'tower' || !payload.towerId)
        {
            return;
        }

        this.recordTaken(payload.towerId, payload.damage);
    };

    private readonly onTowerCombatDamage = (payload: TowerCombatDamagePayload): void =>
    {
        if (payload.dealt !== undefined)
        {
            this.recordDealt(payload.towerId, payload.dealt);
        }

        if (payload.taken !== undefined)
        {
            this.recordTaken(payload.towerId, payload.taken);
        }
    };

    private readonly onTowerKillExp = (payload: { towerId: string; exp: number }): void =>
    {
        if (payload.exp <= 0)
        {
            return;
        }

        this.killExp.set(payload.towerId, (this.killExp.get(payload.towerId) ?? 0) + payload.exp);
    };
}

export const formatWaveTowerDamageLog = (log: WaveTowerDamageLog): string =>
{
    if (log.entries.length === 0)
    {
        return `Wave ${log.wave}: no tower activity recorded`;
    }

    const lines = log.entries.map((entry) =>
        `  ${entry.unitType}: +${entry.killExp} kill EXP, +${entry.waveBonusExp} wave bonus (${entry.expGained} total)`);

    return [ `Wave ${log.wave} tower EXP:`, ...lines ].join('\n');
};
