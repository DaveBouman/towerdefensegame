import type { PlayerState } from '../cardGame/domain/types';
import type { CombatTraitConfig } from '../cardGame/combat/combatTraits/types';
import { drawAvatarDiamond, drawCornerBrackets } from '../config/cyberpunkUiGraphics';
import { CYBER } from '../config/cyberpunkTheme';
import { uiDisplayTextStyle, uiTextStyle } from '../config/uiTypography';
import { playFloatingText, playHitFlash as playHitFlashTween } from '../cardGame/presentation/visualEffects/visualEffectTweens';
import {
    COMBAT_TRAIT_ROW_BELOW_LABEL,
    CombatTraitRowView,
} from './CombatTraitRowView';
import type { BoardLayout } from './boardLayout';

export class PlayerHealthView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly healthText: Phaser.GameObjects.Text;
    private readonly body: Phaser.GameObjects.Rectangle;
    private readonly healthBarFill: Phaser.GameObjects.Rectangle;
    private readonly healthBarWidth: number;
    private readonly healthBarHeight: number;
    private readonly glowRing: Phaser.GameObjects.Rectangle;
    private readonly combatTraitRowView: CombatTraitRowView;
    private readonly playerSize: number;
    private idleTween?: Phaser.Tweens.Tween;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        player: PlayerState,
    )
    {
        const { playerX, playerY, playerSize } = layout;
        this.playerSize = playerSize;
        const container = scene.add.container(playerX, playerY);

        this.glowRing = scene.add.rectangle(
            playerSize / 2,
            playerSize / 2,
            playerSize + 18,
            playerSize + 18,
            0x000000,
            0,
        );
        this.glowRing.setStrokeStyle(3, CYBER.player, 0.45);

        const outline = scene.add.rectangle(0, 0, playerSize, playerSize);

        outline.setOrigin(0, 0);
        outline.setStrokeStyle(2, CYBER.player, 0.85);
        outline.setFillStyle(CYBER.player, 0.08);

        const body = scene.add.rectangle(0, 0, playerSize, playerSize, CYBER.player, 0.18);

        body.setOrigin(0, 0);

        const frame = scene.add.graphics();

        drawCornerBrackets(frame, 2, 2, playerSize - 4, playerSize - 4, CYBER.player, {
            arm: Math.round(playerSize * 0.16),
            alpha: 0.95,
        });

        const avatar = scene.add.graphics();

        drawAvatarDiamond(avatar, playerSize / 2, playerSize / 2 - 2, playerSize * 0.42, CYBER.player);

        const barInset = 10;
        this.healthBarHeight = 12;
        this.healthBarWidth = playerSize - barInset * 2;
        const barY = playerSize - barInset - this.healthBarHeight;

        const healthBarBg = scene.add.rectangle(
            barInset,
            barY,
            this.healthBarWidth,
            this.healthBarHeight,
            CYBER.playerBarBg,
            1,
        ).setOrigin(0, 0);

        this.healthBarFill = scene.add.rectangle(
            barInset,
            barY,
            this.healthBarWidth,
            this.healthBarHeight,
            CYBER.playerBarFill,
            1,
        ).setOrigin(0, 0);

        this.healthText = scene.add.text(playerSize / 2, playerSize / 2 - 2, '', {
            ...uiDisplayTextStyle(20, '#ffffff', { bold: true }),
        }).setOrigin(0.5);

        const label = scene.add.text(playerSize / 2, playerSize + 16, 'RUNNER', {
            ...uiDisplayTextStyle(14, '#7af0ff', { bold: true }),
        }).setOrigin(0.5, 0);

        this.combatTraitRowView = new CombatTraitRowView(
            scene,
            container,
            playerSize,
            playerSize + 16 + COMBAT_TRAIT_ROW_BELOW_LABEL,
        );

        container.add([
            this.glowRing,
            outline,
            body,
            frame,
            avatar,
            healthBarBg,
            this.healthBarFill,
            this.healthText,
            label,
        ]);
        this.container = container;
        this.body = body;
        this.setHealth(player);
        this.startIdlePulse();
    }

    setHealth (player: PlayerState): void
    {
        if (!this.container.active || !this.healthText.active)
        {
            return;
        }

        const fraction = player.maxHealth > 0
            ? Math.min(1, Math.max(0, player.health / player.maxHealth))
            : 0;

        this.healthText.setText(`${player.health}/${player.maxHealth}`);
        this.scene.tweens.add({
            targets: this.healthBarFill,
            scaleX: fraction,
            duration: 220,
            ease: 'Cubic.easeOut',
        });
        this.healthBarFill.setVisible(player.health > 0);

        const low = player.maxHealth > 0 && player.health / player.maxHealth <= 0.3;

        this.glowRing.setStrokeStyle(3, CYBER.player, low ? 0.85 : 0.45);
        this.body.setFillStyle(CYBER.player, low ? 0.32 : 0.18);
    }

    playHitFlash (): void
    {
        playHitFlashTween(this.scene, this.container, this.body, CYBER.player);
    }

    showDamageNumber (damage: number): void
    {
        if (damage <= 0)
        {
            return;
        }

        playFloatingText(
            this.scene,
            this.container,
            this.body.width / 2,
            -8,
            `-${damage}`,
            '#ff3b6b',
        );
    }

    setCombatTraits (traits: readonly CombatTraitConfig[]): void
    {
        this.combatTraitRowView.setTraits(traits);
    }

    destroy (): void
    {
        this.idleTween?.stop();
        this.combatTraitRowView.destroy();
        this.container.destroy();
    }

    private startIdlePulse (): void
    {
        this.idleTween = this.scene.tweens.add({
            targets: this.glowRing,
            scaleX: 1.04,
            scaleY: 1.04,
            alpha: 0.92,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }
}
