import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../EventBus', () => ({
    EventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

import { GRID_CONFIG } from '../config/gridConfig';
import { getTowerDefinitionOrThrow } from '../config/towerCatalog';
import { Grid } from '../grid/Grid';
import { GameSession } from './GameSession';

describe('GameSession.checkWaveComplete', () =>
{
    const grid = new Grid(GRID_CONFIG);
    let session: GameSession;

    beforeEach(() =>
    {
        session = new GameSession(grid);
        session.prepare();
    });

    it('does not offer rewards between waves', () =>
    {
        session.state.setWave(1);
        session.state.setCanStartWave(true);
        session.state.setUpgradePick(null);

        session.checkWaveComplete();

        expect(session.state.upgradePick).toBeNull();
    });

    it('preserves enemy nexus HP after a wave ends', () =>
    {
        session.state.setTowerDraftPick(null);
        session.state.setWave(1);
        session.state.setCanStartWave(false);
        session.state.setUpgradePick(null);

        const enemyNexus = session.enemies.getEnemyNexus();

        expect(enemyNexus).toBeDefined();
        enemyNexus!.health = enemyNexus!.maxHealth - 150;

        session.checkWaveComplete();

        expect(session.enemies.getEnemyNexus()?.health).toBe(enemyNexus!.maxHealth - 150);
    });

    it('ends the wave when minions are cleared and all player towers are destroyed', () =>
    {
        session.state.setTowerDraftPick(null);
        session.state.setWave(1);
        session.state.setCanStartWave(false);
        session.state.setUpgradePick(null);

        const enemyNexus = session.enemies.getEnemyNexus();

        expect(enemyNexus?.health).toBeGreaterThan(0);

        session.checkWaveComplete();

        expect(session.state.upgradePick?.choices.length).toBeGreaterThan(0);
        expect(enemyNexus?.health).toBeGreaterThan(0);
    });

    it('does not end the wave when minions are cleared but player towers remain', () =>
    {
        session.state.setTowerDraftPick(null);
        session.state.setWave(1);
        session.state.setCanStartWave(false);
        session.state.setUpgradePick(null);

        const def = getTowerDefinitionOrThrow('militia');

        session.towers.tryPlace({ col: 4, row: 35 }, def.id);

        session.checkWaveComplete();

        expect(session.state.upgradePick).toBeNull();
    });

    it('ends the run when the enemy nexus is finally destroyed', () =>
    {
        session.state.setTowerDraftPick(null);
        session.state.setWave(1);
        session.state.setCanStartWave(false);
        session.state.setUpgradePick(null);

        const enemyNexus = session.enemies.getEnemyNexus();

        if (enemyNexus)
        {
            enemyNexus.health = 0;
        }

        session.checkWaveComplete();

        expect(session.state.upgradePick?.choices.length).toBeGreaterThan(0);
        expect(session.enemies.getEnemyNexus()?.health).toBe(0);
    });

    it('does not end the round when towers are wiped but minions remain', () =>
    {
        session.state.setTowerDraftPick(null);
        session.state.setWave(1);
        session.state.setCanStartWave(false);
        session.state.setUpgradePick(null);

        session.enemies.trySpawnAt({ col: 1, row: 1 }, 'basic');

        const def = getTowerDefinitionOrThrow('militia');
        const tower = session.towers.tryPlace({ col: 4, row: 35 }, def.id);

        session.towers.remove(tower!.id);

        session.checkWaveComplete();

        expect(session.state.upgradePick).toBeNull();
    });

    it('ends the round when the player nexus is destroyed', () =>
    {
        session.state.setTowerDraftPick(null);
        session.state.setWave(1);
        session.state.setCanStartWave(false);
        session.state.setUpgradePick(null);

        const nexus = session.playerNexus.active;

        if (nexus)
        {
            nexus.health = 0;
        }

        session.checkWaveComplete();

        expect(session.state.upgradePick?.choices.length).toBeGreaterThan(0);
    });

    it('opens a tower draft after claiming a post-wave reward', () =>
    {
        session.state.setTowerDraftPick(null);
        session.state.setWave(1);
        session.state.setUpgradePick({ choices: [ 'spyglass' ] });
        session.state.setCanStartWave(false);

        expect(session.claimWaveReward('spyglass')).toBe(true);
        expect(session.state.upgradePick).toBeNull();
        expect(session.state.towerDraftPick?.choices.length).toBeGreaterThan(0);
        expect(session.state.canStartWave).toBe(false);
        expect(session.state.deployment?.active).toBeFalsy();
    });

    it('sells a placed tower for gold between waves', () =>
    {
        session.confirmTowerDraft('militia');
        session.tryDeployTowerAt({ col: 4, row: 35 }, 'militia');

        const towerId = session.towers.all[0]?.id;
        const goldBefore = session.state.gold;
        const refund = session.towers.all[0]?.goldValue ?? 0;

        expect(towerId).toBeDefined();
        expect(session.sellTower(towerId!)).toBe(true);
        expect(session.towers.all).toHaveLength(0);
        expect(session.state.gold).toBe(goldBefore + refund);
    });
});
