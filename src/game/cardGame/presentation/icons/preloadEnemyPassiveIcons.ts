import { ENEMY_INTENT_ICON_ENTRIES } from '../../../../ui/icons/enemyIntentIcons';
import { ENEMY_PASSIVE_ICON_ENTRIES } from '../../../../ui/icons/enemyPassiveIcons';

const ICON_RASTER_SIZE = 48;

const rasterizeSvgToTexture = (
    scene: Phaser.Scene,
    key: string,
    svgText: string,
    size: number,
): Promise<void> =>
    new Promise((resolve, reject) =>
    {
        if (scene.textures.exists(key))
        {
            resolve();
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = doc.documentElement;

        svg.setAttribute('width', `${size}px`);
        svg.setAttribute('height', `${size}px`);

        const serialized = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([ serialized ], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () =>
        {
            scene.textures.addImage(key, image);
            URL.revokeObjectURL(url);
            resolve();
        };

        image.onerror = () =>
        {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to rasterize icon texture: ${key}`));
        };

        image.src = url;
    });

const GAME_ICON_ENTRIES = [
    ...ENEMY_PASSIVE_ICON_ENTRIES,
    ...ENEMY_INTENT_ICON_ENTRIES,
];

/** Registers UI icon textures without Phaser's XHR loader (data URIs break XHRLoader). */
export const preloadGameIcons = async (scene: Phaser.Scene): Promise<void> =>
{
    await Promise.all(GAME_ICON_ENTRIES.map((entry) =>
        rasterizeSvgToTexture(
            scene,
            entry.textureKey,
            entry.svg,
            ICON_RASTER_SIZE,
        ),
    ));
};

/** @deprecated Use preloadGameIcons */
export const preloadEnemyPassiveIcons = preloadGameIcons;
