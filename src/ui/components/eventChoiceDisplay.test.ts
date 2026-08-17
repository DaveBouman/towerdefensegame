import { describe, expect, it } from 'vitest';
import { getRunEvent } from '../../game/run/runEvents';
import { buildChoiceFragments } from './eventChoiceDisplay';

describe('buildChoiceFragments', () =>
{
    it('formats action plus good and bad outcomes like Slay the Spire', () =>
    {
        const event = getRunEvent('cursed-idol');
        const claim = event.choices.find((choice) => choice.id === 'claim');

        expect(claim).toBeDefined();

        const fragments = buildChoiceFragments(claim!);

        expect(fragments[0]).toEqual({ text: '[Install the Chrome]', tone: 'action' });
        expect(fragments.some((fragment) => fragment.tone === 'good')).toBe(true);
        expect(fragments.some((fragment) => fragment.tone === 'bad')).toBe(true);
    });

    it('falls back to description when there are no concrete effects', () =>
    {
        const event = getRunEvent('healing-spring');
        const leave = event.choices.find((choice) => choice.id === 'leave');

        expect(buildChoiceFragments(leave!)).toEqual([
            { text: '[Keep Moving]', tone: 'action' },
            { text: ' Walk away.', tone: 'neutral' },
        ]);
    });
});
