import { GRID_CONFIG } from './config/gridConfig';

const TILE_EVEN = 0x1e1e32;
const TILE_ODD = 0x232342;
const TILE_BORDER = 0x3a3a5c;

export class GridView
{
    readonly container: Phaser.GameObjects.Container;

    constructor (scene: Phaser.Scene, config: typeof GRID_CONFIG, offsetX = 0, offsetY = 0)
    {
        const { cols, rows, tileSize } = config;

        this.container = scene.add.container(offsetX, offsetY);

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
            }
        }
    }

    destroy (): void
    {
        this.container.destroy();
    }
}
