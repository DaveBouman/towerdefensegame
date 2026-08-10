import { GAME_RULES } from '../config/cardRegistry';
import type { BattleModifier } from './battleModifiers';

const STEP = GAME_RULES.battleModifier?.step ?? 0.1;

/** Shared ±10% presets for enemy intents and run modifiers (ascension, etc.). */
export const BATTLE_MODIFIER_PRESETS: readonly Pick<BattleModifier, 'stat' | 'delta'>[] = [
    { stat: 'enemy-attack', delta: STEP },
    { stat: 'player-damage-taken', delta: STEP },
    { stat: 'player-armor', delta: -STEP },
    { stat: 'player-damage-dealt', delta: -STEP },
];
