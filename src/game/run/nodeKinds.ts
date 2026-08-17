import { nodeKindLabel, nodeKindTooltip } from '../copy/strings';
import { random } from '../random/rng';

/**
 * The kinds of node that can appear on the run map. `enemy` / `semi-boss` /
 * `boss` are battles; `shop`, `event`, and `rest` are non-battle stops.
 */
export type RunMapNodeKind = 'enemy' | 'semi-boss' | 'boss' | 'shop' | 'event' | 'rest';

export interface NodeKindInfo {
    label: string;
    /** Hover tooltip copy shown on the map. */
    tooltip: string;
    /** Whether picking this node starts a battle. */
    isBattle: boolean;
}

export const NODE_KIND_INFO: Record<RunMapNodeKind, NodeKindInfo> = {
    enemy: {
        label: nodeKindLabel('enemy'),
        tooltip: nodeKindTooltip('enemy'),
        isBattle: true,
    },
    'semi-boss': {
        label: nodeKindLabel('semi-boss'),
        tooltip: nodeKindTooltip('semi-boss'),
        isBattle: true,
    },
    boss: {
        label: nodeKindLabel('boss'),
        tooltip: nodeKindTooltip('boss'),
        isBattle: true,
    },
    shop: {
        label: nodeKindLabel('shop'),
        tooltip: nodeKindTooltip('shop'),
        isBattle: false,
    },
    event: {
        label: nodeKindLabel('event'),
        tooltip: nodeKindTooltip('event'),
        isBattle: false,
    },
    rest: {
        label: nodeKindLabel('rest'),
        tooltip: nodeKindTooltip('rest'),
        isBattle: false,
    },
};

/** Relative frequency of each kind on non-fixed map columns (70% / 20% / 10%). */
export const NODE_KIND_WEIGHTS: readonly (readonly [RunMapNodeKind, number])[] = [
    [ 'enemy', 7 ],
    [ 'event', 2 ],
    [ 'shop', 1 ],
];

export const isBattleKind = (kind: RunMapNodeKind): boolean =>
    NODE_KIND_INFO[kind].isBattle;

/** Picks a weighted-random non-boss node kind for a middle map column. */
export const rollNodeKind = (): RunMapNodeKind =>
{
    const total = NODE_KIND_WEIGHTS.reduce((sum, [ , weight ]) => sum + weight, 0);
    let roll = random() * total;

    for (const [ kind, weight ] of NODE_KIND_WEIGHTS)
    {
        if (roll < weight)
        {
            return kind;
        }

        roll -= weight;
    }

    return 'enemy';
};
