/** Looping background tracks in `public/assets/music/`. */
export type BgmTrack =
    | 'glass-streets'
    | 'concrete-veins';

export const ALL_BGM_TRACKS: readonly BgmTrack[] = [
    'glass-streets',
    'concrete-veins',
];

export const BGM_FILES: Record<BgmTrack, string> = {
    'glass-streets': 'assets/music/glass-streets-at-midnight.mp3',
    'concrete-veins': 'assets/music/concrete-veins.mp3',
};

/** Relative loudness vs SFX master (BGM sits under combat hits). */
export const BGM_LEVEL: Record<BgmTrack, number> = {
    'glass-streets': 0.52,
    'concrete-veins': 0.62,
};
