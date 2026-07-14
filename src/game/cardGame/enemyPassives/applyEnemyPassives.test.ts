import { describe, expect, it } from 'vitest';
import { BoardModel, createEmptyBoard } from '../domain/BoardModel';
import { createCardInstance } from '../domain/createCardInstance';
import { GRID_CONFIG } from '../../config/gridConfig';
import { buildAttackSequence } from '../combat/AttackPipeline';
import { getDefaultCardGameEnemy } from '../config/enemyCatalog';
import { normalizeEnemyPassives } from './defaults';
import {
    applyEnemyPassivesToSequence,
    applyTileDampening,
    computeThornsReflectDamage,
    planEnemyTurnWithPassives,
    resolvePostAttackPassives,
} from './applyEnemyPassives';

describe('enemy passives', () =>
{
    it('reflects thorns damage whenever the player deals damage', () =>
    {
        const passives = normalizeEnemyPassives([ 'thorns' ]);

        expect(computeThornsReflectDamage(passives, 5)).toBe(2);
        expect(computeThornsReflectDamage(passives, 4)).toBe(2);
        expect(computeThornsReflectDamage(passives, 0)).toBe(0);
    });

    it('stores enrage stacks from undisarmed traps without re-exploding them', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));

        board.placeCard({ row: 0, col: 0 }, createCardInstance('attack', 'right'));
        board.placeCard({ row: 0, col: 1 }, createCardInstance('hazard', 'left', 'enemy'));
        board.placeCard({ row: 0, col: 2 }, createCardInstance('hazard', 'left', 'enemy'));

        const chain = buildAttackSequence([
            {
                slot: { row: 0, col: 0 },
                card: createCardInstance('attack', 'right'),
                definitionId: 'attack',
                behaviorId: 'attack',
                visualId: 'attack',
                arrow: 'right',
                exitArrow: 'right',
                damage: 5,
                armor: 0,
            },
        ], board).chain;

        const result = resolvePostAttackPassives(
            board,
            buildAttackSequence(chain, board),
            normalizeEnemyPassives([ 'enrage' ]),
        );

        expect(result.enrageStacks).toBe(2);
    });

    it('adds enrage bonuses to the next enemy turn plan', () =>
    {
        const enemy = {
            ...getDefaultCardGameEnemy(),
            attackChance: 1,
            passives: normalizeEnemyPassives([
                { id: 'enrage', attackBonusPerTrap: 2, extraTrapsPerTrap: 1 },
            ]),
        };

        const action = planEnemyTurnWithPassives({
            enemy,
            enemyState: { health: 80, maxHealth: 80, shield: 0 },
            enrageStacks: 2,
        });

        expect(action.steps[0]).toEqual({ kind: 'attack', amount: 17 });
        expect(action.steps.filter((step) => step.kind === 'place-hazard')).toHaveLength(3);
    });

    it('ramps escalate traps each turn and caps at the maximum', () =>
    {
        const enemy = {
            ...getDefaultCardGameEnemy(),
            attackChance: 1,
            passives: normalizeEnemyPassives([
                { id: 'escalate', trapsPerRamp: 1, maxTraps: 4 },
            ]),
        };

        const trapsAfter = (turnsTaken: number): number =>
            planEnemyTurnWithPassives({
                enemy,
                enemyState: { health: 80, maxHealth: 80, shield: 0 },
                enrageStacks: 0,
                turnsTaken,
            }).steps.filter((step) => step.kind === 'place-hazard').length;

        expect(trapsAfter(0)).toBe(1);
        expect(trapsAfter(1)).toBe(2);
        expect(trapsAfter(3)).toBe(4);
        expect(trapsAfter(10)).toBe(4);
    });

    it('casts the Dead Zone event on the configured cadence', () =>
    {
        const enemy = {
            ...getDefaultCardGameEnemy(),
            attackChance: 1,
            passives: normalizeEnemyPassives([
                { id: 'dampenTiles', parity: 'even', multiplier: 0.5, everyTurns: 2, duration: 1 },
            ]),
        };

        const castsOn = (turnsTaken: number): boolean =>
            planEnemyTurnWithPassives({
                enemy,
                enemyState: { health: 80, maxHealth: 80, shield: 0 },
                enrageStacks: 0,
                turnsTaken,
            }).steps.some((step) => step.kind === 'dampen-field');

        expect(castsOn(0)).toBe(true);
        expect(castsOn(1)).toBe(false);
        expect(castsOn(2)).toBe(true);
        expect(castsOn(3)).toBe(false);
    });

    it('halves damage and armor on dampened even tiles', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            {
                // (0,0): even tile -> dampened
                slot: { row: 0, col: 0 },
                card: createCardInstance('attack', 'right'),
                definitionId: 'attack',
                behaviorId: 'attack',
                visualId: 'attack',
                arrow: 'right' as const,
                exitArrow: 'right' as const,
                damage: 10,
                armor: 0,
            },
            {
                // (0,1): odd tile -> untouched
                slot: { row: 0, col: 1 },
                card: createCardInstance('defend', 'right'),
                definitionId: 'defend',
                behaviorId: 'defend',
                visualId: 'defend',
                arrow: 'right' as const,
                exitArrow: 'right' as const,
                damage: 0,
                armor: 8,
            },
            {
                // (0,2): even tile -> dampened
                slot: { row: 0, col: 2 },
                card: createCardInstance('defend', 'left'),
                definitionId: 'defend',
                behaviorId: 'defend',
                visualId: 'defend',
                arrow: 'left' as const,
                exitArrow: 'left' as const,
                damage: 0,
                armor: 8,
            },
        ];
        const raw = buildAttackSequence(chain, board);
        const adjusted = applyTileDampening(raw, { parity: 'even', multiplier: 0.5 });

        expect(raw.totalDamage).toBe(10);
        expect(adjusted.totalDamage).toBe(5);
        expect(adjusted.chain[0]!.damage).toBe(5);
        expect(adjusted.chain[1]!.armor).toBe(8);
        expect(adjusted.chain[2]!.armor).toBe(4);
    });

    it('suppresses the first poison trail from smoke', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            {
                slot: { row: 0, col: 0 },
                card: createCardInstance('poison', 'right'),
                definitionId: 'poison',
                behaviorId: 'poison',
                visualId: 'poison',
                arrow: 'right',
                exitArrow: 'right',
                damage: 0,
                armor: 0,
            },
            {
                slot: { row: 0, col: 1 },
                card: createCardInstance('defend', 'right'),
                definitionId: 'defend',
                behaviorId: 'defend',
                visualId: 'defend',
                arrow: 'right',
                exitArrow: 'right',
                damage: 0,
                armor: 3,
            },
        ];
        const raw = buildAttackSequence(chain, board);
        const adjusted = applyEnemyPassivesToSequence(
            raw,
            { health: 80, maxHealth: 80, shield: 0 },
            normalizeEnemyPassives([ 'smoke' ]),
        );

        expect(raw.abilityPoisonStacks).toBe(1);
        expect(adjusted.abilityPoisonStacks).toBe(0);
    });

    it('reduces fire alternation while the enemy is shielded', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = [
            {
                slot: { row: 0, col: 0 },
                card: createCardInstance('fire', 'right'),
                definitionId: 'fire',
                behaviorId: 'fire',
                visualId: 'fire',
                arrow: 'right',
                exitArrow: 'right',
                damage: 5,
                armor: 0,
            },
            {
                slot: { row: 0, col: 1 },
                card: createCardInstance('attack', 'right'),
                definitionId: 'attack',
                behaviorId: 'attack',
                visualId: 'attack',
                arrow: 'right',
                exitArrow: 'right',
                damage: 5,
                armor: 0,
            },
            {
                slot: { row: 0, col: 2 },
                card: createCardInstance('defend', 'left'),
                definitionId: 'defend',
                behaviorId: 'defend',
                visualId: 'defend',
                arrow: 'left',
                exitArrow: 'left',
                damage: 0,
                armor: 3,
            },
        ];
        const raw = buildAttackSequence(chain, board);
        const adjusted = applyEnemyPassivesToSequence(
            raw,
            { health: 80, maxHealth: 80, shield: 5 },
            normalizeEnemyPassives([ { id: 'wetBlanket', fireAlternationMultiplier: 0.5 } ]),
        );

        expect(raw.abilityEnemyDamage).toBe(3);
        expect(adjusted.abilityEnemyDamage).toBe(2);
    });

    it('rewards jammer and punishes loop hunter after the chain resolves', () =>
    {
        const board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        const chain = Array.from({ length: 6 }, (_, col) => ({
            slot: { row: 0, col },
            card: createCardInstance('attack', 'right'),
            definitionId: 'attack',
            behaviorId: 'attack',
            visualId: 'attack',
            arrow: 'right' as const,
            exitArrow: 'right' as const,
            damage: 1,
            armor: 0,
        }));

        const withLoop = [
            ...chain,
            {
                slot: { row: 0, col: 6 },
                card: createCardInstance('loop-reset', 'right', 'player', 'left'),
                definitionId: 'loop-reset',
                behaviorId: 'loop-reset',
                visualId: 'loop-reset',
                arrow: 'right' as const,
                exitArrow: 'left' as const,
                damage: 0,
                armor: 0,
            },
        ];

        const jammer = resolvePostAttackPassives(
            board,
            buildAttackSequence(chain, board),
            normalizeEnemyPassives([ 'jammer' ]),
        );
        const loopHunter = resolvePostAttackPassives(
            board,
            buildAttackSequence(withLoop, board),
            normalizeEnemyPassives([ 'loopHunter' ]),
        );

        expect(jammer.jammerShield).toBe(5);
        expect(loopHunter.loopHunterDamage).toBe(3);
    });
});
