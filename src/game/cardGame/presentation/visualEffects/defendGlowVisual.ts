const DEFEND_GLOW = 0x2ecc71;

const GLOW_NAME = 'card-visual-glow';
const TWEEN_KEY = 'defendGlowTween';
const GLOW_DATA_KEY = 'card-visual-glow';

export const defendGlowVisual: import('./types').CardVisualEffect = {
    id: 'defend',
    activate (scene, target)
    {
        defendGlowVisual.deactivate(scene, target);

        const glow = scene.add.rectangle(
            target.width / 2,
            target.height / 2,
            target.width + 10,
            target.height + 10,
            DEFEND_GLOW,
            0.45,
        );

        glow.setStrokeStyle(3, 0xa8e6cf, 1);
        glow.setName(GLOW_NAME);
        target.wrapper.addAt(glow, 0);
        target.wrapper.setData(GLOW_DATA_KEY, glow);
        scene.tweens.killTweensOf(target.wrapper);
        target.wrapper.setScale(1);

        const tween = scene.tweens.add({
            targets: target.wrapper,
            scaleX: 1.06,
            scaleY: 1.06,
            duration: 140,
            yoyo: true,
            repeat: -1,
        });

        target.wrapper.setData(TWEEN_KEY, tween);

        return tween;
    },
    deactivate (scene, target)
    {
        const glow = target.wrapper.getData(GLOW_DATA_KEY) as Phaser.GameObjects.GameObject | undefined;

        glow?.destroy();
        target.wrapper.removeData(GLOW_DATA_KEY);

        const tween = target.wrapper.getData(TWEEN_KEY) as Phaser.Tweens.Tween | undefined;

        tween?.stop();
        target.wrapper.removeData(TWEEN_KEY);

        scene.tweens.killTweensOf(target.wrapper);
        target.wrapper.setScale(1);
    },
};
