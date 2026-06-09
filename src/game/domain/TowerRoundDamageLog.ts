import { damageDealtToExperience } from '../config/towerExperienceConfig';
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
    }

    reset (): void
    {
        this.wave = 0;
        this.dealt.clear();
        this.taken.clear();
        this.history.length = 0;
    }

    beginWave (wave: number): void
    {
        this.wave = wave;
        this.dealt.clear();
        this.taken.clear();
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
        const labels = new Map(towers.map((tower) => [ tower.id, tower.unitType ]));
        const towerIds = new Set([ ...this.dealt.keys(), ...this.taken.keys() ]);
        const entries: TowerRoundDamageEntry[] = [ ...towerIds ].map((towerId) =>
        {
            const damageDealt = this.dealt.get(towerId) ?? 0;

            return {
                towerId,
                unitType: labels.get(towerId) ?? towerId,
                damageDealt,
                damageTaken: this.taken.get(towerId) ?? 0,
                expGained: damageDealtToExperience(damageDealt),
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
}

export const formatWaveTowerDamageLog = (log: WaveTowerDamageLog): string =>
{
    if (log.entries.length === 0)
    {
        return `Wave ${log.wave}: no tower damage recorded`;
    }

    const lines = log.entries.map((entry) =>
        `  ${entry.unitType}: dealt ${entry.damageDealt}, took ${entry.damageTaken}, +${entry.expGained} EXP`);

    return [ `Wave ${log.wave} tower damage:`, ...lines ].join('\n');
};
