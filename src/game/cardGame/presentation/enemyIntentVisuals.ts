import { ENEMY_INTENT_TEXTURE_KEY } from '../../../ui/icons/enemyIntentIcons';
import { formatBattleModifierDelta, type BattleModifierStat } from '../combat/battleModifiers';
import type { EnemyTurnAction, EnemyTurnKind, EnemyTurnStep } from '../domain/types';

export interface EnemyIntentStepVisual {
    step: EnemyTurnStep;
    textureKey: string;
    tint: number;
    textColor: string;
    amountLabel?: string;
}

const INTENT_STYLE: Record<EnemyTurnKind, {
    upcoming: { tint: number; text: string };
    executing: { tint: number; text: string };
}> = {
    attack: {
        upcoming: { tint: 0xff9f43, text: '#ffb347' },
        executing: { tint: 0xff7675, text: '#ff8a84' },
    },
    shield: {
        upcoming: { tint: 0x5dade2, text: '#8ec8ff' },
        executing: { tint: 0xaed6f1, text: '#c8e6ff' },
    },
    'place-hazard': {
        upcoming: { tint: 0xff9f43, text: '#ffb347' },
        executing: { tint: 0xff6b6b, text: '#ff8a84' },
    },
    'dampen-field': {
        upcoming: { tint: 0x9b8cff, text: '#b7a9ff' },
        executing: { tint: 0x7d6cff, text: '#a89bff' },
    },
    'battle-mod': {
        upcoming: { tint: 0xfcee0a, text: '#fff9b0' },
        executing: { tint: 0xffd43b, text: '#ffe680' },
    },
    'heal-ally': {
        upcoming: { tint: 0x7af0c8, text: '#b8ffe8' },
        executing: { tint: 0x5ddeb8, text: '#9ef5d2' },
    },
    'shield-ally': {
        upcoming: { tint: 0x5dade2, text: '#8ec8ff' },
        executing: { tint: 0xaed6f1, text: '#c8e6ff' },
    },
};

const MOD_TEXTURE_BY_STAT: Record<BattleModifierStat, keyof typeof ENEMY_INTENT_TEXTURE_KEY> = {
    'enemy-attack': 'attack',
    'player-damage-taken': 'place-hazard',
    'player-armor': 'shield',
    'player-damage-dealt': 'dampen-field',
};

/** Distinct palette per stat so applied chips read as “what” at a glance. */
const ACTIVE_MOD_STYLE: Record<BattleModifierStat, { tint: number; text: string }> = {
    'enemy-attack': { tint: 0xff9f43, text: '#ffb347' },
    'player-damage-taken': { tint: 0xff6b6b, text: '#ff8a84' },
    'player-armor': { tint: 0x5dade2, text: '#8ec8ff' },
    'player-damage-dealt': { tint: 0x00e8ff, text: '#7af0ff' },
};

/** Active / telegraphed battle-modifier visuals — color encodes the affected stat. */
export const getActiveBattleModifierVisual = (
    stat: BattleModifierStat,
): Pick<EnemyIntentStepVisual, 'textureKey' | 'tint' | 'textColor'> =>
{
    const style = ACTIVE_MOD_STYLE[stat];

    return {
        textureKey: ENEMY_INTENT_TEXTURE_KEY[MOD_TEXTURE_BY_STAT[stat]],
        tint: style.tint,
        textColor: style.text,
    };
};

export const getEnemyIntentStepVisuals = (
    action: EnemyTurnAction,
    phase: 'upcoming' | 'executing',
): EnemyIntentStepVisual[] =>
    action.steps.map((step) =>
    {
        if (step.kind === 'battle-mod')
        {
            const stat = step.modifierStat ?? 'enemy-attack';
            const delta = step.modifierDelta ?? 0;
            const visual = getActiveBattleModifierVisual(stat);

            return {
                step,
                textureKey: visual.textureKey,
                tint: visual.tint,
                textColor: visual.textColor,
                amountLabel: formatBattleModifierDelta(delta),
            };
        }

        const style = INTENT_STYLE[step.kind][phase];

        return {
            step,
            textureKey: ENEMY_INTENT_TEXTURE_KEY[step.kind],
            tint: style.tint,
            textColor: style.text,
            amountLabel: step.kind === 'place-hazard' || step.kind === 'dampen-field'
                ? undefined
                : step.kind === 'shield' || step.kind === 'shield-ally'
                    ? `+${step.amount ?? 0}`
                    : String(step.amount ?? 0),
        };
    });
