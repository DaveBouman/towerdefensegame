import { describe, expect, it } from 'vitest';
import { getDefaultCardGameEnemy } from '../config/enemyCatalog';
import { describeEnemyIntent, planEnemyTurn } from './enemyTurn';

const basicEnemy = getDefaultCardGameEnemy();

describe('planEnemyTurn', () =>
{
    it('always includes one attack or shield and at least one trap', () =>
    {
        for (let i = 0; i < 30; i++)
        {
            const action = planEnemyTurn(basicEnemy);
            const combatSteps = action.steps.filter((step) => step.kind === 'attack' || step.kind === 'shield');
            const hazardSteps = action.steps.filter((step) => step.kind === 'place-hazard');

            expect(combatSteps).toHaveLength(1);
            expect(hazardSteps.length).toBeGreaterThanOrEqual(1);
            expect(action.enemyId).toBe('basic');
        }
    });
});

describe('describeEnemyIntent', () =>
{
    it('labels upcoming attack and shield intents with traps', () =>
    {
        expect(describeEnemyIntent({
            enemyId: 'basic',
            steps: [
                { kind: 'attack', amount: 8 },
                { kind: 'place-hazard' },
            ],
        }, 'upcoming').title)
            .toBe('After round: Attack 8 + Trap');
        expect(describeEnemyIntent({
            enemyId: 'basic',
            steps: [
                { kind: 'shield', amount: 10 },
                { kind: 'place-hazard' },
            ],
        }, 'upcoming').title)
            .toBe('After round: Shield +10 + Trap');
    });

    it('labels executing intents', () =>
    {
        expect(describeEnemyIntent({
            enemyId: 'basic',
            steps: [
                { kind: 'attack', amount: 8 },
                { kind: 'place-hazard' },
            ],
        }, 'executing').title)
            .toBe('Attack 8 + Trap!');
        expect(describeEnemyIntent({
            enemyId: 'basic',
            steps: [
                { kind: 'shield', amount: 10 },
                { kind: 'place-hazard' },
            ],
        }, 'executing').title)
            .toBe('Shield +10 + Trap!');
    });
});
