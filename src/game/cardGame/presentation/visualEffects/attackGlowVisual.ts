const ATTACK_GLOW = 0xf39c12;

const GLOW_NAME = 'card-visual-glow';
const TWEEN_KEY = 'attackGlowTween';
const GLOW_DATA_KEY = 'card-visual-glow';

export const attackGlowVisual: import('./types').CardVisualEffect = {
    id: 'attack',
    activate (scene, target)
    {
        attackGlowVisual.deactivate(scene, target);

        const glow = scene.add.rectangle(
            target.width / 2,
            target.height / 2,
            target.width + 10,
            target.height + 10,
            ATTACK_GLOW,
            0.55,
        );

        glow.setStrokeStyle(3, 0xf1c40f, 1);
        glow.setName(GLOW_NAME);
        target.wrapper.addAt(glow, 0);
        target.wrapper.setData(GLOW_DATA_KEY, glow);
        scene.tweens.killTweensOf(target.wrapper);
        target.wrapper.setScale(1);

        const tween = scene.tweens.add({
            targets: target.wrapper,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 120,
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
