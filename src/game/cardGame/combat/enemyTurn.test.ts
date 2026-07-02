import { describe, expect, it } from 'vitest';
import { getEnemyIntentStepVisuals } from '../presentation/enemyIntentVisuals';
import { ENEMY_INTENT_TEXTURE_KEY } from '../../../ui/icons/enemyIntentIcons';
import { planEnemyTurn } from './enemyTurn';
import { getDefaultCardGameEnemy } from '../config/enemyCatalog';
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

describe('getEnemyIntentStepVisuals', () =>
{
    it('maps attack and trap steps to icon textures with damage labels', () =>
    {
        const visuals = getEnemyIntentStepVisuals({
            enemyId: 'basic',
            steps: [
                { kind: 'attack', amount: 8 },
                { kind: 'place-hazard' },
            ],
        }, 'upcoming');

        expect(visuals).toHaveLength(2);
        expect(visuals[0]).toMatchObject({
            textureKey: ENEMY_INTENT_TEXTURE_KEY.attack,
            amountLabel: '8',
        });
        expect(visuals[1]).toMatchObject({
            textureKey: ENEMY_INTENT_TEXTURE_KEY['place-hazard'],
            amountLabel: undefined,
        });
    });

    it('maps shield steps to a plus-prefixed amount label', () =>
    {
        const visuals = getEnemyIntentStepVisuals({
            enemyId: 'basic',
            steps: [
                { kind: 'shield', amount: 10 },
                { kind: 'place-hazard' },
            ],
        }, 'executing');

        expect(visuals[0]?.amountLabel).toBe('+10');
        expect(visuals[0]?.textureKey).toBe(ENEMY_INTENT_TEXTURE_KEY.shield);
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
