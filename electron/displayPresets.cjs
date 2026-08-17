/** Shared 16:9 window presets for the desktop shell (keep in sync with displaySettings.ts). */
module.exports = {
    MIN_WINDOW_WIDTH: 960,
    MIN_WINDOW_HEIGHT: 540,
    DEFAULT_PRESET_ID: '1280x720',
    PRESETS: {
        adaptive: null,
        '960x540': { width: 960, height: 540 },
        '1280x720': { width: 1280, height: 720 },
        '1600x900': { width: 1600, height: 900 },
        '1920x1080': { width: 1920, height: 1080 },
        '2560x1440': { width: 2560, height: 1440 },
    },
};
