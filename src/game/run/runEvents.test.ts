import { describe, expect, it } from 'vitest';
import { seedScope } from '../random/rng';
import {
    applyRunEventEffects,
    buildIconMatchGrid,
    getRunEvent,
    ICON_MATCH_ATTEMPTS,
    ICON_MATCH_GRID_SIZE,
    ICON_MATCH_PAIR_COUNT,
    resolveIconMatchResult,
    rollRunEventId,
    rollWheelSegment,
} from './runEvents';

describe('runEvents', () =>
{
    it('loads event definitions', () =>
    {
        expect(getRunEvent('wheel-of-fate').title).toBe('Fate Spinner');
        expect(getRunEvent('sign-matcher').title).toBe('Glyph Matcher');
        expect(getRunEvent('healing-spring').title).toBe('Stasis Patch');
        expect(getRunEvent('sign-matcher').choices).toHaveLength(1);
        expect(getRunEvent('healing-spring').choices).toHaveLength(2);
    });

    it('rolls events deterministically per node seed', () =>
    {
        seedScope('test-seed', 'event:n0-0');
        const first = rollRunEventId();

        seedScope('test-seed', 'event:n0-0');
        const second = rollRunEventId();

        seedScope('test-seed', 'event:n0-1');
        const otherNode = rollRunEventId();

        expect(first).toBe(second);
        expect(typeof first).toBe('string');
        expect(getRunEvent(first).id).toBe(first);
        expect(otherNode).toBeTruthy();
    });

    it('rolls wheel segments deterministically', () =>
    {
        seedScope('wheel-seed', 'event:n1-0:wheel');
        const a = rollWheelSegment().id;

        seedScope('wheel-seed', 'event:n1-0:wheel');
        const b = rollWheelSegment().id;

        expect(a).toBe(b);
    });

    it('builds a 4x4 icon match grid with eight pairs', () =>
    {
        seedScope('match-seed', 'event:n2-0:match');
        const grid = buildIconMatchGrid();

        expect(grid.tiles).toHaveLength(ICON_MATCH_GRID_SIZE);
        expect(ICON_MATCH_PAIR_COUNT).toBe(8);
        expect(ICON_MATCH_ATTEMPTS).toBe(4);

        const counts = new Map<string, number>();

        for (const icon of grid.tiles)
        {
            counts.set(icon, (counts.get(icon) ?? 0) + 1);
        }

        expect(counts.size).toBe(ICON_MATCH_PAIR_COUNT);

        for (const count of counts.values())
        {
            expect(count).toBe(2);
        }
    });

    it('rewards icon match results based on pairs matched', () =>
    {
        const whiff = resolveIconMatchResult(0, {
            playerHealth: 40,
            maxHealth: 80,
            gold: 20,
            deck: [],
            bodyMods: [],
        });

        expect(whiff.playerHealth).toBe(34);
        expect(whiff.messages[0]?.text).toContain('Matched 0');

        const solid = resolveIconMatchResult(3, {
            playerHealth: 40,
            maxHealth: 80,
            gold: 30,
            deck: [],
            bodyMods: [],
        });

        expect(solid.deck).toHaveLength(1);
        expect(solid.messages[0]?.text).toContain('Matched 3');
    });

    it('applies heal and gold effects', () =>
    {
        const result = applyRunEventEffects(
            [
                { kind: 'heal', amount: 10 },
                { kind: 'gold', amount: 15 },
            ],
            {
                playerHealth: 40,
                maxHealth: 80,
                gold: 5,
                deck: [],
                bodyMods: [],
            },
        );

        expect(result.playerHealth).toBe(50);
        expect(result.gold).toBe(20);
        expect(result.messages).toHaveLength(2);
    });

    it('lose-gold caps at current gold', () =>
    {
        const result = applyRunEventEffects(
            [
                { kind: 'heal', amount: 18 },
                { kind: 'lose-gold', amount: 18 },
            ],
            {
                playerHealth: 40,
                maxHealth: 80,
                gold: 7,
                deck: [],
                bodyMods: [],
            },
        );

        expect(result.playerHealth).toBe(58);
        expect(result.gold).toBe(0);
        expect(result.messages.some((message) => message.text.includes('all you had'))).toBe(true);
    });

    it('healing spring drink pairs heal with gold cost', () =>
    {
        const drink = getRunEvent('healing-spring').choices.find((choice) => choice.id === 'drink');

        expect(drink?.effects).toEqual([
            { kind: 'heal', amount: 18 },
            { kind: 'lose-gold', amount: 18 },
        ]);
    });
});
