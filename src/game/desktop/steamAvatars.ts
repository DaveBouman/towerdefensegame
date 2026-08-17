/**
 * Optional Steam faces for combat portraits.
 * Visual-only: assignment uses hashSeed so it never touches the gameplay RNG.
 */

import { hashSeed } from '../random/rng';
import { getDesktopApi, type SteamPersona } from './desktopBridge';

const STORAGE_KEY = 'signal-chain-steam-faces';
const HYDRATE_TIMEOUT_MS = 2500;

let localPersona: SteamPersona | null = null;
let friends: SteamPersona[] = [];
let hydrated = false;
let battleSeed = 0;

const withTimeout = async <T>(promise: Promise<T>, fallback: T): Promise<T> =>
{
    let timer: ReturnType<typeof setTimeout> | undefined;

    try
    {
        return await Promise.race([
            promise,
            new Promise<T>((resolve) =>
            {
                timer = setTimeout(() => resolve(fallback), HYDRATE_TIMEOUT_MS);
            }),
        ]);
    }
    finally
    {
        if (timer !== undefined)
        {
            clearTimeout(timer);
        }
    }
};

const resolveMaybe = async <T>(value: T | Promise<T>): Promise<T> => value;

export const isSteamBridgeAvailable = (): boolean =>
    Boolean(getDesktopApi()?.steam);

export const readSteamFacesEnabled = (): boolean =>
{
    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);

        return raw === null ? true : raw === '1';
    }
    catch
    {
        return true;
    }
};

export const writeSteamFacesEnabled = (enabled: boolean): void =>
{
    try
    {
        localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    }
    catch
    {
        /* ignore */
    }

    hydrated = false;

    if (!enabled)
    {
        localPersona = null;
        friends = [];
    }
};

export const isSteamFacesEnabled = (): boolean =>
    isSteamBridgeAvailable() && readSteamFacesEnabled();

export const getSteamPersonaTextureKey = (steamId: string): string =>
    `steam-persona-${steamId}`;

export const getLocalSteamPersona = (): SteamPersona | null =>
    isSteamFacesEnabled() ? localPersona : null;

export const getSteamFriends = (): readonly SteamPersona[] =>
    isSteamFacesEnabled() ? friends : [];

/** Bind this fight's seed so enemy faces stay stable for the battle. */
export const beginSteamFaceBattle = (seed: number): void =>
{
    battleSeed = seed >>> 0;
};

const enemyFriendPool = (): SteamPersona[] =>
{
    const localId = localPersona?.steamId;
    const pool = friends.filter((friend) => friend.steamId !== localId);

    return [ ...pool ].sort((left, right) => left.steamId.localeCompare(right.steamId));
};

export const getSteamFriendForEnemy = (definitionId: string): SteamPersona | null =>
{
    if (!isSteamFacesEnabled())
    {
        return null;
    }

    const pool = enemyFriendPool();

    if (pool.length === 0)
    {
        return null;
    }

    const index = hashSeed(`${battleSeed}:steam-face:${definitionId}`) % pool.length;

    return pool[index] ?? null;
};

export const listSteamPersonasToPreload = (): SteamPersona[] =>
{
    if (!readSteamFacesEnabled())
    {
        return [];
    }

    const seen = new Set<string>();
    const list: SteamPersona[] = [];

    const push = (persona: SteamPersona | null): void =>
    {
        if (!persona || seen.has(persona.steamId) || !persona.avatarUrl)
        {
            return;
        }

        seen.add(persona.steamId);
        list.push(persona);
    };

    push(localPersona);
    friends.forEach((friend) => push(friend));

    return list;
};

export const hydrateSteamPersonas = async (): Promise<void> =>
{
    if (hydrated)
    {
        return;
    }

    hydrated = true;

    if (!readSteamFacesEnabled())
    {
        return;
    }

    const steam = getDesktopApi()?.steam;

    if (!steam)
    {
        return;
    }

    try
    {
        const available = steam.isAvailable
            ? await withTimeout(resolveMaybe(steam.isAvailable()), false)
            : true;

        if (!available)
        {
            return;
        }

        const [ nextLocal, nextFriends ] = await Promise.all([
            steam.getLocalPersona
                ? withTimeout(resolveMaybe(steam.getLocalPersona()), null)
                : Promise.resolve(null),
            steam.getFriends
                ? withTimeout(resolveMaybe(steam.getFriends()), [])
                : Promise.resolve([]),
        ]);

        localPersona = nextLocal;
        friends = Array.isArray(nextFriends)
            ? nextFriends.filter((friend) => friend?.steamId && friend.avatarUrl)
            : [];
    }
    catch
    {
        localPersona = null;
        friends = [];
    }
};

/** Test helper — resets cached Steam snapshots. */
export const resetSteamPersonasForTests = (
    nextLocal: SteamPersona | null = null,
    nextFriends: SteamPersona[] = [],
): void =>
{
    localPersona = nextLocal;
    friends = nextFriends;
    hydrated = false;
    battleSeed = 0;
};
