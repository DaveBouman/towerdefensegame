import type { CardGameSession } from '../../domain/CardGameSession';
import type { EnemyTurnStep } from '../../domain/types';
import type { CardBoardView } from '../../../board/CardBoardView';
import type { EnemySquadView } from '../../../board/EnemySquadView';
import type { EnemyTargetView } from '../../../board/EnemyTargetView';
import type { PlayerHealthView } from '../../../board/PlayerHealthView';
import type { ArmorView } from '../../../board/ArmorView';
import type { BattleModifierStatusView } from '../../../board/BattleModifierStatusView';
import { describeBattleModifier } from '../../combat/battleModifiers';

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
    } = deps;

    if (step.kind === 'attack')
    {
        enemyView?.playEnemyAttackPulse();

        scene.time.delayedCall(turnMs, () =>
        {
            const result = session.resolveEnemyAttack(step.amount ?? 0);
            playerView.setHealth(result.player);
            setDisplayedArmor(result.player.shield);

            if (result.shieldAbsorbed > 0)
            {
                armorView.showShieldAbsorb(result.shieldAbsorbed);
            }

            if (result.healthDamage > 0)
            {
                playerView.playHitFlash();
                playerView.showDamageNumber(result.healthDamage);
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
            }

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
            }
            else
            {
                const shielded = session.resolveAllyShield(step.amount ?? 0, targetId);
                targetView?.setHealth(shielded);
                targetView?.showShieldGain(step.amount ?? 0);
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
        });

        scene.time.delayedCall(turnMs, () =>
        {
            if (instanceId)
            {
                enemyView?.setHealth(session.getEnemy(instanceId));
            }

            onComplete();
        });
    }
}
