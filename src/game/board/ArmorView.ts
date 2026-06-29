import type { BoardLayout } from './boardLayout';

const ARMOR_COLOR = 0x2ecc71;

export class ArmorView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly valueText: Phaser.GameObjects.Text;

    constructor (scene: Phaser.Scene, layout: BoardLayout, armor: number)
    {
        const { armorX, armorY } = layout;
        const container = scene.add.container(armorX, armorY);

        const badge = scene.add.rectangle(0, 0, 120, 36, 0x1a2e24);

        badge.setStrokeStyle(2, ARMOR_COLOR, 0.9);

        const label = scene.add.text(-52, 0, 'Armor', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#a8e6cf',
            fontStyle: 'bold',
        }).setOrigin(0, 0.5);

        this.valueText = scene.add.text(52, 0, String(armor), {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
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

    destroy (): void
    {
        this.container.destroy();
    }
}
