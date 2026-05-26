export const canAddToScene = (scene: Phaser.Scene): boolean =>
{
    const sys = scene.sys as Phaser.Scenes.Systems & { displayList?: unknown };

    return Boolean(sys?.displayList && scene.scene.isActive());
};
