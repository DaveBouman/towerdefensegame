import type { GridConfig } from './types';

const TILE_EVEN = 0x1e1e32;
const TILE_ODD = 0x232342;
const TILE_BORDER = 0x3a3a5c;

export class GridView
{
    readonly container: Phaser.GameObjects.Container;

    constructor (scene: Phaser.Scene, config: GridConfig, offsetX = 0, offsetY = 0)
    {
        const { cols, rows, tileSize } = config;
        const fontSize = Math.max(10, Math.floor(tileSize * 0.22));

        this.container = scene.add.container(offsetX, offsetY);
        this.container.setDepth(0);

        for (let row = 0; row < rows; row++)
        {
            for (let col = 0; col < cols; col++)
            {
                const x = col * tileSize + tileSize / 2;
                const y = row * tileSize + tileSize / 2;
                const fill = (col + row) % 2 === 0 ? TILE_EVEN : TILE_ODD;

                const tile = scene.add.rectangle(x, y, tileSize, tileSize, fill);

                tile.setOrigin(0.5);
                tile.setStrokeStyle(1, TILE_BORDER, 0.85);
                this.container.add(tile);

                const label = scene.add.text(x, y, `${col},${row}`, {
                    fontFamily: 'monospace',
                    fontSize: `${fontSize}px`,
                    color: '#8a8aa8',
                }).setOrigin(0.5);

                this.container.add(label);
            }
        }
    }

    destroy (): void
    {
        this.container.destroy();
    }
}
