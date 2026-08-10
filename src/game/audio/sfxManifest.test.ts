import { describe, expect, it } from 'vitest';
import { ALL_SFX_KEYS, SFX_FILES } from './sfxManifest';

describe('sfxManifest', () =>
{
    it('lists a wav path for every sfx key', () =>
    {
        for (const key of ALL_SFX_KEYS)
        {
            expect(SFX_FILES[key]).toBe(`assets/sfx/${key}.wav`);
        }
    });
});
