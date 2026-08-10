/** Persistent audio buses: master mute + master / music / SFX volumes. */

const MUTE_KEY = 'td-game-sfx-muted';
const MASTER_VOLUME_KEY = 'td-game-master-volume';
const SFX_VOLUME_KEY = 'td-game-sfx-volume';
const MUSIC_VOLUME_KEY = 'td-game-music-volume';

const DEFAULT_MASTER = 0.85;
const DEFAULT_BUS = 1;

export interface AudioSettings {
    muted: boolean;
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const readNumber = (key: string, fallback: number): number =>
{
    try
    {
        const raw = localStorage.getItem(key);

        if (raw === null)
        {
            return fallback;
        }

        const parsed = Number(raw);

        return Number.isFinite(parsed) ? clamp01(parsed) : fallback;
    }
    catch
    {
        return fallback;
    }
};

const writeNumber = (key: string, value: number): void =>
{
    try
    {
        localStorage.setItem(key, String(clamp01(value)));
    }
    catch
    {
        /* ignore */
    }
};

/**
 * Reads stored volumes. Legacy installs only had `td-game-sfx-volume` as a single
 * master; treat that as master until an explicit master key is written.
 */
export const readAudioSettings = (): AudioSettings =>
{
    let muted = false;

    try
    {
        muted = localStorage.getItem(MUTE_KEY) === '1';
    }
    catch
    {
        muted = false;
    }

    let masterVolume = DEFAULT_MASTER;
    let sfxVolume = DEFAULT_BUS;
    let musicVolume = DEFAULT_BUS;

    try
    {
        const hasMaster = localStorage.getItem(MASTER_VOLUME_KEY) !== null;
        const legacyVolume = readNumber(SFX_VOLUME_KEY, DEFAULT_MASTER);

        if (hasMaster)
        {
            masterVolume = readNumber(MASTER_VOLUME_KEY, DEFAULT_MASTER);
            sfxVolume = readNumber(SFX_VOLUME_KEY, DEFAULT_BUS);
            musicVolume = readNumber(MUSIC_VOLUME_KEY, DEFAULT_BUS);
        }
        else
        {
            // Migrate: old single slider → master; buses stay full.
            masterVolume = legacyVolume;
            sfxVolume = DEFAULT_BUS;
            musicVolume = DEFAULT_BUS;
        }
    }
    catch
    {
        /* keep defaults */
    }

    return { muted, masterVolume, sfxVolume, musicVolume };
};

export const writeAudioMuted = (muted: boolean): void =>
{
    try
    {
        localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    }
    catch
    {
        /* ignore */
    }
};

export const writeMasterVolume = (volume: number): void =>
{
    writeNumber(MASTER_VOLUME_KEY, volume);
};

export const writeSfxVolume = (volume: number): void =>
{
    writeNumber(SFX_VOLUME_KEY, volume);
};

export const writeMusicVolume = (volume: number): void =>
{
    writeNumber(MUSIC_VOLUME_KEY, volume);
};

export const getEffectiveSfxGain = (settings: AudioSettings): number =>
{
    if (settings.muted)
    {
        return 0;
    }

    return settings.masterVolume * settings.sfxVolume;
};

export const getEffectiveMusicGain = (settings: AudioSettings): number =>
{
    if (settings.muted)
    {
        return 0;
    }

    return settings.masterVolume * settings.musicVolume;
};
