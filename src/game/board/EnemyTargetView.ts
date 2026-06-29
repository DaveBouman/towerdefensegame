import type { EnemyState } from '../cardGame/domain/types';
import type { BoardLayout } from './boardLayout';

const ENEMY_COLOR = 0xe74c3c;

export class EnemyTargetView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly healthText: Phaser.GameObjects.Text;

    constructor (scene: Phaser.Scene, layout: BoardLayout, enemy: EnemyState)
    {
        const { enemyX, enemyY, enemySize } = layout;
        const container = scene.add.container(enemyX, enemyY);

        const outline = scene.add.rectangle(0, 0, enemySize, enemySize);

        outline.setOrigin(0, 0);
        outline.setStrokeStyle(2, ENEMY_COLOR, 0.7);
        outline.setFillStyle(ENEMY_COLOR, 0.12);

        const body = scene.add.rectangle(0, 0, enemySize, enemySize, ENEMY_COLOR);

        body.setOrigin(0, 0);

        const label = scene.add.text(enemySize / 2, enemySize + 14, 'Enemy', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#f5b7b1',
        }).setOrigin(0.5, 0);

        this.healthText = scene.add.text(enemySize / 2, -12, String(enemy.health), {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5, 1);

        container.add([ outline, body, label, this.healthText ]);
        this.container = container;
    }

    setHealth (enemy: EnemyState): void
    {
        this.healthText.setText(String(enemy.health));
    }

    destroy (): void
    {
        this.container.destroy();
    }
}
