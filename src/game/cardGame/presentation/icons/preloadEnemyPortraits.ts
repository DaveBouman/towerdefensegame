import { ENEMY_PORTRAIT_ENTRIES } from '../enemyIdentity';

const loadImageTexture = (
    scene: Phaser.Scene,
    key: string,
    url: string,
): Promise<void> =>
    new Promise((resolve, reject) =>
    {
        if (scene.textures.exists(key))
        {
            resolve();
            return;
        }

        const image = new Image();

        image.onload = () =>
        {
            scene.textures.addImage(key, image);
            resolve();
        };

        image.onerror = () =>
        {
            reject(new Error(`Failed to load enemy portrait: ${key} (${url})`));
        };

        image.src = url;
    });

/** Registers Craftpix enemy portrait textures for combat panels. */
export const preloadEnemyPortraits = async (scene: Phaser.Scene): Promise<void> =>
{
    await Promise.all(ENEMY_PORTRAIT_ENTRIES.map((entry) =>
        loadImageTexture(scene, entry.textureKey, entry.url).catch((error) =>
        {
            console.warn(error);
        }),
    ));
};
