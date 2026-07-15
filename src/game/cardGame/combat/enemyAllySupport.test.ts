import { describe, expect, it } from 'vitest';
import { getCardGameEnemyDefinitionOrThrow } from '../config/enemyCatalog';
import { createEnemyCombatant } from '../domain/enemyCombatants';
import {
    mergeAllyStepsIntoTurn,
    pickAllyTarget,
    planAllySupportSteps,
} from './enemyAllySupport';

describe('enemyAllySupport', () =>
{
    const raiderA = createEnemyCombatant('enemy-a', 'basic');
    const raiderB = createEnemyCombatant('enemy-b', 'basic');
    const fieldMedic = createEnemyCombatant('medic', 'field-medic');

    raiderA.state.health = 40;
    raiderB.state.health = 80;
    raiderB.state.shield = 6;

    it('picks the lowest-health other ally', () =>
    {
        const target = pickAllyTarget(fieldMedic.instanceId, [ fieldMedic, raiderA, raiderB ]);

        expect(target?.instanceId).toBe('enemy-a');
    });

    it('plans ally support steps when actions are configured', () =>
    {
        const steps = planAllySupportSteps(
            fieldMedic,
            [ fieldMedic, raiderA, raiderB ],
            getCardGameEnemyDefinitionOrThrow('field-medic').allyActions ?? [],
        );

        expect(steps.length).toBeGreaterThanOrEqual(1);
        expect(steps[0]?.kind).toBe('heal-ally');
        expect(steps[0]?.targetInstanceId).toBe('enemy-a');
    });

    it('inserts ally steps after the combat step', () =>
    {
        const merged = mergeAllyStepsIntoTurn(
            [
                { kind: 'attack', amount: 10 },
                { kind: 'place-hazard' },
            ],
            [
                { kind: 'heal-ally', amount: 12, targetInstanceId: 'enemy-a' },
            ],
        );

        expect(merged.map((step) => step.kind)).toEqual([
            'attack',
            'heal-ally',
            'place-hazard',
        ]);
    });

    it('returns no ally steps for solo enemies', () =>
    {
        const steps = planAllySupportSteps(
            fieldMedic,
            [ fieldMedic ],
            getCardGameEnemyDefinitionOrThrow('field-medic').allyActions ?? [],
        );

        expect(steps).toEqual([]);
    });
});
