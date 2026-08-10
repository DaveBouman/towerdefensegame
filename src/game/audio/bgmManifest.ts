import type { RunMapNodeKind } from '../run/nodeKinds';

/** Looping background tracks in `public/assets/music/`. */
export type BgmTrack =
    | 'glass-streets'
    | 'concrete-veins'
    | 'last-gatekeeper';

export const ALL_BGM_TRACKS: readonly BgmTrack[] = [
    'glass-streets',
    'concrete-veins',
    'last-gatekeeper',
];

export const BGM_FILES: Record<BgmTrack, string> = {
    'glass-streets': 'assets/music/glass-streets-at-midnight.mp3',
    'concrete-veins': 'assets/music/concrete-veins.mp3',
    'last-gatekeeper': 'assets/music/last-gatekeeper.mp3',
};

/** BGM files are tail-trimmed via `npm run trim-bgm` (see scripts/trim-bgm.mjs). */
export const BGM_LOOP_TRIM_SEC = 0;

/** Relative loudness vs SFX master (BGM sits under combat hits). */
export const BGM_LEVEL: Record<BgmTrack, number> = {
    'glass-streets': 0.52,
    'concrete-veins': 0.62,
    'last-gatekeeper': 0.68,
};

export interface RunBgmContext {
    phase: string;
    battleIntroKind: RunMapNodeKind | null;
    activeBattleKind: RunMapNodeKind | null;
}

/** Picks the loop for the current run screen. */
export const resolveRunBgmTrack = ({
    phase,
    battleIntroKind,
    activeBattleKind,
}: RunBgmContext): BgmTrack =>
{
    if (battleIntroKind === 'boss' || activeBattleKind === 'boss')
    {
        return 'last-gatekeeper';
    }

    if (phase === 'battle' || phase === 'puzzle' || battleIntroKind)
    {
        return 'concrete-veins';
    }

    return 'glass-streets';
};
