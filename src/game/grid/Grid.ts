import { GRID_WORLD_OFFSET_Y } from '../config/worldLayout';
import type { GridConfig, GridPixelSize, GridPosition, WorldPosition } from './types';
import { tileCenterWorld } from './worldPosition';
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
            y: GRID_WORLD_OFFSET_Y + row * this.config.tileSize,
        };
    }

    toWorldCentered ({ col, row }: GridPosition, size: number): WorldPosition
    {
        const { x, y } = this.toWorld({ col, row });
        const inset = (this.config.tileSize - size) / 2;

        return { x: x + inset, y: y + inset };
    }

    toTileCenter (tile: GridPosition): WorldPosition
    {
        return tileCenterWorld(this.config, tile);
    }

    rangeToPixels (rangeInTiles: number): number
    {
        return rangeInTiles * this.config.tileSize;
    }

    toGrid (x: number, y: number): GridPosition | null
    {
        const localY = y - GRID_WORLD_OFFSET_Y;

        if (localY < 0)
        {
            return null;
        }

        const position = {
            col: Math.floor(x / this.config.tileSize),
            row: Math.floor(localY / this.config.tileSize),
        };

        return this.isInBounds(position) ? position : null;
    }

    draw (scene: Phaser.Scene, offsetX = 0, offsetY = GRID_WORLD_OFFSET_Y): GridView
    {
        return new GridView(scene, this.config, offsetX, offsetY);
    }
}
