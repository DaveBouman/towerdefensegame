import type { EnemyPassiveId } from '../../game/cardGame/enemyPassives/types';

import thornsSvg from './000000/transparent/1x1/lorc/thorned-arrow.svg?raw';
import enrageSvg from './000000/transparent/1x1/delapouite/enrage.svg?raw';
import lastStandSvg from './000000/transparent/1x1/sbed/death-skull.svg?raw';
import smokeSvg from './000000/transparent/1x1/darkzaitzev/smoke-bomb.svg?raw';
import wetBlanketSvg from './000000/transparent/1x1/sbed/water-drop.svg?raw';
import silenceTileSvg from './000000/transparent/1x1/lorc/silence.svg?raw';
import loopHunterSvg from './000000/transparent/1x1/lorc/cycle.svg?raw';
import jammerSvg from './000000/transparent/1x1/delapouite/radio-tower.svg?raw';

/** Icons from https://game-icons.net (see src/ui/icons/license.txt). */
const toWhiteIconSvg = (svg: string): string =>
    svg
        .replace(/fill="#000"/gi, 'fill="#ffffff"')
        .replace(/fill="#000000"/gi, 'fill="#ffffff"');

export const ENEMY_PASSIVE_TEXTURE_KEY: Record<EnemyPassiveId, string> = {
    thorns: 'passive-icon-thorns',
    enrage: 'passive-icon-enrage',
    lastStand: 'passive-icon-last-stand',
    smoke: 'passive-icon-smoke',
    wetBlanket: 'passive-icon-wet-blanket',
    silenceTile: 'passive-icon-silence-tile',
    loopHunter: 'passive-icon-loop-hunter',
    jammer: 'passive-icon-jammer',
};

const ENEMY_PASSIVE_SVG_RAW: Record<EnemyPassiveId, string> = {
    thorns: toWhiteIconSvg(thornsSvg),
    enrage: toWhiteIconSvg(enrageSvg),
    lastStand: toWhiteIconSvg(lastStandSvg),
    smoke: toWhiteIconSvg(smokeSvg),
    wetBlanket: toWhiteIconSvg(wetBlanketSvg),
    silenceTile: toWhiteIconSvg(silenceTileSvg),
    loopHunter: toWhiteIconSvg(loopHunterSvg),
    jammer: toWhiteIconSvg(jammerSvg),
};

export const ENEMY_PASSIVE_ICON_ENTRIES = (Object.keys(ENEMY_PASSIVE_TEXTURE_KEY) as EnemyPassiveId[]).map((id) => ({
    id,
    textureKey: ENEMY_PASSIVE_TEXTURE_KEY[id],
    svg: ENEMY_PASSIVE_SVG_RAW[id],
}));
