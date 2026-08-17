import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../cardGame/presentation/playback/enemyPhasePlayback', () => ({
    resolveEnemyPhasePlayback: vi.fn(),
}));

vi.mock('../cardGame/events/CardGameEventBus', () => ({
    CardGameEventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

vi.mock('../EventBus', () => ({
    EventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

import { CardGameSession } from '../cardGame/domain/CardGameSession';
import { createCardInstance, resetCardInstanceCounter } from '../cardGame/domain/createCardInstance';
import { handleAttackResolved } from './battleAttackFlow';
import { resolveEnemyPhasePlayback } from '../cardGame/presentation/playback/enemyPhasePlayback';

const mockedEnemyPhase = vi.mocked(resolveEnemyPhasePlayback);

describe('battleAttackFlow', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
        mockedEnemyPhase.mockClear();
    });

    it('starts enemy phase playback after a single-card attack resolves', () =>
    {
        const session = new CardGameSession('basic');

        session.board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        const sequence = session.planAttack()!;

        session.beginAttack();

        handleAttackResolved({
            session,
            boardView: {} as never,
            enemySquad: {
                syncFromSession: vi.fn(),
                clearIntent: vi.fn(),
            } as never,
            syncBoardFromSession: vi.fn(),
            syncPileViews: vi.fn(),
            syncLowHpVignette: vi.fn(),
            getRerollModeActive: () => false,
            cancelReroll: vi.fn(),
            emitAttackReadiness: vi.fn(),
            getActivePuzzleId: () => null,
            delayCall: vi.fn(),
            endBattle: vi.fn(),
            winBattle: vi.fn(),
            loseBattle: vi.fn(),
        }, sequence);

        expect(mockedEnemyPhase).toHaveBeenCalledTimes(1);
        expect(session.getEnergy()).toBe(2);
        expect(session.isAttackInProgress()).toBe(true);
    });

    it('runs a full domain attack then enemy response after lock release', () =>
    {
        const session = new CardGameSession('basic');

        session.board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        const sequence = session.planAttack()!;

        session.beginAttack();

        const beforeEnemyHp = session.getEnemy('enemy-0').health;

        session.dealAttackDamage(sequence.totalDamage, 'enemy-0');
        session.completeAttack(sequence);
        session.spendEnergy();

        expect(session.isAttackInProgress()).toBe(true);

        session.prepareEnemyPhase();
        const action = session.beginEnemyTurn();

        expect(action).not.toBeNull();

        const attackStep = action!.steps.find((step) => step.kind === 'attack');

        expect(attackStep).toBeDefined();

        const playerBefore = session.getPlayer().health;

        session.resolveEnemyAttack(attackStep!.amount ?? 0);
        session.completeEnemyTurn(action!);
        session.finishEnemyPhase();
        session.releaseAttackLock();

        expect(session.getEnemy('enemy-0').health).toBeLessThan(beforeEnemyHp);
        expect(session.getPlayer().health).toBeLessThanOrEqual(playerBefore);
        expect(session.isAttackInProgress()).toBe(false);
        expect(session.getAttackReadiness().canAttack).toBe(true);
    });

    it('resets energy when the player round finishes', () =>
    {
        const session = new CardGameSession('basic');

        expect(session.getEnergy()).toBe(3);

        session.spendEnergy();
        session.spendEnergy();
        session.spendEnergy();

        expect(session.getEnergy()).toBe(0);

        session.clearBoard();
        session.finishPlayerRound();

        expect(session.getEnergy()).toBe(3);
    });
});
