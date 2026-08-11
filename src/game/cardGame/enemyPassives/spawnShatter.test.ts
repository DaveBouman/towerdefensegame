import { describe, expect, it } from 'vitest';
import { createEnemyCombatant } from '../domain/enemyCombatants';
import { shatterPartsThatFit, shouldSpawnMinionAfterTurn } from './spawnShatter';

describe('spawnShatter', () =>
{
    it('spawns on cadence when under the minion cap', () =>
    {
        const host = createEnemyCombatant('enemy-0', 'broodframe');
        host.turnsTaken = 2;

        expect(shouldSpawnMinionAfterTurn(host, [ host ])?.minionId).toBe('wire-drone');
    });

    it('does not spawn when a living minion is already present', () =>
    {
        const host = createEnemyCombatant('enemy-0', 'broodframe');
        const drone = createEnemyCombatant('enemy-1', 'wire-drone');
        host.turnsTaken = 2;

        expect(shouldSpawnMinionAfterTurn(host, [ host, drone ])).toBeNull();
    });

    it('spawns at low HP when no minion is alive', () =>
    {
        const host = createEnemyCombatant('enemy-0', 'broodframe');
        host.turnsTaken = 1;
        host.state.health = 30;

        expect(shouldSpawnMinionAfterTurn(host, [ host ])?.minionId).toBe('wire-drone');
    });

    it('reads shatter parts from the android chassis', () =>
    {
        const android = createEnemyCombatant('enemy-0', 'android');

        expect(shatterPartsThatFit(android, 0)).toEqual([
            'android-arm',
            'android-core',
            'android-legs',
        ]);
    });
});
