import { CYBER } from '../config/cyberpunkTheme';
import { drawCornerBrackets } from '../config/cyberpunkUiGraphics';
import { uiDisplayTextStyle, uiTextStyle } from '../config/uiTypography';
import type { BoardLayout } from './boardLayout';

export class ArmorView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly valueText: Phaser.GameObjects.Text;

    constructor (private readonly scene: Phaser.Scene, layout: BoardLayout, armor: number)
    {
        const { armorX, armorY } = layout;
        const container = scene.add.container(armorX, armorY);

        const badge = scene.add.rectangle(0, 0, 132, 40, CYBER.armorBg, 0.95);

        badge.setStrokeStyle(2, CYBER.armor, 0.9);

        const frame = scene.add.graphics();

        drawCornerBrackets(frame, -62, -16, 124, 32, CYBER.armor, { arm: 8, alpha: 0.85 });

        const label = scene.add.text(-56, 0, 'SHIELD', {
            ...uiTextStyle(14, '#b8ffe0', { bold: true }),
        }).setOrigin(0, 0.5);

        this.valueText = scene.add.text(56, 0, String(armor), {
            ...uiDisplayTextStyle(22, '#ffffff', { bold: true }),
        }).setOrigin(1, 0.5);

        container.add([ badge, frame, label, this.valueText ]);
        container.setVisible(armor > 0);
        this.container = container;
    }

    setArmor (armor: number): void
    {
        this.valueText.setText(String(armor));
        this.container.setVisible(armor > 0);
    }

    showShieldGain (amount: number): void
    {
        if (amount <= 0)
        {
            return;
        }

        const popup = this.scene.add.text(0, -28, `+${amount}`, {
            ...uiDisplayTextStyle(22, '#58d68d', { bold: true }),
        }).setOrigin(0.5, 1);

        this.container.add(popup);

        this.scene.tweens.add({
            targets: popup,
            y: -54,
            alpha: 0,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => popup.destroy(),
        });

        this.scene.tweens.killTweensOf(this.container);
        this.container.setScale(1);

        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 140,
            ease: 'Back.easeOut',
            yoyo: true,
        });
    }

    showShieldAbsorb (amount: number): void
    {
        if (amount <= 0)
        {
            return;
        }

        const popup = this.scene.add.text(0, -28, `-${amount}`, {
            ...uiDisplayTextStyle(20, '#b8ffe0', { bold: true }),
        }).setOrigin(0.5, 1);

        this.container.add(popup);

        this.scene.tweens.add({
            targets: popup,
            y: -52,
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
