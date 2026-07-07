import { random } from '../random/rng';

/**
 * The kinds of node that can appear on the run map. `enemy` and `boss` are
 * battles; `shop` and `event` are non-battle stops (behavior TBD — placeholder
 * for now). New kinds can be added here plus a case in `App`'s node handling.
 */
export type RunMapNodeKind = 'enemy' | 'boss' | 'shop' | 'event';

export interface NodeKindInfo {
    label: string;
    /** Hover tooltip copy shown on the map. */
    tooltip: string;
    /** Whether picking this node starts a battle. */
    isBattle: boolean;
}

export const NODE_KIND_INFO: Record<RunMapNodeKind, NodeKindInfo> = {
    enemy: {
        label: 'Enemy',
        tooltip: 'A hostile foe. Defeat it to earn a card for your deck.',
        isBattle: true,
    },
    boss: {
        label: 'Boss',
        tooltip: 'The run\u2019s final warden. Defeat it to complete the run.',
        isBattle: true,
    },
    shop: {
        label: 'Shop',
        tooltip: 'Spend your spoils on cards and trinkets. (Coming soon)',
        isBattle: false,
    },
    event: {
        label: 'Random Event',
        tooltip: 'An uncertain encounter \u2014 fortune or peril awaits. (Coming soon)',
        isBattle: false,
    },
};

/** Relative frequency of each kind on non-fixed map columns. */
const NODE_KIND_WEIGHTS: readonly (readonly [RunMapNodeKind, number])[] = [
    [ 'enemy', 6 ],
    [ 'shop', 2 ],
    [ 'event', 2 ],
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
