import { GAME_RULES } from '../../config/cardRegistry';
import { uiTextStyle } from '../../../config/uiTypography';
import { addCardOverlay, clearWrapperData } from './cardOverlay';

const BUFF_GLOW = 0xf1c40f;
const BUFF_STROKE = 0xffffff;

const GLOW_DATA_KEY = 'boosted-buff-glow';
const LABEL_DATA_KEY = 'boosted-buff-label';
const TWEEN_KEY = 'boostedBuffTween';

export const boostedBuffVisual: import('./types').CardVisualEffect = {
    id: 'boosted-buff',
    activate (scene, target)
    {
        boostedBuffVisual.deactivate(scene, target);

        const glow = addCardOverlay(
            scene,
            target,
            target.width + 20,
            target.height + 20,
            BUFF_GLOW,
            0.28,
            BUFF_STROKE,
            4,
        );

        glow.setName('boosted-buff-glow');
        target.wrapper.setData(GLOW_DATA_KEY, glow);

        const label = scene.add.text(
            target.width / 2,
            target.height * 0.18,
            `×${GAME_RULES.fieldBoost.nextStepMultiplier}`,
            {
                ...uiTextStyle(18, '#fff3c4', { bold: true, strokeColor: '#6b4a00' }),
            },
        ).setOrigin(0.5);

        target.wrapper.add(label);
        target.wrapper.setData(LABEL_DATA_KEY, label);

        const tween = scene.tweens.add({
            targets: [ glow, label ],
            alpha: { from: 0.65, to: 1 },
            duration: 220,
            yoyo: true,
            repeat: -1,
        });

        target.wrapper.setData(TWEEN_KEY, tween);

        return tween;
    },
    deactivate (scene, target)
    {
        const glow = target.wrapper.getData(GLOW_DATA_KEY) as Phaser.GameObjects.GameObject | undefined;
        const label = target.wrapper.getData(LABEL_DATA_KEY) as Phaser.GameObjects.GameObject | undefined;
        const tween = target.wrapper.getData(TWEEN_KEY) as Phaser.Tweens.Tween | undefined;

        glow?.destroy();
        label?.destroy();
        tween?.stop();
        clearWrapperData(target.wrapper, GLOW_DATA_KEY);
        clearWrapperData(target.wrapper, LABEL_DATA_KEY);
        clearWrapperData(target.wrapper, TWEEN_KEY);
        scene.tweens.killTweensOf(target.wrapper);
        target.wrapper.setScale(1);
    },
};
