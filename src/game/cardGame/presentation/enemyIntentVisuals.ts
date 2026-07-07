import { ENEMY_INTENT_TEXTURE_KEY } from '../../../ui/icons/enemyIntentIcons';
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
};

export const getEnemyIntentStepVisuals = (
    action: EnemyTurnAction,
    phase: 'upcoming' | 'executing',
): EnemyIntentStepVisual[] =>
    action.steps.map((step) =>
    {
        const style = INTENT_STYLE[step.kind][phase];

        return {
            step,
            textureKey: ENEMY_INTENT_TEXTURE_KEY[step.kind],
            tint: style.tint,
            textColor: style.text,
            amountLabel: step.kind === 'place-hazard' || step.kind === 'dampen-field'
                ? undefined
                : step.kind === 'shield'
                    ? `+${step.amount ?? 0}`
                    : String(step.amount ?? 0),
        };
    });
