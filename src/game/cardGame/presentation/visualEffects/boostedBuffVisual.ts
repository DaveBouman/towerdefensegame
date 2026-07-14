import { CYBER } from '../../../config/cyberpunkTheme';
import { GAME_RULES } from '../../config/cardRegistry';
import { uiTextStyle } from '../../../config/uiTypography';
import { addCardOverlay, clearWrapperData } from './cardOverlay';
import { playCardGlowPulse, resetCardGlowPulse } from './visualEffectTweens';

const GLOW_DATA_KEY = 'boosted-buff-glow';
const LABEL_DATA_KEY = 'boosted-buff-label';
const TWEEN_KEY = 'boostedBuffTween';
const OVERLAY_TWEEN_KEY = 'boostedBuffOverlayTween';

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
            CYBER.buffGlow,
            0.3,
            CYBER.buffStroke,
            4,
        );

        glow.setName('boosted-buff-glow');
        target.wrapper.setData(GLOW_DATA_KEY, glow);

        const label = scene.add.text(
            target.width / 2,
            target.height * 0.18,
            `×${GAME_RULES.fieldBoost.nextStepMultiplier}`,
            {
                ...uiTextStyle(18, '#fcee0a', { bold: true, strokeColor: '#3a3000' }),
            },
        ).setOrigin(0.5);

        target.wrapper.add(label);
        target.wrapper.setData(LABEL_DATA_KEY, label);

        const { scaleTween, overlayTween } = playCardGlowPulse(scene, target.wrapper, glow, {
            scale: 1.04,
            duration: 300,
            width: target.width,
            height: target.height,
        });

        target.wrapper.setData(TWEEN_KEY, scaleTween);
        target.wrapper.setData(OVERLAY_TWEEN_KEY, overlayTween);

        return scaleTween;
    },
    deactivate (scene, target)
    {
        const glow = target.wrapper.getData(GLOW_DATA_KEY) as Phaser.GameObjects.GameObject | undefined;
        const label = target.wrapper.getData(LABEL_DATA_KEY) as Phaser.GameObjects.GameObject | undefined;
        const tween = target.wrapper.getData(TWEEN_KEY) as Phaser.Tweens.Tween | undefined;
        const overlayTween = target.wrapper.getData(OVERLAY_TWEEN_KEY) as Phaser.Tweens.Tween | undefined;

        glow?.destroy();
        label?.destroy();
        tween?.stop();
        overlayTween?.stop();
        clearWrapperData(target.wrapper, GLOW_DATA_KEY);
        clearWrapperData(target.wrapper, LABEL_DATA_KEY);
        clearWrapperData(target.wrapper, TWEEN_KEY);
        clearWrapperData(target.wrapper, OVERLAY_TWEEN_KEY);
        resetCardGlowPulse(target.wrapper);
    },
};
