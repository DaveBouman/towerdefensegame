import { describe, expect, it } from 'vitest';
import { ALL_BGM_TRACKS, BGM_FILES } from './bgmManifest';

describe('bgmManifest', () =>
{
    it('lists an mp3 path for every bgm track', () =>
    {
        for (const track of ALL_BGM_TRACKS)
        {
            expect(BGM_FILES[track]).toMatch(/^assets\/music\/.*\.mp3$/);
        }
    });
});
