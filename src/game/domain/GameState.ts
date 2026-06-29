import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { GameStateSnapshot, RunOutcome } from './types';

export class GameState
{
    private _gold = 100;
    private _wave = 0;
    private _lives = 10;
    private _runOutcome: RunOutcome = 'playing';
    private _canStartWave = true;
    private _paused = false;

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

    get runOutcome (): RunOutcome
    {
        return this._runOutcome;
    }

    get canStartWave (): boolean
    {
        return this._canStartWave;
    }

    get paused (): boolean
    {
        return this._paused;
    }

    snapshot (): GameStateSnapshot
    {
        return {
            gold: this._gold,
            wave: this._wave,
            lives: this._lives,
            runOutcome: this._runOutcome,
            canStartWave: this._canStartWave,
            paused: this._paused,
        };
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

    setRunOutcome (outcome: RunOutcome): void
    {
        if (this._runOutcome === outcome)
        {
            return;
        }

        this._runOutcome = outcome;
        this.notify();
    }

    setCanStartWave (canStartWave: boolean): void
    {
        this._canStartWave = canStartWave;
        this.notify();
    }

    setPaused (paused: boolean): void
    {
        if (this._paused === paused)
        {
            return;
        }

        this._paused = paused;
        this.notify();
    }

    private notify (): void
    {
        EventBus.emit(GAME_EVENTS.STATE_CHANGED, this.snapshot());
    }
}
