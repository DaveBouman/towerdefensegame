import { COMBAT_TRAIT_ICON_ENTRIES } from '../../../../ui/icons/combatTraitIcons';
import { ENEMY_INTENT_ICON_ENTRIES } from '../../../../ui/icons/enemyIntentIcons';
import { ENEMY_PASSIVE_ICON_ENTRIES } from '../../../../ui/icons/enemyPassiveIcons';
import { CARD_BEHAVIOR_ICON_ENTRIES } from '../../../../ui/icons/cardBehaviorIcons';
import { DIRECTION_ICON_ENTRIES } from '../../../../ui/icons/directionIcons';
import { CARD_FRONT_ART_ENTRIES } from '../../../cards/cardVisuals';

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
            reject(new Error(`Failed to load game icon: ${key} (${url})`));
        };

        image.src = url;
    });

const GAME_ICON_ENTRIES = [
    ...COMBAT_TRAIT_ICON_ENTRIES,
    ...ENEMY_PASSIVE_ICON_ENTRIES,
    ...ENEMY_INTENT_ICON_ENTRIES,
    ...CARD_BEHAVIOR_ICON_ENTRIES,
    ...DIRECTION_ICON_ENTRIES,
    { textureKey: 'card-back', url: '/assets/cards/card-back.png' },
    { textureKey: 'card-back-cyber-node', url: '/assets/cards/card-back-cyber-node.png' },
    { textureKey: 'card-back-cyber-signal', url: '/assets/cards/card-back-cyber-signal.png' },
    ...CARD_FRONT_ART_ENTRIES,
];

/** Registers Craftpix UI icon textures for combat panels and cards. */
export const preloadGameIcons = async (scene: Phaser.Scene): Promise<void> =>
{
    await Promise.all(GAME_ICON_ENTRIES.map((entry) =>
        loadImageTexture(scene, entry.textureKey, entry.url).catch((error) =>
        {
            console.warn(error);
        }),
    )    );
};

