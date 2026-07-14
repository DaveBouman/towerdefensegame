import { random } from '../random/rng';

/**
 * The kinds of node that can appear on the run map. `enemy` and `boss` are
 * battles; `shop` and `event` are non-battle stops (behavior TBD — placeholder
 * for now). New kinds can be added here plus a case in `App`'s node handling.
 */
export type RunMapNodeKind = 'enemy' | 'semi-boss' | 'boss' | 'shop' | 'event';

export interface NodeKindInfo {
    label: string;
    /** Hover tooltip copy shown on the map. */
    tooltip: string;
    /** Whether picking this node starts a battle. */
    isBattle: boolean;
}

export const NODE_KIND_INFO: Record<RunMapNodeKind, NodeKindInfo> = {
    enemy: {
        label: 'Hostile',
        tooltip: 'A street op. Flatline them to jack a card into your deck.',
        isBattle: true,
    },
    'semi-boss': {
        label: 'Lieutenant',
        tooltip: 'A district lieutenant. Tougher than street ops — flatline them for a card reward.',
        isBattle: true,
    },
    boss: {
        label: 'Warden',
        tooltip: 'The run\u2019s final warden. Take them down to clear the district.',
        isBattle: true,
    },
    shop: {
        label: 'Ripperdoc',
        tooltip: 'Spend creds on cards and body mods. (Coming soon)',
        isBattle: false,
    },
    event: {
        label: 'Signal',
        tooltip: 'A known encounter — glyph matcher, fate spinner, neural drill, stasis patches, black ICE, and more.',
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
