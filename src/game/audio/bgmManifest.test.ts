import { describe, expect, it } from 'vitest';
import {
    ALL_BGM_TRACKS,
    BATTLE_BGM_TRACKS,
    BGM_FILES,
    resolveRunBgmTrack,
} from './bgmManifest';

describe('bgmManifest', () =>
{
    it('lists an mp3 path for every bgm track', () =>
    {
        for (const track of ALL_BGM_TRACKS)
        {
            expect(BGM_FILES[track]).toMatch(/^assets\/music\/.*\.mp3$/);
        }
    });

    it('uses glass streets on the run map', () =>
    {
        expect(resolveRunBgmTrack({
            phase: 'map',
            battleIntroKind: null,
            activeBattleKind: null,
        })).toBe('glass-streets');
    });

    it('uses glass streets on the main menu', () =>
    {
        expect(resolveRunBgmTrack({
            phase: 'menu',
            battleIntroKind: null,
            activeBattleKind: null,
        })).toBe('glass-streets');
    });

    it('alternates concrete veins and iron gait for standard combat', () =>
    {
        expect(resolveRunBgmTrack({
            phase: 'battle',
            battleIntroKind: null,
            activeBattleKind: 'enemy',
            battleMusicIndex: 0,
        })).toBe('concrete-veins');

        expect(resolveRunBgmTrack({
            phase: 'battle',
            battleIntroKind: null,
            activeBattleKind: 'enemy',
            battleMusicIndex: 1,
        })).toBe('iron-gait');

        expect(BATTLE_BGM_TRACKS).toEqual([ 'concrete-veins', 'iron-gait' ]);
    });

    it('uses last gatekeeper for the warden fight', () =>
    {
        expect(resolveRunBgmTrack({
            phase: 'battle',
            battleIntroKind: null,
            activeBattleKind: 'boss',
        })).toBe('last-gatekeeper');

        expect(resolveRunBgmTrack({
            phase: 'map',
            battleIntroKind: 'boss',
            activeBattleKind: null,
        })).toBe('last-gatekeeper');
    });
});
