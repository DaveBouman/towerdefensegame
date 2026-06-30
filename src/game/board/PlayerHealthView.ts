import type { PlayerState } from '../cardGame/domain/types';
import { uiTextStyle } from '../config/uiTypography';
import type { BoardLayout } from './boardLayout';

const PLAYER_COLOR = 0x3498db;
const PLAYER_BAR_BG = 0x152535;
const PLAYER_BAR_FILL = 0x5dade2;

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
        outline.setStrokeStyle(2, PLAYER_COLOR, 0.7);
        outline.setFillStyle(PLAYER_COLOR, 0.12);

        const body = scene.add.rectangle(0, 0, playerSize, playerSize, PLAYER_COLOR);

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
            PLAYER_BAR_BG,
            1,
        ).setOrigin(0, 0);

        this.healthBarFill = scene.add.rectangle(
            barInset,
            barY,
            this.healthBarWidth,
            this.healthBarHeight,
            PLAYER_BAR_FILL,
            1,
        ).setOrigin(0, 0);

        this.healthText = scene.add.text(playerSize / 2, playerSize / 2 - 4, '', {
            ...uiTextStyle(20, '#ffffff', { bold: true }),
        }).setOrigin(0.5);

        const label = scene.add.text(playerSize / 2, playerSize + 14, 'You', {
            ...uiTextStyle(16, '#c8e6ff'),
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
        this.scene.tweens.killTweensOf(this.container);
        this.container.setScale(1);
        this.body.setFillStyle(0xffffff, 0.95);

        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 100,
            yoyo: true,
            onComplete: () =>
            {
                this.body.setFillStyle(PLAYER_COLOR, 1);
            },
        });
    }

    showDamageNumber (damage: number): void
    {
        if (damage <= 0)
        {
            return;
        }

        const popup = this.scene.add.text(this.body.width / 2, -8, `-${damage}`, {
            ...uiTextStyle(24, '#ff8a84', { bold: true }),
        }).setOrigin(0.5, 1);

        this.container.add(popup);

        this.scene.tweens.add({
            targets: popup,
            y: -36,
            alpha: 0,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => popup.destroy(),
        });
    }

    destroy (): void
    {
        this.container.destroy();
    }
}
