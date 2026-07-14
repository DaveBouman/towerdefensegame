import type { PlayerState } from '../cardGame/domain/types';
import { CYBER } from '../config/cyberpunkTheme';
import { uiTextStyle } from '../config/uiTypography';
import { playFloatingText, playHitFlash as playHitFlashTween } from '../cardGame/presentation/visualEffects/visualEffectTweens';
import type { BoardLayout } from './boardLayout';

export class PlayerHealthView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly healthText: Phaser.GameObjects.Text;
    private readonly body: Phaser.GameObjects.Rectangle;
    private readonly healthBarFill: Phaser.GameObjects.Rectangle;
    private readonly healthBarWidth: number;
    private readonly healthBarHeight: number;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        player: PlayerState,
    )
    {
        const { playerX, playerY, playerSize } = layout;
        const container = scene.add.container(playerX, playerY);

        const outline = scene.add.rectangle(0, 0, playerSize, playerSize);

        outline.setOrigin(0, 0);
        outline.setStrokeStyle(2, CYBER.player, 0.75);
        outline.setFillStyle(CYBER.player, 0.1);

        const body = scene.add.rectangle(0, 0, playerSize, playerSize, CYBER.player);

        body.setOrigin(0, 0);

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

        this.healthText = scene.add.text(playerSize / 2, playerSize / 2 - 4, '', {
            ...uiTextStyle(20, '#ffffff', { bold: true }),
        }).setOrigin(0.5);

        const label = scene.add.text(playerSize / 2, playerSize + 14, 'You', {
            ...uiTextStyle(16, '#7af0ff'),
        }).setOrigin(0.5, 0);

        container.add([ outline, body, healthBarBg, this.healthBarFill, this.healthText, label ]);
        this.container = container;
        this.body = body;
        this.setHealth(player);
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
        this.healthBarFill.setScale(fraction, 1);
        this.healthBarFill.setVisible(player.health > 0);
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

    destroy (): void
    {
        this.container.destroy();
    }
}
