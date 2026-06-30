import { uiTextStyle } from '../config/uiTypography';
import type { BoardLayout } from './boardLayout';

const ARMOR_COLOR = 0x2ecc71;

export class ArmorView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly valueText: Phaser.GameObjects.Text;

    constructor (private readonly scene: Phaser.Scene, layout: BoardLayout, armor: number)
    {
        const { armorX, armorY } = layout;
        const container = scene.add.container(armorX, armorY);

        const badge = scene.add.rectangle(0, 0, 120, 36, 0x1a2e24);

        badge.setStrokeStyle(2, ARMOR_COLOR, 0.9);

        const label = scene.add.text(-52, 0, 'Armor', {
            ...uiTextStyle(15, '#c8f5e0', { bold: true }),
        }).setOrigin(0, 0.5);

        this.valueText = scene.add.text(52, 0, String(armor), {
            ...uiTextStyle(20, '#ffffff', { bold: true }),
        }).setOrigin(1, 0.5);

        container.add([ badge, label, this.valueText ]);
        container.setVisible(armor > 0);
        this.container = container;
    }

    setArmor (armor: number): void
    {
        this.valueText.setText(String(armor));
        this.container.setVisible(armor > 0);
    }

    showShieldAbsorb (amount: number): void
    {
        if (amount <= 0)
        {
            return;
        }

        const popup = this.scene.add.text(0, -28, `-${amount}`, {
            ...uiTextStyle(20, '#c8f5e0', { bold: true }),
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
