import { describe, expect, it } from 'vitest';
import { getDefaultCardGameEnemy } from '../config/enemyCatalog';
import { createEnemyCombatant } from '../domain/enemyCombatants';
import { normalizeEnemyPassives } from './defaults';
import {
    applyLinkRageToAllies,
    applyRerollTaxToCombatants,
    resolveBodyguardRedirect,
    shouldFleeThisTurn,
    shouldStealCardThisTurn,
    stealCredFromRun,
} from './interactionPassives';
import { planEnemyTurnWithPassives } from './applyEnemyPassives';

describe('interaction passives', () =>
{
    it('steals creds up to the run wallet', () =>
    {
        expect(stealCredFromRun(10, 0, 3)).toEqual({ goldStolen: 3, stolenThisTurn: 3 });
        expect(stealCredFromRun(5, 4, 3)).toEqual({ goldStolen: 5, stolenThisTurn: 1 });
    });

    it('redirects the first hit to a bodyguard', () =>
    {
        const striker = createEnemyCombatant('enemy-0', 'glass-striker');
        const guard = createEnemyCombatant('enemy-1', 'bulwark-runner');
        const first = resolveBodyguardRedirect(striker.instanceId, [ striker, guard ], false);
        const second = resolveBodyguardRedirect(striker.instanceId, [ striker, guard ], first.redirectUsed);

        expect(first.targetInstanceId).toBe(guard.instanceId);
        expect(first.redirectUsed).toBe(true);
        expect(second.targetInstanceId).toBe(striker.instanceId);
    });

    it('applies link rage and reroll tax bonuses to combatants', () =>
    {
        const twin = createEnemyCombatant('enemy-0', 'twin-clip');
        const toll = createEnemyCombatant('enemy-1', 'toll-bot');

        applyLinkRageToAllies([ twin ]);
        applyRerollTaxToCombatants([ toll ]);

        expect(twin.linkRageAttackBonus).toBe(6);
        expect(twin.pendingExtraTraps).toBe(1);
        expect(toll.rerollTaxAttackBonus).toBe(4);
        expect(toll.pendingExtraTraps).toBe(1);
    });

    it('tracks card thief steal and flee timing', () =>
    {
        const thiefPassive = normalizeEnemyPassives([ 'cardThief' ])[0] as Extract<
            ReturnType<typeof normalizeEnemyPassives>[number],
            { id: 'cardThief' }
        >;
        const thief = createEnemyCombatant('enemy-0', 'wire-thief');

        expect(shouldStealCardThisTurn(thief, thiefPassive)).toBe(false);

        thief.turnsTaken = 1;
        expect(shouldStealCardThisTurn(thief, thiefPassive)).toBe(true);

        thief.turnsTaken = 5;
        expect(shouldFleeThisTurn(thief, thiefPassive)).toBe(true);
    });

    it('duplicates combat on stutter cadence and adds phantom decoy', () =>
    {
        const stutterEnemy = {
            ...getDefaultCardGameEnemy(),
            attackChance: 1,
            passives: normalizeEnemyPassives([ { id: 'stutterClock', everyGlobalTurns: 2 } ]),
        };
        const phantomEnemy = {
            ...getDefaultCardGameEnemy(),
            attackChance: 0,
            passives: normalizeEnemyPassives([ 'phantomIntent' ]),
        };

        const stutterTurn = planEnemyTurnWithPassives({
            enemy: stutterEnemy,
            enemyState: { health: 40, maxHealth: 40, shield: 0 },
            enrageStacks: 0,
            globalEnemyTurns: 2,
        });
        const phantomTurn = planEnemyTurnWithPassives({
            enemy: phantomEnemy,
            enemyState: { health: 40, maxHealth: 40, shield: 0 },
            enrageStacks: 0,
        });

        const stutterCombat = stutterTurn.steps.filter(
            (step) => (step.kind === 'attack' || step.kind === 'shield') && !step.decoy,
        );
        const phantomCombat = phantomTurn.steps.filter(
            (step) => step.kind === 'attack' || step.kind === 'shield',
        );

        expect(stutterCombat).toHaveLength(2);
        expect(phantomCombat.some((step) => step.decoy)).toBe(true);
        expect(phantomCombat.some((step) => !step.decoy)).toBe(true);
    });
});
