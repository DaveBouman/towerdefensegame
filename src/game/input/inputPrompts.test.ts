import { describe, expect, it, beforeEach } from 'vitest';
import {
    DEFAULT_INPUT_PROMPT_DEVICE,
    detectInputPromptDevice,
    getInputPromptSrc,
    resolveActiveInputPromptDevice,
    setInputPromptDeviceOverride,
} from './inputPrompts';

describe('inputPrompts', () =>
{
    beforeEach(() =>
    {
        setInputPromptDeviceOverride(null);
    });

    it('defaults to Steam Deck glyph set', () =>
    {
        expect(DEFAULT_INPUT_PROMPT_DEVICE).toBe('steamdeck');
        expect(getInputPromptSrc('confirm')).toBe('assets/input-prompts/steamdeck/confirm.png');
    });

    it('maps Deck / Xbox / Steam virtual pads', () =>
    {
        expect(detectInputPromptDevice('Steam Deck Controller')).toBe('steamdeck');
        expect(detectInputPromptDevice('Valve Software Steam Controller')).toBe('steamdeck');
        expect(detectInputPromptDevice('Xbox Series X Controller')).toBe('xbox');
        expect(detectInputPromptDevice('Microsoft X-Box 360 pad')).toBe('xbox');
        expect(detectInputPromptDevice('Steam Virtual Gamepad')).toBe('xbox');
    });

    it('maps PlayStation and Switch when used on Deck or PC', () =>
    {
        expect(detectInputPromptDevice('DualSense Wireless Controller')).toBe('playstation5');
        expect(detectInputPromptDevice('Sony Interactive Entertainment DualShock 4')).toBe('playstation4');
        expect(detectInputPromptDevice('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)')).toBe('playstation4');
        expect(detectInputPromptDevice('Nintendo Switch Pro Controller')).toBe('switch');
    });

    it('lets settings override auto-detect', () =>
    {
        setInputPromptDeviceOverride('playstation5');
        expect(resolveActiveInputPromptDevice()).toBe('playstation5');
        setInputPromptDeviceOverride(null);
    });
});
