/**
 * Run map: a left-to-right layered graph of battle nodes the player travels
 * through, picking one node per column (Slay-the-Spire-style branching path).
 */

import { DEFAULT_CARD_REWARD, type RunReward } from './rewards';
import { isBattleKind, rollNodeKind, type RunMapNodeKind } from './nodeKinds';
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
    /** Enemy fought at this node (battle kinds only). */
    enemyId?: string;
    /** Reward granted for defeating this node's enemy (battle kinds only). */
    reward?: RunReward;
    /** Node ids reachable from this node in the next column. */
    nextIds: string[];
}

export interface RunMap {
    /** Number of columns in the map. */
    rows: number;
    nodes: RunMapNode[];
}

export const RUN_CONFIG = {
    /** Health restored after each victory (before carrying into the next fight). */
    healOnVictory: 12,
};

/** Enemy pools per column, ramping in difficulty. Last column is the boss. */
const ROW_ENEMY_POOLS: readonly (readonly string[])[] = [
    [ 'basic' ],
    [ 'basic', 'thornward' ],
    [ 'thornward', 'saboteur' ],
    [ 'saboteur', 'smokebinder' ],
    [ 'warden' ],
];

const ROW_SIZES: readonly number[] = [ 2, 3, 3, 2, 1 ];

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

/** Maps an index in a row of size `from` onto the nearest index in a row of size `to`. */
const projectIndex = (index: number, from: number, to: number): number =>
{
    if (from <= 1)
    {
        return Math.floor((to - 1) / 2);
    }

    return clamp(Math.round((index / (from - 1)) * (to - 1)), 0, to - 1);
};

export const generateRunMap = (): RunMap =>
{
    const rows = ROW_SIZES.length;
    const grid: RunMapNode[][] = ROW_SIZES.map((size, row) =>
        Array.from({ length: size }, (_unused, col) =>
        {
            const kind: RunMapNodeKind = row === rows - 1
                ? 'boss'
                : row === 0
                    ? 'event'
                    : rollNodeKind();
            const battle = isBattleKind(kind);

            return {
                id: `n${row}-${col}`,
                row,
                col,
                colCount: size,
                kind,
                enemyId: battle
                    ? pickRandom(ROW_ENEMY_POOLS[row] ?? ROW_ENEMY_POOLS[0]!)
                    : undefined,
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

            // Occasionally branch to an adjacent node for divergent paths.
            if (random() < 0.45 && next.length > 1)
            {
                const dir = random() < 0.5 ? -1 : 1;
                const branch = next[clamp(targetIndex + dir, 0, next.length - 1)]!;
                connect(node, branch);
                hasIncoming.add(branch.id);
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

    return { rows, nodes: grid.flat() };
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
