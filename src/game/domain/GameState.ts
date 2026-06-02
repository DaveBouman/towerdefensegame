import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type {
    DeploymentSnapshot,
    GameStateSnapshot,
    TowerDraftPickState,
    UpgradePickState,
} from './types';
import type { TowerRace } from './towers/types';

export class GameState
{
    private _gold = 100;
    private _wave = 0;
    private _lives = 20;
    private _canStartWave = true;
    private _raceDraftBias: Record<TowerRace, number> = {
        'aether-dominion': 1,
        'swarmforge-brood': 1,
        'iron-covenant': 1,
    };
    private _upgradePick: UpgradePickState | null = null;
    private _towerDraftPick: TowerDraftPickState | null = null;
    private _deployment: DeploymentSnapshot | null = null;

    get gold (): number
    {
        return this._gold;
    }

    get wave (): number
    {
        return this._wave;
    }

    get lives (): number
    {
        return this._lives;
    }

    get canStartWave (): boolean
    {
        return this._canStartWave;
    }

    get upgradePick (): UpgradePickState | null
    {
        return this._upgradePick;
    }

    get deployment (): DeploymentSnapshot | null
    {
        return this._deployment;
    }

    get towerDraftPick (): TowerDraftPickState | null
    {
        return this._towerDraftPick;
    }

    snapshot (): GameStateSnapshot
    {
        return {
            gold: this._gold,
            wave: this._wave,
            lives: this._lives,
            canStartWave: this._canStartWave,
            raceDraftBias: this._raceDraftBias,
            upgradePick: this._upgradePick,
            towerDraftPick: this._towerDraftPick,
            deployment: this._deployment,
        };
    }

    setRaceDraftBias (bias: Record<TowerRace, number>): void
    {
        this._raceDraftBias = { ...bias };
        this.notify();
    }

    setDeployment (deployment: DeploymentSnapshot | null): void
    {
        this._deployment = deployment;
        this.notify();
    }

    setGold (gold: number): void
    {
        this._gold = gold;
        this.notify();
    }

    addGold (amount: number): void
    {
        if (amount <= 0)
        {
            return;
        }

        this._gold += amount;
        this.notify();
    }

    spendGold (amount: number): boolean
    {
        if (amount <= 0 || this._gold < amount)
        {
            return false;
        }

        this._gold -= amount;
        this.notify();

        return true;
    }

    setWave (wave: number): void
    {
        this._wave = wave;
        this.notify();
    }

    setLives (lives: number): void
    {
        this._lives = lives;
        this.notify();
    }

    setCanStartWave (canStartWave: boolean): void
    {
        this._canStartWave = canStartWave;
        this.notify();
    }

    setUpgradePick (pick: UpgradePickState | null): void
    {
        this._upgradePick = pick?.choices.length ? { choices: [ ...pick.choices ] } : null;
        this.notify();
    }

    setTowerDraftPick (pick: TowerDraftPickState | null): void
    {
        this._towerDraftPick = pick?.choices.length ? { choices: [ ...pick.choices ] } : null;
        this.notify();
    }

    private notify (): void
    {
        EventBus.emit(GAME_EVENTS.STATE_CHANGED, this.snapshot());
    }
}
