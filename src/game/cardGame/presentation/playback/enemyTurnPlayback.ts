import type { CardGameSession } from '../../domain/CardGameSession';
import type { EnemyTurnStep } from '../../domain/types';
import type { CardBoardView } from '../../../board/CardBoardView';
import type { EnemySquadView } from '../../../board/EnemySquadView';
import type { EnemyTargetView } from '../../../board/EnemyTargetView';
import type { PlayerHealthView } from '../../../board/PlayerHealthView';
import type { ArmorView } from '../../../board/ArmorView';
import type { BattleModifierStatusView } from '../../../board/BattleModifierStatusView';
import { describeBattleModifier } from '../../combat/battleModifiers';
import { getDamageTierStyle, shakeCamera } from '../combatJuice';
import { playPlayerHitSfx, playShieldAbsorbSfx } from '../../../audio/bindGameAudio';
import { playSfx } from '../../../audio/gameAudio';
import { applyEnemyHitResult } from './combatHitVisuals';

export interface EnemyTurnPlaybackDeps
{
    scene: Phaser.Scene;
    session: CardGameSession;
    boardView: CardBoardView;
    enemySquad: EnemySquadView;
    playerView: PlayerHealthView;
    armorView: ArmorView;
    battleModifierView?: BattleModifierStatusView;
    setDisplayedArmor: (armor: number) => void;
    syncBattleModifierStatus: () => void;
    requestHitstop?: (ms: number) => void;
}

export function playEnemyTurnStep (
    deps: EnemyTurnPlaybackDeps,
    step: EnemyTurnStep,
    turnMs: number,
    enemyView: EnemyTargetView | undefined,
    instanceId: string | undefined,
    onComplete: () => void,
): void
{
    const {
        scene,
        session,
        boardView,
        enemySquad,
        playerView,
        armorView,
        setDisplayedArmor,
        syncBattleModifierStatus,
        requestHitstop,
    } = deps;

    if (step.kind === 'attack')
    {
        enemyView?.playEnemyAttackPulse();

        scene.time.delayedCall(turnMs, () =>
        {
            const result = session.resolveEnemyAttack(step.amount ?? 0, instanceId);
            playerView.setHealth(result.player);
            setDisplayedArmor(result.player.shield);

            if (result.shieldAbsorbed > 0)
            {
                armorView.showShieldAbsorb(result.shieldAbsorbed);
                playShieldAbsorbSfx();
            }

            if (result.healthDamage > 0)
            {
                const tier = getDamageTierStyle(result.healthDamage);

                playerView.playHitFlash();
                playerView.showDamageNumber(result.healthDamage, tier);
                shakeCamera(scene, tier.shakeIntensity * 1.3);
                playPlayerHitSfx(result.healthDamage);

                if (tier.hitstopMs > 0)
                {
                    requestHitstop?.(tier.hitstopMs);
                }
            }

            if (result.reflectedThorns)
            {
                applyEnemyHitResult(
                    {
                        scene,
                        session,
                        boardView,
                        enemySquad,
                        playerView,
                        armorView,
                        setDisplayedArmor,
                        requestHitstop,
                    },
                    result.reflectedThorns,
                    { behaviorId: 'thorns', visualId: 'thorns', definitionId: 'thorns' },
                );
            }

            onComplete();
        });

        return;
    }

    if (step.kind === 'place-hazard')
    {
        enemyView?.playEnemyAttackPulse();

        scene.time.delayedCall(turnMs, () =>
        {
            const slot = session.placeEnemyHazard();

            if (slot)
            {
                boardView.syncFromBoard(session.board);
                playSfx('enemy-move', { volume: 0.78 });
            }

            onComplete();
        });

        return;
    }

    if (step.kind === 'place-siphon')
    {
        enemyView?.playEnemyAttackPulse();

        scene.time.delayedCall(turnMs, () =>
        {
            const slot = session.placeEnemySiphon();

            if (slot)
            {
                boardView.syncFromBoard(session.board);
                playSfx('enemy-move', { volume: 0.78 });
            }

            onComplete();
        });

        return;
    }

    if (step.kind === 'dampen-field')
    {
        enemyView?.playEnemyAttackPulse();

        scene.time.delayedCall(turnMs, () =>
        {
            const field = session.activateDampenField();

            if (field)
            {
                boardView.setDampenedSlots(session.getDampenedSlots());
                playSfx('enemy-move', { volume: 0.75 });
            }

            onComplete();
        });

        return;
    }

    if (step.kind === 'lock-column')
    {
        enemyView?.playEnemyAttackPulse();

        scene.time.delayedCall(turnMs, () =>
        {
            const column = step.column ?? Math.max(0, (step.amount ?? 1) - 1);

            session.lockBoardColumn(column);
            boardView.setBlockedSlots(
                session.getPlacementBlockedSlots(),
                session.getBombDisabledSlots(),
            );
            enemyView?.showIntentLabel(`Lock col ${column + 1}`);
            playSfx('enemy-move', { volume: 0.8 });
            onComplete();
        });

        return;
    }

    if (step.kind === 'nullify-lane')
    {
        enemyView?.playEnemyAttackPulse();

        scene.time.delayedCall(turnMs, () =>
        {
            const axis = step.axis ?? 'column';
            const index = axis === 'row'
                ? (step.row ?? Math.max(0, (step.amount ?? 1) - 1))
                : (step.column ?? Math.max(0, (step.amount ?? 1) - 1));

            session.nullifyBoardLane({ axis, index });
            boardView.setNullifiedSlots(session.getNullifiedSlots());
            enemyView?.showIntentLabel(
                axis === 'row' ? `Null row ${index + 1}` : `Null col ${index + 1}`,
            );
            playSfx('enemy-move', { volume: 0.8 });
            onComplete();
        });

        return;
    }

    if (step.kind === 'redirect-hand')
    {
        enemyView?.playEnemyAttackPulse();

        scene.time.delayedCall(turnMs, () =>
        {
            const changed = session.applyHandRedirect();
            enemyView?.showIntentLabel(changed > 0 ? 'Hand twisted' : 'Twist queued');
            playSfx('enemy-move', { volume: 0.82, rate: 1.08 });
            onComplete();
        });

        return;
    }

    if (step.kind === 'battle-mod')
    {
        enemyView?.playEnemyAttackPulse();

        scene.time.delayedCall(turnMs, () =>
        {
            session.addBattleModifierFromEnemyStep(step);
            syncBattleModifierStatus();

            if (step.modifierStat !== undefined && step.modifierDelta !== undefined)
            {
                enemyView?.showIntentLabel(
                    describeBattleModifier(step.modifierStat, step.modifierDelta),
                );
            }

            playSfx('enemy-move', { volume: 0.76 });
            onComplete();
        });

        return;
    }

    if (step.kind === 'heal-ally' || step.kind === 'shield-ally')
    {
        const targetId = step.targetInstanceId;
        const targetView = targetId ? enemySquad.getView(targetId) : enemyView;

        enemyView?.playEnemyAttackPulse();

        scene.time.delayedCall(turnMs, () =>
        {
            if (!targetId)
            {
                onComplete();
                return;
            }

            if (step.kind === 'heal-ally')
            {
                const healed = session.resolveAllyHeal(step.amount ?? 0, targetId);
                targetView?.setHealth(healed);
                targetView?.showHealGain(step.amount ?? 0);
                playSfx('heal', { volume: 0.65 });
            }
            else
            {
                const shielded = session.resolveAllyShield(step.amount ?? 0, targetId);
                targetView?.setHealth(shielded);
                targetView?.showShieldGain(step.amount ?? 0);
                playSfx('shield', { volume: 0.68, rate: 0.92 });
            }

            enemySquad.syncFromSession(session);
            onComplete();
        });

        return;
    }

    if (step.kind === 'shield')
    {
        scene.time.delayedCall(turnMs / 2, () =>
        {
            const enemy = session.resolveEnemyShield(step.amount ?? 0, instanceId);

            enemyView?.setHealth(enemy);
            enemyView?.showShieldGain(step.amount ?? 0);
            playSfx('shield', { volume: 0.68, rate: 0.92 });
        });

        scene.time.delayedCall(turnMs, () =>
        {
            if (instanceId)
            {
                enemyView?.setHealth(session.getEnemy(instanceId));
            }

            onComplete();
        });

        return;
    }

    // Unknown step kinds must not stall the enemy phase (holds the attack lock).
    onComplete();
}
