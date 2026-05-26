import type { GameState } from '../domain/GameState';

export class WaveSystem
{
    private readonly state: GameState;

    constructor (state: GameState)
    {
        this.state = state;
    }

    startNextWave (): void
    {
        this.state.setWave(this.state.wave + 1);
    }
}
