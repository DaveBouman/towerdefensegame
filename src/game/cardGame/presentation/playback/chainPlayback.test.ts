import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../events/CardGameEventBus', () => ({
    CardGameEventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

vi.mock('../../../audio/bindGameAudio', () => ({
    playCombatHitSfx: vi.fn(),
    playPlayerHitSfx: vi.fn(),
    playShieldAbsorbSfx: vi.fn(),
    playAbilityProcSfx: vi.fn(),
}));

vi.mock('../visualEffects/visualEffectTweens', () => ({
    playFloatingText: vi.fn(),
}));

import { CardGameSession } from '../../domain/CardGameSession';
import { createCardInstance, resetCardInstanceCounter } from '../../domain/createCardInstance';
import { runChainPlayback } from './chainPlayback';
import type { AttackSequence } from '../../domain/types';

const createMockScene = (): Phaser.Scene =>
{
    const destroy = vi.fn();
    const setDepth = vi.fn();
    const graphic = {
        lineStyle: vi.fn().mockReturnThis(),
        lineBetween: vi.fn().mockReturnThis(),
        beginPath: vi.fn().mockReturnThis(),
        moveTo: vi.fn().mockReturnThis(),
        lineTo: vi.fn().mockReturnThis(),
        strokePath: vi.fn().mockReturnThis(),
        destroy,
        setDepth,
    };

    return {
        time: {
            now: 1000,
            delayedCall: (_delay: number, callback: () => void) =>
            {
                callback();
                return { remove: vi.fn() };
            },
        },
        tweens: {
            add: vi.fn(() => ({ })),
            killTweensOf: vi.fn(),
        },
        add: {
            circle: vi.fn(() => ({
                setDepth,
                destroy,
            })),
            graphics: vi.fn(() => graphic),
            text: vi.fn(() => ({
                setOrigin: vi.fn().mockReturnThis(),
                setAlpha: vi.fn().mockReturnThis(),
                destroy,
            })),
        },
        cameras: {
            main: {
                shake: vi.fn(),
            },
        },
    } as unknown as Phaser.Scene;
};

describe('chainPlayback', () =>
{
    beforeEach(() =>
    {
        resetCardInstanceCounter();
    });

    it('completes a single-card attack chain', () =>
    {
        const session = new CardGameSession('basic');

        session.board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        session.beginAttack();

        const scene = createMockScene();
        const wrapper = {
            getBounds: () => ({
                width: 72,
                height: 72,
                centerX: 120,
                centerY: 80,
            }),
            getWorldTransformMatrix: () => ({ tx: 84, ty: 44 }),
            width: 72,
            height: 72,
            setScale: vi.fn(),
            setAlpha: vi.fn(),
        };
        const enemyContainer = {
            getBounds: () => ({
                width: 100,
                height: 100,
                centerX: 400,
                centerY: 120,
            }),
            width: 100,
            height: 100,
        };

        let completed: AttackSequence | null = null;

        runChainPlayback(
            {
                scene,
                session,
                boardView: {
                    getCardVisualTarget: () => ({ slot: { row: 0, col: 0 }, wrapper, width: 72, height: 72 }),
                    setChainStartActive: vi.fn(),
                    hideJokerDirectionPicker: vi.fn(),
                    bringCardToFront: vi.fn(),
                } as never,
                enemySquad: {
                    firstView: {
                        container: enemyContainer,
                        setHealth: vi.fn(),
                        playHitFlash: vi.fn(),
                        showDamageNumber: vi.fn(),
                    },
                    getView: vi.fn(),
                    syncFromSession: vi.fn(),
                    setSelected: vi.fn(),
                } as never,
                playerView: {
                    container: { width: 100, height: 100 },
                    setHealth: vi.fn(),
                } as never,
                armorView: {
                    showShieldGain: vi.fn(),
                    showShieldAbsorb: vi.fn(),
                } as never,
                setDisplayedArmor: vi.fn(),
                scheduleAttackTimer: (callback) => callback(),
                clearAttackTimer: vi.fn(),
                syncBattleModifierStatus: vi.fn(),
                deactivateActiveVisual: vi.fn(),
                deactivateBoostBuff: vi.fn(),
                activateStep: vi.fn(),
                deactivateStep: vi.fn(),
                requestHitstop: vi.fn(),
            },
            { row: 0, col: 0 },
            (sequence) =>
            {
                completed = sequence;
            },
        );

        expect(completed).not.toBeNull();
        expect(completed!.chain).toHaveLength(1);
        expect(completed!.totalDamage).toBeGreaterThan(0);
    });

    it('still completes when element hit VFX throws', () =>
    {
        const session = new CardGameSession('basic');

        session.board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        session.beginAttack();

        const scene = createMockScene();

        (scene.add.graphics as ReturnType<typeof vi.fn>).mockImplementation(() =>
        {
            throw new Error('graphics failed');
        });

        let completed = false;

        runChainPlayback(
            {
                scene,
                session,
                boardView: {
                    getCardVisualTarget: () => ({
                        slot: { row: 0, col: 0 },
                        wrapper: {
                            getBounds: () => ({ width: 72, height: 72, centerX: 1, centerY: 1 }),
                            getWorldTransformMatrix: () => ({ tx: 0, ty: 0 }),
                            width: 72,
                            height: 72,
                            setScale: vi.fn(),
                            setAlpha: vi.fn(),
                        },
                        width: 72,
                        height: 72,
                    }),
                    setChainStartActive: vi.fn(),
                    hideJokerDirectionPicker: vi.fn(),
                    bringCardToFront: vi.fn(),
                } as never,
                enemySquad: {
                    firstView: {
                        container: {
                            getBounds: () => ({ width: 100, height: 100, centerX: 2, centerY: 2 }),
                            width: 100,
                            height: 100,
                        },
                        setHealth: vi.fn(),
                        playHitFlash: vi.fn(),
                        showDamageNumber: vi.fn(),
                    },
                    getView: vi.fn(),
                    syncFromSession: vi.fn(),
                    setSelected: vi.fn(),
                } as never,
                playerView: {
                    container: { width: 100, height: 100 },
                    setHealth: vi.fn(),
                } as never,
                armorView: {
                    showShieldGain: vi.fn(),
                    showShieldAbsorb: vi.fn(),
                } as never,
                setDisplayedArmor: vi.fn(),
                scheduleAttackTimer: (callback) => callback(),
                clearAttackTimer: vi.fn(),
                syncBattleModifierStatus: vi.fn(),
                deactivateActiveVisual: vi.fn(),
                deactivateBoostBuff: vi.fn(),
                activateStep: vi.fn(),
                deactivateStep: vi.fn(),
                requestHitstop: vi.fn(),
            },
            { row: 0, col: 0 },
            () =>
            {
                completed = true;
            },
        );

        expect(completed).toBe(true);
    });
});
