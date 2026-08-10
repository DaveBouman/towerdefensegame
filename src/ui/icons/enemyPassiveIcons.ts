import type { EnemyPassiveId } from '../../game/cardGame/enemyPassives/types';
import { craftpixIconUrl } from './craftpixIconUrl';

/** Phaser texture keys for enemy passive icons. */
export const ENEMY_PASSIVE_TEXTURE_KEY: Record<EnemyPassiveId, string> = {
    thorns: 'passive-icon-thorns',
    enrage: 'passive-icon-enrage',
    lastStand: 'passive-icon-last-stand',
    smoke: 'passive-icon-smoke',
    wetBlanket: 'passive-icon-wet-blanket',
    silenceTile: 'passive-icon-silence-tile',
    loopHunter: 'passive-icon-loop-hunter',
    jammer: 'passive-icon-jammer',
    escalate: 'passive-icon-escalate',
    dampenTiles: 'passive-icon-dampen-tiles',
    curseHand: 'passive-icon-curse-hand',
    pressureColumn: 'passive-icon-pressure-column',
};

const ENEMY_PASSIVE_ICON_FILE: Record<EnemyPassiveId, string> = {
    thorns: 'thorns.png',
    enrage: 'enrage.png',
    lastStand: 'last-stand.png',
    smoke: 'smoke.png',
    wetBlanket: 'wet-blanket.png',
    silenceTile: 'silence.png',
    loopHunter: 'loop-hunter.png',
    jammer: 'jammer.png',
    escalate: 'escalate.png',
    dampenTiles: 'dampen.png',
    curseHand: 'curse-hand.png',
    pressureColumn: 'pressure-column.png',
};

export const ENEMY_PASSIVE_ICON_ENTRIES = (Object.keys(ENEMY_PASSIVE_TEXTURE_KEY) as EnemyPassiveId[]).map((id) => ({
    id,
    textureKey: ENEMY_PASSIVE_TEXTURE_KEY[id],
    url: craftpixIconUrl(ENEMY_PASSIVE_ICON_FILE[id]),
}));
