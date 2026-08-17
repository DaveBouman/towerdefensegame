import { ENEMY_PORTRAIT_ENTRIES } from '../enemyIdentity';
import { loadImageTexture } from '../../../assets/loadImageTexture';

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
