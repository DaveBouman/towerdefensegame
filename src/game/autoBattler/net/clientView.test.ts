import { describe, expect, it, beforeEach } from 'vitest';
import { startRun } from '../run/AutoBattlerRun';
import { resetAutoBattlerUidCounter } from '../unitRegistry';
import { toClientRunView } from './clientView';

describe('toClientRunView', () =>
{
    beforeEach(() =>
    {
        resetAutoBattlerUidCounter();
    });

    it('hides enemy shop offers and gold from the client snapshot', () =>
    {
        const run = startRun('NETSEED');
        const view = toClientRunView(run, 'vs_ai');

        expect(view.player.offers.length).toBeGreaterThan(0);
        expect(view.enemyTeam).toHaveLength(run.enemy.team.length);
        expect((view as { enemy?: unknown }).enemy).toBeUndefined();
        expect(Object.keys(view)).not.toContain('enemy');
    });
});
