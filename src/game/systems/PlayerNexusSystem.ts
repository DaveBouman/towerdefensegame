import { EventBus } from '../EventBus';
import { getPlayerNexusWorldPosition } from '../config/nexusConfig';
import { GAME_EVENTS } from '../events/gameEvents';
import { PlayerNexusState } from '../domain/PlayerNexusState';
import type { PlayerNexusStateSnapshot } from '../domain/types';

export class PlayerNexusSystem
{
    private nexus: PlayerNexusState | null = null;

    get active (): PlayerNexusState | null
    {
        return this.nexus;
    }

    spawn (): PlayerNexusState
    {
        this.nexus = new PlayerNexusState(getPlayerNexusWorldPosition());
        EventBus.emit(GAME_EVENTS.PLAYER_NEXUS_SPAWNED, this.nexus.snapshot());

        return this.nexus;
    }

    getSnapshot (): PlayerNexusStateSnapshot | undefined
    {
        return this.nexus?.snapshot();
    }

    applyDamage (amount: number): number
    {
        if (!this.nexus)
        {
            return 0;
        }

        const damage = this.nexus.applyDamage(amount);

        EventBus.emit(GAME_EVENTS.PLAYER_NEXUS_DAMAGED, this.nexus.snapshot());

        if (this.nexus.health <= 0)
        {
            EventBus.emit(GAME_EVENTS.PLAYER_NEXUS_DESTROYED, this.nexus.snapshot());
        }

        return damage;
    }

    reset (): void
    {
        this.nexus = null;
    }
}
