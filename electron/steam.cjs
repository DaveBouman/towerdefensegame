/**
 * Steamworks bootstrap for the Electron main process.
 * Uses steamworks.js when installed; falls back gracefully in browser builds / CI.
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

/** @type {import('steamworks.js').Client | null} */
let client = null;

const readAppId = () =>
{
    const fromEnv = process.env.STEAM_APP_ID;

    if (fromEnv)
    {
        const parsed = Number.parseInt(fromEnv, 10);

        if (!Number.isNaN(parsed))
        {
            return parsed;
        }
    }

    const candidates = [
        path.join(process.cwd(), 'steam_appid.txt'),
        path.join(process.resourcesPath ?? '', 'steam_appid.txt'),
    ];

    for (const appIdPath of candidates)
    {
        if (!appIdPath || !fs.existsSync(appIdPath))
        {
            continue;
        }

        const parsed = Number.parseInt(fs.readFileSync(appIdPath, 'utf8').trim(), 10);

        if (!Number.isNaN(parsed))
        {
            return parsed;
        }
    }

    return null;
};

const steamIdToString = (steamId) =>
{
    if (!steamId)
    {
        return '';
    }

    if (typeof steamId === 'bigint')
    {
        return steamId.toString();
    }

    if (steamId.steamId64 !== undefined)
    {
        return String(steamId.steamId64);
    }

    return String(steamId);
};

const fetchProfileAvatarUrl = (steamId64) =>
    new Promise((resolve) =>
    {
        if (!steamId64)
        {
            resolve('');
            return;
        }

        const url = `https://steamcommunity.com/profiles/${steamId64}/?xml=1`;

        const request = https.get(url, { timeout: 4000 }, (response) =>
        {
            let body = '';

            response.on('data', (chunk) =>
            {
                body += chunk;
            });

            response.on('end', () =>
            {
                const match = body.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/);

                resolve(match?.[1] ?? '');
            });
        });

        request.on('timeout', () =>
        {
            request.destroy();
            resolve('');
        });

        request.on('error', () => resolve(''));
    });

/** Call before `app.whenReady()` so the Steam overlay can hook in. */
const bootstrap = () =>
{
    let steamworks;

    try
    {
        steamworks = require('steamworks.js');
    }
    catch (error)
    {
        console.warn('[steam] steamworks.js not installed:', error.message);
        return;
    }

    const appId = readAppId();

    if (appId !== null && steamworks.restartAppIfNecessary?.(appId))
    {
        process.exit(0);
        return;
    }

    try
    {
        steamworks.electronEnableSteamOverlay?.(true);
        client = appId !== null ? steamworks.init(appId) : steamworks.init();
        console.info('[steam] initialized', appId ?? '(steam_appid.txt)');
    }
    catch (error)
    {
        console.warn('[steam] init failed:', error.message);
        client = null;
    }
};

const isAvailable = () => Boolean(client);

const getLocalPersona = async () =>
{
    if (!client)
    {
        return null;
    }

    try
    {
        const steamId = client.localplayer.getSteamId();
        const steamId64 = steamIdToString(steamId);
        const personaName = client.localplayer.getName() || 'Runner';
        const avatarUrl = await fetchProfileAvatarUrl(steamId64);

        if (!avatarUrl)
        {
            return null;
        }

        return { steamId: steamId64, personaName, avatarUrl };
    }
    catch (error)
    {
        console.warn('[steam] local persona failed:', error.message);
        return null;
    }
};

const getFriends = async () =>
{
    // steamworks.js does not yet expose ISteamFriends iteration (see ceifa/steamworks.js#169).
    // Enemy portraits fall back to Craftpix art until friends IPC is wired.
    return [];
};

module.exports = {
    bootstrap,
    isAvailable,
    getLocalPersona,
    getFriends,
};
