import { describe, expect, it } from 'vitest';
import { describeEnemyIntent } from './enemyTurn';

describe('describeEnemyIntent', () =>
{
    it('labels upcoming attack and shield intents', () =>
    {
        expect(describeEnemyIntent({ kind: 'attack', amount: 4 }, 'upcoming').title)
            .toBe('After round: Attack 4');
        expect(describeEnemyIntent({ kind: 'shield', amount: 5 }, 'upcoming').title)
            .toBe('After round: Shield +5');
    });

    it('labels executing intents', () =>
    {
        expect(describeEnemyIntent({ kind: 'attack', amount: 4 }, 'executing').title)
            .toBe('Attacking 4!');
        expect(describeEnemyIntent({ kind: 'shield', amount: 5 }, 'executing').title)
            .toBe('Shield +5!');
    });

    it('labels hazard placement intents', () =>
    {
        expect(describeEnemyIntent({ kind: 'place-hazard' }, 'upcoming').title)
            .toBe('After round: Place trap');
        expect(describeEnemyIntent({ kind: 'place-hazard' }, 'executing').title)
            .toBe('Placing trap!');
    });
});
