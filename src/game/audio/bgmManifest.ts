import type { RunMapNodeKind } from '../run/nodeKinds';

/** Looping background tracks in `public/assets/music/`. */
export type BgmTrack =
    | 'glass-streets'
    | 'concrete-veins'
    | 'iron-gait'
    | 'last-gatekeeper';

export const ALL_BGM_TRACKS: readonly BgmTrack[] = [
    'glass-streets',
    'concrete-veins',
    'iron-gait',
    'last-gatekeeper',
];

export const BGM_FILES: Record<BgmTrack, string> = {
    'glass-streets': 'assets/music/glass-streets-at-midnight.mp3',
    'concrete-veins': 'assets/music/concrete-veins.mp3',
    'iron-gait': 'assets/music/iron-gait.mp3',
    'last-gatekeeper': 'assets/music/last-gatekeeper.mp3',
};

/** Standard combat / puzzle loops — alternate so map↔fight crossfades feel less samey. */
export const BATTLE_BGM_TRACKS: readonly BgmTrack[] = [
    'concrete-veins',
    'iron-gait',
];

/** BGM files are tail-trimmed via `npm run trim-bgm` (see scripts/trim-bgm.mjs). */
export const BGM_LOOP_TRIM_SEC = 0;

/** Relative loudness vs SFX master (BGM sits under combat hits). */
export const BGM_LEVEL: Record<BgmTrack, number> = {
    'glass-streets': 0.52,
    'concrete-veins': 0.62,
    'iron-gait': 0.6,
    'last-gatekeeper': 0.68,
};

export interface RunBgmContext {
    phase: string;
    battleIntroKind: RunMapNodeKind | null;
    activeBattleKind: RunMapNodeKind | null;
    /** Stable per fight — usually path length — so the track does not flip mid-battle. */
    battleMusicIndex?: number;
}

/** Picks the loop for the current run screen. */
export const resolveRunBgmTrack = ({
    phase,
    battleIntroKind,
    activeBattleKind,
    battleMusicIndex = 0,
}: RunBgmContext): BgmTrack =>
{
    if (battleIntroKind === 'boss' || activeBattleKind === 'boss')
    {
        return 'last-gatekeeper';
    }

    if (phase === 'battle' || phase === 'puzzle' || battleIntroKind)
    {
        const index = ((battleMusicIndex % BATTLE_BGM_TRACKS.length) + BATTLE_BGM_TRACKS.length)
            % BATTLE_BGM_TRACKS.length;

        return BATTLE_BGM_TRACKS[index]!;
    }

    return 'glass-streets';
};
