import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashSeed } from '../random/rng';
import type { SteamPersona } from './desktopBridge';
import {
    beginSteamFaceBattle,
    getSteamFriendForEnemy,
    getSteamPersonaTextureKey,
    readSteamFacesEnabled,
    resetSteamPersonasForTests,
    writeSteamFacesEnabled,
} from './steamAvatars';

const friend = (id: string, name: string): SteamPersona => ({
    steamId: id,
    personaName: name,
    avatarUrl: `https://example.test/${id}.png`,
});

describe('steamAvatars', () =>
{
    const storage: Record<string, string> = {};

    beforeEach(() =>
    {
        for (const key of Object.keys(storage))
        {
            delete storage[key];
        }

        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key: string) => storage[key] ?? null),
            setItem: vi.fn((key: string, value: string) =>
            {
                storage[key] = value;
            }),
        });
        vi.stubGlobal('window', {});
        resetSteamPersonasForTests();
    });

    it('defaults Steam portraits on and persists the toggle', () =>
    {
        expect(readSteamFacesEnabled()).toBe(true);
        writeSteamFacesEnabled(false);
        expect(localStorage.setItem).toHaveBeenCalledWith('signal-chain-steam-faces', '0');
        expect(readSteamFacesEnabled()).toBe(false);
    });

    it('skips enemy faces when Steam portraits are disabled', () =>
    {
        const friends = [ friend('2', 'Bee'), friend('3', 'Cee') ];

        resetSteamPersonasForTests(null, friends);
        vi.stubGlobal('window', {
            signalChainDesktop: { quit: vi.fn(), steam: {} },
        });
        writeSteamFacesEnabled(false);
        beginSteamFaceBattle(1);

        expect(getSteamFriendForEnemy('basic')).toBeNull();
    });

    it('builds stable texture keys', () =>
    {
        expect(getSteamPersonaTextureKey('76561198000000000')).toBe('steam-persona-76561198000000000');
    });

    it('picks the same friend for an enemy when the battle seed matches', () =>
    {
        const local = friend('1', 'You');
        const friends = [ friend('3', 'Cee'), friend('2', 'Bee'), friend('4', 'Dee') ];

        resetSteamPersonasForTests(local, friends);
        vi.stubGlobal('window', {
            signalChainDesktop: { quit: vi.fn(), steam: {} },
        });

        beginSteamFaceBattle(42);
        const first = getSteamFriendForEnemy('warden');

        beginSteamFaceBattle(42);
        const second = getSteamFriendForEnemy('warden');

        expect(first?.steamId).toBe(second?.steamId);
        expect(first?.steamId).not.toBe('1');
    });

    it('does not use the local player as an enemy face', () =>
    {
        const local = friend('9', 'You');

        resetSteamPersonasForTests(local, [ local ]);
        vi.stubGlobal('window', {
            signalChainDesktop: { quit: vi.fn(), steam: {} },
        });
        beginSteamFaceBattle(7);

        expect(getSteamFriendForEnemy('basic')).toBeNull();
    });

    it('changes friend when the battle seed changes', () =>
    {
        const friends = [ friend('2', 'Bee'), friend('3', 'Cee'), friend('4', 'Dee'), friend('5', 'Eee') ];

        resetSteamPersonasForTests(null, friends);
        vi.stubGlobal('window', {
            signalChainDesktop: { quit: vi.fn(), steam: {} },
        });

        beginSteamFaceBattle(1);
        const a = getSteamFriendForEnemy('gridlock');
        beginSteamFaceBattle(99);
        const b = getSteamFriendForEnemy('gridlock');

        const expectedA = hashSeed('1:steam-face:gridlock') % friends.length;
        const expectedB = hashSeed('99:steam-face:gridlock') % friends.length;

        expect(a?.steamId).toBe([ ...friends ].sort((left, right) => left.steamId.localeCompare(right.steamId))[expectedA]?.steamId);
        expect(b?.steamId).toBe([ ...friends ].sort((left, right) => left.steamId.localeCompare(right.steamId))[expectedB]?.steamId);
    });
});
