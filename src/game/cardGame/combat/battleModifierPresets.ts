import type { BattleModifier } from './battleModifiers';
import { BATTLE_MODIFIER_STEP } from './battleModifiers';

/** Shared ±10% presets for enemy intents and run modifiers (ascension, etc.). */
export const BATTLE_MODIFIER_PRESETS: readonly Pick<BattleModifier, 'stat' | 'delta'>[] = [
    { stat: 'enemy-attack', delta: BATTLE_MODIFIER_STEP },
    { stat: 'player-damage-taken', delta: BATTLE_MODIFIER_STEP },
    { stat: 'player-armor', delta: -BATTLE_MODIFIER_STEP },
    { stat: 'player-damage-dealt', delta: -BATTLE_MODIFIER_STEP },
];
