import type { GridConfig, GridPixelSize, GridPosition, WorldPosition } from './types';
import { GridView } from './GridView';

export class Grid
{
    readonly config: GridConfig;
    readonly size: GridPixelSize;

    constructor (config: GridConfig)
    {
        this.config = config;
        this.size = {
            width: config.cols * config.tileSize,
            height: config.rows * config.tileSize,
        };
    }

    isInBounds ({ col, row }: GridPosition): boolean
    {
        return col >= 0 && col < this.config.cols && row >= 0 && row < this.config.rows;
    }

    toWorld ({ col, row }: GridPosition): WorldPosition
    {
        return {
            x: col * this.config.tileSize,
            y: row * this.config.tileSize,
        };
    }

    toWorldCentered ({ col, row }: GridPosition, size: number): WorldPosition
    {
        const { x, y } = this.toWorld({ col, row });
        const inset = (this.config.tileSize - size) / 2;

        return { x: x + inset, y: y + inset };
    }

    toTileCenter ({ col, row }: GridPosition): WorldPosition
    {
        const half = this.config.tileSize / 2;

        return {
            x: col * this.config.tileSize + half,
            y: row * this.config.tileSize + half,
        };
    }

    rangeToPixels (rangeInTiles: number): number
    {
        return rangeInTiles * this.config.tileSize;
    }

    toGrid (x: number, y: number): GridPosition | null
    {
        const position = {
            col: Math.floor(x / this.config.tileSize),
            row: Math.floor(y / this.config.tileSize),
        };

        return this.isInBounds(position) ? position : null;
    }

    draw (scene: Phaser.Scene, offsetX = 0, offsetY = 0): GridView
    {
        return new GridView(scene, this.config, offsetX, offsetY);
    }
}
