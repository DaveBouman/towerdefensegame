/** Load a URL or data URI into a Phaser texture (skips if the key already exists). */
export const loadImageTexture = (
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

        if (/^https?:/i.test(url))
        {
            image.crossOrigin = 'anonymous';
        }

        image.onload = () =>
        {
            scene.textures.addImage(key, image);
            resolve();
        };

        image.onerror = () =>
        {
            reject(new Error(`Failed to load texture: ${key}`));
        };

        image.src = url;
    });
