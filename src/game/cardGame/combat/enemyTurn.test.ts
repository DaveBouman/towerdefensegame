import { describe, expect, it } from 'vitest';
import { getDefaultCardGameEnemy } from '../config/enemyCatalog';
import { describeEnemyIntent, planEnemyTurn } from '../combat/enemyTurn';
import { normalizeEnemyPassives } from '../enemyPassives/defaults';

const basicEnemy = getDefaultCardGameEnemy();

describe('planEnemyTurn', () =>
{
    it('always includes one attack or shield and at least one trap', () =>
    {
        for (let i = 0; i < 30; i++)
        {
            const action = planEnemyTurn({
                enemy: basicEnemy,
                enemyState: { health: 80, maxHealth: 80, shield: 0 },
                enrageStacks: 0,
            });
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
    });
});

describe('enemyCatalog passives', () =>
{
    it('merges passive overrides with defaults', () =>
    {
        const passives = normalizeEnemyPassives([
            { id: 'thorns', reflectDamage: 4 },
            'jammer',
        ]);

        expect(passives[0]).toEqual({ id: 'thorns', reflectDamage: 4 });
        expect(passives[1]).toEqual({ id: 'jammer', minChainLength: 6, shieldGain: 5 });
    });
});
