import type { CardGameSession } from '../../domain/CardGameSession';
import type { DamageResult } from '../../domain/types';
import type { ArmorView } from '../../../board/ArmorView';
import type { CardBoardView } from '../../../board/CardBoardView';
import type { EnemySquadView } from '../../../board/EnemySquadView';
import type { PlayerHealthView } from '../../../board/PlayerHealthView';
import {
    getDamageTierStyle,
    getElementHitColor,
    playElementHitBurst,
    shakeCamera,
} from '../combatJuice';
import { playCombatHitSfx, playPlayerHitSfx, playShieldAbsorbSfx } from '../../../audio/bindGameAudio';
import { playFloatingText } from '../visualEffects/visualEffectTweens';

export interface CombatHitVisualDeps
{
    scene: Phaser.Scene;
    session: CardGameSession;
    boardView: CardBoardView;
    enemySquad: EnemySquadView;
    playerView: PlayerHealthView;
    armorView: ArmorView;
    setDisplayedArmor: (armor: number) => void;
    requestHitstop?: (ms: number) => void;
}

export interface EnemyHitVisualContext
{
    visualId?: string;
    behaviorId?: string;
}

export function applyEnemyHitResult (
    deps: CombatHitVisualDeps,
    result: DamageResult,
    context: EnemyHitVisualContext = {},
): void
{
    const { scene, session, enemySquad, playerView, armorView, setDisplayedArmor, requestHitstop } = deps;
    const targetId = result.targetInstanceId ?? session.getAttackTargetId();
    const enemyView = targetId ? enemySquad.getView(targetId) : enemySquad.firstView;

    enemyView?.setHealth(result.enemy);
    enemySquad.syncFromSession(session);

    if (result.damageBlocked)
    {
        enemyView?.showHitBlocked();
    }

    if (result.shieldAbsorbed > 0)
    {
        enemyView?.showShieldAbsorb(result.shieldAbsorbed);
        playShieldAbsorbSfx();
    }

    if (result.healthDamage > 0)
    {
        const tier = getDamageTierStyle(result.healthDamage);

        enemyView?.playHitFlash();
        enemyView?.showDamageNumber(result.healthDamage, tier);
        shakeCamera(scene, tier.shakeIntensity);
        playCombatHitSfx(result);

        if (tier.hitstopMs > 0)
        {
            requestHitstop?.(tier.hitstopMs);
        }

        if (enemyView)
        {
            playElementHitBurst(
                scene,
                enemyView.container,
                enemyView.container.width / 2,
                enemyView.container.height * 0.35,
                getElementHitColor(context.visualId, context.behaviorId),
            );
        }
    }

    if (result.enemyKilled)
    {
        shakeCamera(scene, 0.014);
        requestHitstop?.(70);
    }

    if ((result.healOnKill ?? 0) > 0)
    {
        const player = session.getPlayer();

        playerView.setHealth(player);
        playFloatingText(
            scene,
            playerView.container,
            playerView.container.width / 2,
            -12,
            `+${result.healOnKill}`,
            '#58d68d',
        );
    }

    if ((result.thornsDamage ?? 0) > 0)
    {
        const player = session.getPlayer();
        playerView.setHealth(player);
        setDisplayedArmor(player.shield);

        if ((result.thornsShieldAbsorbed ?? 0) > 0)
        {
            armorView.showShieldAbsorb(result.thornsShieldAbsorbed!);
            playShieldAbsorbSfx();
        }

        if ((result.thornsHealthDamage ?? 0) > 0)
        {
            playerView.playHitFlash();
            playerView.showDamageNumber(result.thornsHealthDamage!);
            shakeCamera(scene, 0.006);
            playPlayerHitSfx(result.thornsHealthDamage!);
        }
    }
}

export function applyPlayerDamage (deps: CombatHitVisualDeps, damage: number): void
{
    const { scene, session, playerView, armorView, setDisplayedArmor, requestHitstop } = deps;
    const result = session.resolveHazardDamage(damage);

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
        shakeCamera(scene, tier.shakeIntensity * 1.2);
        playPlayerHitSfx(result.healthDamage);

        if (tier.hitstopMs > 0)
        {
            requestHitstop?.(tier.hitstopMs);
        }
    }
}
