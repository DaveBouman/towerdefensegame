import { describe, expect, it, beforeEach } from 'vitest';
import { startRun } from '../run/AutoBattlerRun';
import { resetAutoBattlerUidCounter } from '../unitRegistry';
import { buildClientRunView } from './buildClientView';

describe('buildClientRunView', () =>
{
    beforeEach(() =>
    {
        resetAutoBattlerUidCounter();
    });

    it('never exposes enemy shop or run seed', () =>
    {
        const run = startRun('SERVERSEED');
        const view = buildClientRunView(run, 'vs_ai');

        expect(view.player.offers.length).toBeGreaterThan(0);
        expect(view.enemyTeam).toHaveLength(run.enemy.team.length);
        expect(view).not.toHaveProperty('seed');
        expect(Object.keys(view)).not.toContain('enemy');
    });
});
