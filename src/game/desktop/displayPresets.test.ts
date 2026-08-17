import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
    clampPresetId,
    computeMaxWindowSize,
    listAvailablePresetIds,
    presetFitsWorkArea,
} = require('../../../electron/displayPresets.cjs');

describe('electron/displayPresets', () =>
{
    it('computes the largest 16:9 size for a work area', () =>
    {
        expect(computeMaxWindowSize(1920, 1080)).toEqual({ width: 1920, height: 1080 });
        expect(computeMaxWindowSize(2560, 1080)).toEqual({ width: 1920, height: 1080 });
    });

    it('hides presets larger than the monitor work area', () =>
    {
        const available = listAvailablePresetIds(1920, 1080);

        expect(available).toContain('adaptive');
        expect(available).toContain('1920x1080');
        expect(available).not.toContain('2560x1440');
    });

    it('clamps an oversized preset down to the largest that fits', () =>
    {
        expect(clampPresetId('2560x1440', 1920, 1080)).toBe('1920x1080');
        expect(clampPresetId('1920x1080', 1280, 720)).toBe('1280x720');
    });

    it('falls back to adaptive when nothing fixed fits', () =>
    {
        expect(presetFitsWorkArea({ width: 960, height: 540 }, 800, 600)).toBe(false);
        expect(clampPresetId('1280x720', 800, 600)).toBe('adaptive');
    });
});
