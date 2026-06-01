import type { GridConfig, GridPixelSize, GridPosition, WorldPosition } from './types';
import { worldLayoutFor, type WorldLayout } from '../config/worldLayout';
import { GridView } from './GridView';

export class Grid
{
    readonly config: GridConfig;
    readonly layout: WorldLayout;
    readonly size: GridPixelSize;

    constructor (config: GridConfig)
    {
        this.config = config;
        this.layout = worldLayoutFor(config);
        this.size = this.layout.playfieldPixelSize();
    }

    isInBounds ({ col, row }: GridPosition): boolean
    {
        return col >= 0 && col < this.config.cols && row >= 0 && row < this.config.rows;
    }

    toWorld (tile: GridPosition): WorldPosition
    {
        return this.layout.gridTileTopLeft(tile);
    }

    toWorldCentered ({ col, row }: GridPosition, size: number): WorldPosition
    {
        const { x, y } = this.toWorld({ col, row });
        const inset = (this.config.tileSize - size) / 2;

        return { x: x + inset, y: y + inset };
    }

    toTileCenter (tile: GridPosition): WorldPosition
    {
        return this.layout.gridTileCenter(tile);
    }

    rangeToPixels (rangeInTiles: number): number
    {
        return rangeInTiles * this.config.tileSize;
    }

    toGrid (x: number, y: number): GridPosition | null
    {
        return this.layout.worldToGrid({ x, y });
    }

    draw (scene: Phaser.Scene, offsetX = 0, offsetY = this.layout.playfieldOffsetY): GridView
    {
        return new GridView(scene, this.config, offsetX, offsetY);
    }
}
