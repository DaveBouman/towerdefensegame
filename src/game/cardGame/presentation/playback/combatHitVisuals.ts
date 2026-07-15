import type { CardGameSession } from '../../domain/CardGameSession';
import type { DamageResult } from '../../domain/types';
import type { ArmorView } from '../../../board/ArmorView';
import type { CardBoardView } from '../../../board/CardBoardView';
import type { EnemySquadView } from '../../../board/EnemySquadView';
import type { PlayerHealthView } from '../../../board/PlayerHealthView';
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
}

export function applyEnemyHitResult (deps: CombatHitVisualDeps, result: DamageResult): void
{
    const { scene, session, enemySquad, playerView, armorView, setDisplayedArmor } = deps;
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
    }

    if (result.healthDamage > 0)
    {
        enemyView?.playHitFlash();
        enemyView?.showDamageNumber(result.healthDamage);
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
        }

        if ((result.thornsHealthDamage ?? 0) > 0)
        {
            playerView.playHitFlash();
            playerView.showDamageNumber(result.thornsHealthDamage!);
        }
    }
}

export function applyPlayerDamage (deps: CombatHitVisualDeps, damage: number): void
{
    const { session, playerView, armorView, setDisplayedArmor } = deps;
    const result = session.resolveHazardDamage(damage);

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
}
