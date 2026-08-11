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
    spawnMinion: 'passive-icon-spawn-minion',
    shatterOnDeath: 'passive-icon-shatter',
    credLeech: 'passive-icon-cred-leech',
    rerollTax: 'passive-icon-reroll-tax',
    cardThief: 'passive-icon-card-thief',
    skillJam: 'passive-icon-skill-jam',
    linkRage: 'passive-icon-link-rage',
    bodyguard: 'passive-icon-bodyguard',
    stutterClock: 'passive-icon-stutter',
    phantomIntent: 'passive-icon-phantom',
    phaseShift: 'passive-icon-phase-shift',
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
    spawnMinion: 'escalate.png',
    shatterOnDeath: 'last-stand.png',
    credLeech: 'enrage.png',
    rerollTax: 'jammer.png',
    cardThief: 'curse-hand.png',
    skillJam: 'smoke.png',
    linkRage: 'enrage.png',
    bodyguard: 'wet-blanket.png',
    stutterClock: 'dampen.png',
    phantomIntent: 'silence.png',
    phaseShift: 'last-stand.png',
};

export const ENEMY_PASSIVE_ICON_ENTRIES = (Object.keys(ENEMY_PASSIVE_TEXTURE_KEY) as EnemyPassiveId[]).map((id) => ({
    id,
    textureKey: ENEMY_PASSIVE_TEXTURE_KEY[id],
    url: craftpixIconUrl(ENEMY_PASSIVE_ICON_FILE[id]),
}));
