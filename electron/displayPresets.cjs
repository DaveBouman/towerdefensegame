/** Shared 16:9 window presets for the desktop shell (keep in sync with displaySettings.ts). */
const PRESETS = {
    adaptive: null,
    '960x540': { width: 960, height: 540 },
    '1280x720': { width: 1280, height: 720 },
    '1600x900': { width: 1600, height: 900 },
    '1920x1080': { width: 1920, height: 1080 },
    '2560x1440': { width: 2560, height: 1440 },
};

const MIN_WINDOW_WIDTH = 960;
const MIN_WINDOW_HEIGHT = 540;
const DEFAULT_PRESET_ID = '1280x720';

const FIXED_PRESET_IDS = Object.keys(PRESETS)
    .filter((id) => PRESETS[id] !== null)
    .sort((left, right) => PRESETS[right].width - PRESETS[left].width);

/** Largest 16:9 size that fits inside the monitor work area. */
const computeMaxWindowSize = (workAreaWidth, workAreaHeight) =>
{
    const safeWidth = Math.max(MIN_WINDOW_WIDTH, workAreaWidth);
    const safeHeight = Math.max(MIN_WINDOW_HEIGHT, workAreaHeight);
    const widthFromHeight = Math.floor(safeHeight * (16 / 9));

    if (widthFromHeight <= safeWidth)
    {
        return { width: widthFromHeight, height: safeHeight };
    }

    return {
        width: safeWidth,
        height: Math.floor(safeWidth * (9 / 16)),
    };
};

const presetFitsWorkArea = (preset, maxWidth, maxHeight) =>
{
    if (!preset)
    {
        return true;
    }

    return preset.width <= maxWidth && preset.height <= maxHeight;
};

const clampPresetId = (presetId, maxWidth, maxHeight) =>
{
    if (!Object.hasOwn(PRESETS, presetId))
    {
        return DEFAULT_PRESET_ID;
    }

    if (presetId === 'adaptive')
    {
        return 'adaptive';
    }

    const preset = PRESETS[presetId];

    if (presetFitsWorkArea(preset, maxWidth, maxHeight))
    {
        return presetId;
    }

    for (const id of FIXED_PRESET_IDS)
    {
        if (presetFitsWorkArea(PRESETS[id], maxWidth, maxHeight))
        {
            return id;
        }
    }

    return 'adaptive';
};

const listAvailablePresetIds = (maxWidth, maxHeight) =>
    Object.keys(PRESETS).filter((id) =>
        presetFitsWorkArea(PRESETS[id], maxWidth, maxHeight));

module.exports = {
    MIN_WINDOW_WIDTH,
    MIN_WINDOW_HEIGHT,
    DEFAULT_PRESET_ID,
    PRESETS,
    computeMaxWindowSize,
    presetFitsWorkArea,
    clampPresetId,
    listAvailablePresetIds,
};
