import { ENEMY_PASSIVE_ICON_ENTRIES } from '../../../../ui/icons/enemyPassiveIcons';

const PASSIVE_ICON_RASTER_SIZE = 48;

export const preloadEnemyPassiveIcons = (scene: Phaser.Scene): void =>
{
    for (const entry of ENEMY_PASSIVE_ICON_ENTRIES)
    {
        scene.load.svg(
            entry.textureKey,
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(entry.svg)}`,
            { width: PASSIVE_ICON_RASTER_SIZE, height: PASSIVE_ICON_RASTER_SIZE },
        );
    }
};
