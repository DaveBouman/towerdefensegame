/**
 * Run map: a left-to-right layered graph of battle nodes the player travels
 * through, picking one node per column (Slay-the-Spire-style branching path).
 */

import { rewardForNodeKind, type RunReward } from './rewards';
import { isBattleKind, rollNodeKind, type RunMapNodeKind } from './nodeKinds';
import { pickRandom, random } from '../random/rng';
import { STREET_ENEMY_POOLS } from './battleEncounterPools';
import {
    expandRolledEnemy,
    maybeAppendFieldMedic,
} from './battleEncounterRoll';
import { RUN_ECONOMY } from './config/runEconomy';

/** Path risk label — hot routes hit harder but pay bonus creds. */
export type RouteKind = 'standard' | 'hot' | 'safe';

export interface RunMapNode {
    id: string;
    /** Column index in the progression (0 = first choice). */
    row: number;
    /** Position of this node within its column. */
    col: number;
    /** Number of nodes in this node's column (for layout). */
    colCount: number;
    kind: RunMapNodeKind;
    /** Route risk for battle nodes — affects enemy HP and victory creds. */
    routeKind?: RouteKind;
    /** Seeded encounter for `event` nodes — shown on the map before you travel there. */
    eventId?: string;
    /** Enemy fought at this node (battle kinds only). */
    enemyId?: string;
    /** Multiple enemies for this node — overrides `enemyId` when set. */
    enemyIds?: string[];
    /** Reward granted for defeating this node's enemy (battle kinds only). */
    reward?: RunReward;
    /** Node ids reachable from this node in the next column. */
    nextIds: string[];
}

export const getBattleEnemyIds = (node: RunMapNode): string[] =>
{
    if (node.enemyIds && node.enemyIds.length > 0)
    {
        return [ ...node.enemyIds ];
    }

    return node.enemyId ? [ node.enemyId ] : [];
};

export interface RunMap {
    /** Number of columns in the map. */
    rows: number;
    nodes: RunMapNode[];
}

export const RUN_CONFIG = {
    /** Health restored after each victory (before carrying into the next fight). */
    healOnVictory: RUN_ECONOMY.run.healOnVictory,
    /** Map columns between the first fight and the boss (exclusive of both). */
    middleColumns: 9,
    /** Zero-based column index that always rolls a semi-boss fight (4th column). */
    semiBossRow: 3,
    /** Logical floors spanning the current single map (scaffolding for future multi-map floors). */
    floorCount: 3,
};

/**
 * Column ranges for each logical floor (inclusive).
 * Floor 1: open → semi-boss; Floor 2: mid; Floor 3: late → Warden.
 */
export const FLOOR_COLUMN_RANGES: readonly { floor: number; startCol: number; endCol: number }[] = [
    { floor: 1, startCol: 0, endCol: 3 },
    { floor: 2, startCol: 4, endCol: 7 },
    { floor: 3, startCol: 8, endCol: 10 },
];

/** 1-based floor index for a map column. */
export const getFloorForColumn = (column: number): number =>
{
    for (const range of FLOOR_COLUMN_RANGES)
    {
        if (column >= range.startCol && column <= range.endCol)
        {
            return range.floor;
        }
    }

    return RUN_CONFIG.floorCount;
};

/** Inclusive column range for a 1-based floor. */
export const getFloorColumnRange = (floor: number): { startCol: number; endCol: number } =>
{
    const range = FLOOR_COLUMN_RANGES.find((entry) => entry.floor === floor);

    if (!range)
    {
        throw new Error(`Unknown floor: ${floor}`);
    }

    return { startCol: range.startCol, endCol: range.endCol };
};

/** Elite enemies used for the fixed semi-boss column. */
const SEMI_BOSS_ENEMY_POOL: readonly string[] = [ 'smokebinder', 'saboteur' ];

/** Branching width per column (first → boss). */
const ROW_SIZES: readonly number[] = [ 2, 3, 3, 3, 4, 4, 4, 3, 3, 2, 1 ];

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

/** Maps an index in a row of size `from` onto the nearest index in a row of size `to`. */
export const projectIndex = (index: number, from: number, to: number): number =>
{
    if (from <= 1)
    {
        return Math.floor((to - 1) / 2);
    }

    return clamp(Math.round((index / (from - 1)) * (to - 1)), 0, to - 1);
};

/** Saboteur nodes always open adjacent routes on the next column (up and/or down). */
const connectSaboteurBranches = (
    node: RunMapNode,
    nodeIndex: number,
    current: RunMapNode[],
    next: RunMapNode[],
    connect: (from: RunMapNode, to: RunMapNode) => void,
    hasIncoming: Set<string>,
): void =>
{
    if (node.enemyId !== 'saboteur' || next.length <= 1)
    {
        return;
    }

    const targetIndex = projectIndex(nodeIndex, current.length, next.length);

    for (const offset of [ -1, 1 ])
    {
        const branchIndex = targetIndex + offset;

        if (branchIndex < 0 || branchIndex >= next.length)
        {
            continue;
        }

        const branch = next[branchIndex]!;
        connect(node, branch);
        hasIncoming.add(branch.id);
    }
};

const resolveNodeKind = (row: number, rows: number): RunMapNodeKind =>
{
    if (row === rows - 1)
    {
        return 'boss';
    }

    if (row === 0)
    {
        return 'enemy';
    }

    if (row === RUN_CONFIG.semiBossRow)
    {
        return 'semi-boss';
    }

    if (row === rows - 2)
    {
        return 'rest';
    }

    return rollNodeKind();
};

/** Resolves primary enemy + optional multi-enemy lineup for a battle node. */
const resolveBattleEnemies = (
    row: number,
    kind: RunMapNodeKind,
    routeKind: RouteKind = 'standard',
): { enemyId?: string; enemyIds?: string[] } =>
{
    if (!isBattleKind(kind))
    {
        return {};
    }

    if (row === 0)
    {
        return { enemyId: 'basic', enemyIds: [ 'basic', 'basic' ] };
    }

    let poolRow = row;

    if (routeKind === 'hot')
    {
        poolRow = Math.min(row + 1, STREET_ENEMY_POOLS.length - 2);
    }
    else if (routeKind === 'safe')
    {
        poolRow = Math.max(0, row - 1);
    }

    const enemyId = kind === 'semi-boss'
        ? pickRandom(SEMI_BOSS_ENEMY_POOL)
        : pickRandom(STREET_ENEMY_POOLS[poolRow] ?? STREET_ENEMY_POOLS[row] ?? STREET_ENEMY_POOLS[0]!);

    const expanded = expandRolledEnemy(enemyId);

    return maybeAppendFieldMedic(expanded, row, kind === 'enemy');
};

export const generateRunMap = (): RunMap =>
{
    const rows = RUN_CONFIG.middleColumns + 2;

    if (ROW_SIZES.length !== rows || STREET_ENEMY_POOLS.length !== rows)
    {
        throw new Error(`Run map config expects ${rows} columns (ROW_SIZES / STREET_ENEMY_POOLS mismatch).`);
    }

    const grid: RunMapNode[][] = ROW_SIZES.map((size, row) =>
        Array.from({ length: size }, (_unused, col) =>
        {
            const kind = resolveNodeKind(row, rows);
            const battle = isBattleKind(kind);
            const enemies = battle ? resolveBattleEnemies(row, kind) : {};

            return {
                id: `n${row}-${col}`,
                row,
                col,
                colCount: size,
                kind,
                routeKind: battle ? 'standard' : undefined,
                enemyId: enemies.enemyId,
                enemyIds: enemies.enemyIds,
                reward: battle ? rewardForNodeKind(kind) : undefined,
                nextIds: [] as string[],
            } satisfies RunMapNode;
        }),
    );

    const connect = (from: RunMapNode, to: RunMapNode): void =>
    {
        if (!from.nextIds.includes(to.id))
        {
            from.nextIds.push(to.id);
        }
    };

    for (let row = 0; row < rows - 1; row++)
    {
        const current = grid[row]!;
        const next = grid[row + 1]!;
        const hasIncoming = new Set<string>();

        current.forEach((node, index) =>
        {
            const targetIndex = projectIndex(index, current.length, next.length);
            const target = next[targetIndex]!;
            connect(node, target);
            hasIncoming.add(target.id);
            target.routeKind = target.routeKind ?? 'standard';

            // Saboteur nodes always branch up/down; others fork when the column is wide enough.
            if (next.length > 1)
            {
                if (node.enemyId === 'saboteur')
                {
                    connectSaboteurBranches(node, index, current, next, connect, hasIncoming);
                }
                else if (next.length >= 3 || random() < 0.55)
                {
                    const dir = random() < 0.5 ? -1 : 1;
                    const branchIndex = clamp(targetIndex + dir, 0, next.length - 1);
                    const branch = next[branchIndex]!;

                    if (branch.id !== target.id)
                    {
                        connect(node, branch);
                        hasIncoming.add(branch.id);
                        branch.routeKind = branchIndex < targetIndex ? 'safe' : 'hot';
                    }
                }
            }
        });

        // Guarantee every node in the next column is reachable.
        next.forEach((node, index) =>
        {
            if (hasIncoming.has(node.id))
            {
                return;
            }

            const sourceIndex = projectIndex(index, next.length, current.length);
            connect(current[sourceIndex]!, node);
        });
    }

    resolveAdjacentShopConflicts(grid);

    return { rows, nodes: grid.flat() };
};

/**
 * Converts destination Ripperdocs that sit on a shop→shop edge so the player
 * never travels from one Ripperdoc straight into another.
 */
const resolveAdjacentShopConflicts = (grid: RunMapNode[][]): void =>
{
    const byId = new Map(grid.flat().map((node) => [ node.id, node ]));

    for (const node of grid.flat())
    {
        if (node.kind !== 'shop')
        {
            continue;
        }

        for (const nextId of node.nextIds)
        {
            const next = byId.get(nextId);

            if (!next || next.kind !== 'shop')
            {
                continue;
            }

            convertShopNode(next);
        }
    }
};

/** Turns a Ripperdoc into a street fight or signal so adjacent-shop routes dissolve. */
const convertShopNode = (node: RunMapNode): void =>
{
    const kind: RunMapNodeKind = random() < 0.7 ? 'enemy' : 'event';
    node.kind = kind;

    if (kind === 'enemy')
    {
        const enemies = resolveBattleEnemies(node.row, kind, node.routeKind ?? 'standard');
        node.enemyId = enemies.enemyId;
        node.enemyIds = enemies.enemyIds;
        node.reward = rewardForNodeKind(kind);
        node.routeKind = node.routeKind ?? 'standard';
        return;
    }

    node.enemyId = undefined;
    node.enemyIds = undefined;
    node.reward = undefined;
    node.routeKind = undefined;
};

/** Returns the ids of nodes reachable given the last completed node (null = start). */
export const reachableNodeIds = (map: RunMap, currentNodeId: string | null): string[] =>
{
    if (currentNodeId === null)
    {
        return map.nodes.filter((node) => node.row === 0).map((node) => node.id);
    }

    const current = map.nodes.find((node) => node.id === currentNodeId);

    return current ? [ ...current.nextIds ] : [];
};

export const getNode = (map: RunMap, id: string): RunMapNode | undefined =>
    map.nodes.find((node) => node.id === id);
