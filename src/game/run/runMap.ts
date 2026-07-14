/**
 * Run map: a left-to-right layered graph of battle nodes the player travels
 * through, picking one node per column (Slay-the-Spire-style branching path).
 */

import { DEFAULT_CARD_REWARD, type RunReward } from './rewards';
import { isBattleKind, rollNodeKind, type RunMapNodeKind } from './nodeKinds';
import { rollRunEventIdExcluding } from './runEvents';
import { pickRandom, random } from '../random/rng';

export interface RunMapNode {
    id: string;
    /** Column index in the progression (0 = first choice). */
    row: number;
    /** Position of this node within its column. */
    col: number;
    /** Number of nodes in this node's column (for layout). */
    colCount: number;
    kind: RunMapNodeKind;
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
    healOnVictory: 12,
    /** Map columns between the first fight and the boss (exclusive of both). */
    middleColumns: 9,
    /** Zero-based column index that always rolls a semi-boss fight (4th column). */
    semiBossRow: 3,
};

/** Elite enemies used for the fixed semi-boss column. */
const SEMI_BOSS_ENEMY_POOL: readonly string[] = [ 'smokebinder', 'saboteur' ];

/** Enemy pools per column, ramping in difficulty. Last column is the boss. */
const ROW_ENEMY_POOLS: readonly (readonly string[])[] = [
    [ 'basic' ],
    [ 'basic', 'thornward' ],
    [ 'basic', 'thornward' ],
    [ 'thornward', 'saboteur' ],
    [ 'thornward', 'saboteur' ],
    [ 'saboteur', 'smokebinder' ],
    [ 'saboteur', 'smokebinder' ],
    [ 'saboteur', 'smokebinder' ],
    [ 'smokebinder' ],
    [ 'smokebinder' ],
    [ 'warden' ],
];

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

/** Assigns a distinct event id to each event node. */
export const assignEventIdsToNodes = (nodes: RunMapNode[]): void =>
{
    const byRow = new Map<number, RunMapNode[]>();

    for (const node of nodes)
    {
        if (node.kind !== 'event')
        {
            continue;
        }

        const rowNodes = byRow.get(node.row) ?? [];

        rowNodes.push(node);
        byRow.set(node.row, rowNodes);
    }

    for (const rowNodes of byRow.values())
    {
        rowNodes.sort((a, b) => a.col - b.col);
        const used = new Set<string>();

        for (const node of rowNodes)
        {
            node.eventId = rollRunEventIdExcluding(used);
            used.add(node.eventId);
        }
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

    return rollNodeKind();
};

export const generateRunMap = (): RunMap =>
{
    const rows = RUN_CONFIG.middleColumns + 2;

    if (ROW_SIZES.length !== rows || ROW_ENEMY_POOLS.length !== rows)
    {
        throw new Error(`Run map config expects ${rows} columns (ROW_SIZES / ROW_ENEMY_POOLS mismatch).`);
    }

    const grid: RunMapNode[][] = ROW_SIZES.map((size, row) =>
        Array.from({ length: size }, (_unused, col) =>
        {
            const kind = resolveNodeKind(row, rows);
            const battle = isBattleKind(kind);

            return {
                id: `n${row}-${col}`,
                row,
                col,
                colCount: size,
                kind,
                enemyId: battle
                    ? kind === 'semi-boss'
                        ? pickRandom(SEMI_BOSS_ENEMY_POOL)
                        : pickRandom(ROW_ENEMY_POOLS[row] ?? ROW_ENEMY_POOLS[0]!)
                    : undefined,
                enemyIds: battle && row === 0 ? [ 'basic', 'basic' ] : undefined,
                reward: battle ? { ...DEFAULT_CARD_REWARD } : undefined,
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

            // Saboteur nodes always branch up/down; others occasionally branch.
            if (next.length > 1)
            {
                if (node.enemyId === 'saboteur')
                {
                    connectSaboteurBranches(node, index, current, next, connect, hasIncoming);
                }
                else if (random() < 0.45)
                {
                    const dir = random() < 0.5 ? -1 : 1;
                    const branch = next[clamp(targetIndex + dir, 0, next.length - 1)]!;
                    connect(node, branch);
                    hasIncoming.add(branch.id);
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

    const nodes = grid.flat();

    assignEventIdsToNodes(nodes);

    return { rows, nodes };
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
