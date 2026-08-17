import type { RunEventChoice, RunEventEffect } from '../../game/run/runEvents';

export type ChoiceFragmentTone = 'action' | 'good' | 'bad' | 'neutral';

export interface ChoiceTextFragment {
    text: string;
    tone: ChoiceFragmentTone;
}

const pushFragment = (fragments: ChoiceTextFragment[], text: string, tone: ChoiceFragmentTone): void =>
{
    if (!text)
    {
        return;
    }

    fragments.push({ text, tone });
};

const effectFragment = (effect: RunEventEffect): ChoiceTextFragment | null =>
{
    switch (effect.kind)
    {
        case 'heal':
            return { text: `Restore ${effect.amount} HP`, tone: 'good' };
        case 'damage':
            return { text: `Take ${effect.amount} damage`, tone: 'bad' };
        case 'gold':
            return { text: `Gain ${effect.amount} creds`, tone: 'good' };
        case 'lose-gold':
            return { text: `Lose ${effect.amount} creds`, tone: 'bad' };
        case 'add-card':
            return { text: 'Gain a card', tone: 'good' };
        case 'add-curse':
            return {
                text: effect.count > 1
                    ? `Add ${effect.count} curses`
                    : 'Add a curse to your deck',
                tone: 'bad',
            };
        case 'add-random-card':
            return { text: 'Gain a random card', tone: 'good' };
        case 'add-random-body-mod':
            return { text: 'Gain a body mod', tone: 'good' };
        case 'body-mod':
            return { text: 'Gain a body mod', tone: 'good' };
        case 'open-wheel':
            return { text: 'Spin the wheel', tone: 'neutral' };
        case 'open-icon-match':
            return { text: 'Play the sigil matcher', tone: 'neutral' };
        case 'open-puzzle':
        case 'open-random-puzzle':
            return { text: 'Enter the trial', tone: 'neutral' };
        default:
            return null;
    }
};

/** StS-style choice line: [Action] plus color-coded outcome fragments. */
export const buildChoiceFragments = (choice: RunEventChoice): ChoiceTextFragment[] =>
{
    const fragments: ChoiceTextFragment[] = [
        { text: `[${choice.label}]`, tone: 'action' },
    ];

    const outcomeFragments = choice.effects
        .map(effectFragment)
        .filter((fragment): fragment is ChoiceTextFragment => fragment !== null);

    if (outcomeFragments.length > 0)
    {
        outcomeFragments.forEach((fragment, index) =>
        {
            const prefix = index === 0 ? ' ' : '. ';

            pushFragment(fragments, `${prefix}${fragment.text}`, fragment.tone);
        });

        const last = fragments[fragments.length - 1];

        fragments[fragments.length - 1] = {
            ...last,
            text: `${last.text}.`,
        };

        return fragments;
    }

    if (choice.description)
    {
        pushFragment(fragments, ` ${choice.description}`, 'neutral');
    }

    return fragments;
};
