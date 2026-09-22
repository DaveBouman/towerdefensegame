import type { AttackSequence, SlotPosition } from '../cardGame/domain/types';

/** How a puzzle is cleared — prefer spatial/logical over pure DPS. */
export type PuzzleWinRule =
    | { kind: 'damage'; target: number }
    | { kind: 'visitTiles'; tiles: readonly SlotPosition[] }
    | { kind: 'minLength'; length: number }
    /** Unique board tiles the chain must visit (Loop Hero coverage). */
    | { kind: 'minCoverage'; tiles: number }
    | { kind: 'useAllCards'; /** Multiset of definition ids that must each appear in the chain. */ cards: readonly string[] };

export const formatPuzzleGoal = (win: PuzzleWinRule): string =>
{
    switch (win.kind)
    {
        case 'damage':
            return `Score at least ${win.target} damage with one chain (layout is the puzzle).`;
        case 'visitTiles':
            return `Walk the amber road (${win.tiles.length} tiles).`;
        case 'minLength':
            return `Build a chain at least ${win.length} steps long.`;
        case 'minCoverage':
            return `Walk at least ${win.tiles} different tiles in one chain.`;
        case 'useAllCards':
            return `Pack every piece onto the road — all ${win.cards.length} must fire.`;
        default:
            return 'Solve the chain.';
    }
};

export const formatPuzzleFailHint = (win: PuzzleWinRule): string =>
{
    switch (win.kind)
    {
        case 'damage':
            return 'Wrong layout — rearrange arrows and try again.';
        case 'visitTiles':
            return 'Missed a required tile — re-route the chain.';
        case 'minLength':
            return 'Chain too short — pack a longer path or loops.';
        case 'minCoverage':
            return 'Not enough tiles visited — sprawl the path across the board.';
        case 'useAllCards':
            return 'Not every piece fired — pack and link the whole kit.';
        default:
            return 'Wrong layout — rearrange and try again.';
    }
};

const tileKey = (slot: SlotPosition): string => `${slot.row},${slot.col}`;

const countIds = (ids: readonly string[]): Map<string, number> =>
{
    const counts = new Map<string, number>();

    for (const id of ids)
    {
        counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return counts;
};

const damageFromSequence = (sequence: AttackSequence): number =>
    sequence.totalDamage + sequence.offChainDamage + sequence.abilityEnemyDamage;

export const evaluatePuzzleWin = (
    win: PuzzleWinRule,
    sequence: AttackSequence,
): { success: boolean; damageDealt: number } =>
{
    const damageDealt = damageFromSequence(sequence);

    switch (win.kind)
    {
        case 'damage':
            return { success: damageDealt >= win.target, damageDealt };
        case 'visitTiles':
        {
            const visited = new Set(sequence.chain.map((step) => tileKey(step.slot)));
            const success = win.tiles.every((tile) => visited.has(tileKey(tile)));

            return { success, damageDealt };
        }
        case 'minLength':
            return { success: sequence.chain.length >= win.length, damageDealt };
        case 'minCoverage':
        {
            const unique = new Set(sequence.chain.map((step) => tileKey(step.slot)));

            return { success: unique.size >= win.tiles, damageDealt };
        }
        case 'useAllCards':
        {
            const needed = countIds(win.cards);
            const got = countIds(sequence.chain.map((step) => step.definitionId));
            let success = true;

            for (const [ id, count ] of needed)
            {
                if ((got.get(id) ?? 0) < count)
                {
                    success = false;
                    break;
                }
            }

            return { success, damageDealt };
        }
        default:
            return { success: false, damageDealt };
    }
};

/** Numeric target for HUD / legacy payloads (0 when the win rule is not damage). */
export const damageTargetFromWin = (win: PuzzleWinRule): number =>
    win.kind === 'damage' ? win.target : 0;
