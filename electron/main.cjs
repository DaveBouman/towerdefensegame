const { app, BrowserWindow, ipcMain, Menu, net, protocol, screen, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const steam = require('./steam.cjs');
const {
    MIN_WINDOW_WIDTH,
    MIN_WINDOW_HEIGHT,
    DEFAULT_PRESET_ID,
    PRESETS,
    computeMaxWindowSize,
    clampPresetId,
    listAvailablePresetIds,
} = require('./displayPresets.cjs');

const DEV_URL = process.env.ELECTRON_DEV_URL ?? 'http://localhost:8080';
const APP_SCHEME = 'app';
const APP_HOST = 'signalchain';

const isDevMode = () =>
    process.argv.includes('--dev')
    || process.env.ELECTRON_DEV === '1';

const distDir = () => path.join(__dirname, '..', 'dist');
const appIndexUrl = () => `${APP_SCHEME}://${APP_HOST}/index.html`;
const appIconPath = () => path.join(__dirname, '..', 'build', 'icon.png');

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
/** @type {string} */
let activeDisplayPreset = DEFAULT_PRESET_ID;
/** @type {'windowed' | 'borderless' | 'fullscreen'} */
let activeWindowMode = 'windowed';

const WINDOW_MODES = new Set([ 'windowed', 'borderless', 'fullscreen' ]);

const isValidWindowMode = (mode) => WINDOW_MODES.has(mode);

const isValidPresetId = (presetId) => Object.hasOwn(PRESETS, presetId);

const getDisplayForWindow = (window) =>
{
    if (window && !window.isDestroyed())
    {
        return screen.getDisplayMatching(window.getBounds());
    }

    return screen.getPrimaryDisplay();
};

const getWorkAreaSize = (window) => getDisplayForWindow(window).workAreaSize;

const getDisplayLimits = (window) =>
{
    const workArea = getWorkAreaSize(window);
    const maxWindow = computeMaxWindowSize(workArea.width, workArea.height);

    return {
        maxWidth: maxWindow.width,
        maxHeight: maxWindow.height,
        availablePresets: listAvailablePresetIds(maxWindow.width, maxWindow.height),
    };
};

const sendWindowModeState = (window) =>
{
    if (!window || window.isDestroyed())
    {
        return;
    }

    window.webContents.send('app:window-mode-changed', activeWindowMode);
    window.webContents.send(
        'app:fullscreen-changed',
        activeWindowMode === 'fullscreen' || activeWindowMode === 'borderless',
    );
};

const applyDisplayPreset = (window, presetId) =>
{
    if (!window || window.isDestroyed() || activeWindowMode !== 'windowed')
    {
        return activeDisplayPreset;
    }

    const safePresetId = isValidPresetId(presetId) ? presetId : DEFAULT_PRESET_ID;
    const { maxWidth, maxHeight } = getDisplayLimits(window);
    const clampedPresetId = clampPresetId(safePresetId, maxWidth, maxHeight);

    activeDisplayPreset = clampedPresetId;

    const preset = PRESETS[clampedPresetId];

    if (!preset)
    {
        window.setResizable(true);
        window.setMinimumSize(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT);
        window.setMaximumSize(maxWidth, maxHeight);
        return activeDisplayPreset;
    }

    window.setResizable(true);
    window.setMinimumSize(preset.width, preset.height);
    window.setMaximumSize(preset.width, preset.height);
    window.setSize(preset.width, preset.height);
    window.center();

    return activeDisplayPreset;
};

const applyWindowMode = (window, mode) =>
{
    if (!window || window.isDestroyed())
    {
        return activeWindowMode;
    }

    const nextMode = isValidWindowMode(mode) ? mode : 'windowed';

    if (nextMode === 'fullscreen')
    {
        activeWindowMode = 'fullscreen';
        window.setFullScreen(true);
        sendWindowModeState(window);

        return activeWindowMode;
    }

    if (window.isFullScreen())
    {
        window.setFullScreen(false);
    }

    if (nextMode === 'borderless')
    {
        activeWindowMode = 'borderless';
        const { bounds } = getDisplayForWindow(window);

        window.setResizable(false);
        window.setMinimumSize(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT);
        window.setMaximumSize(bounds.width, bounds.height);
        window.setBounds(bounds);
        sendWindowModeState(window);

        return activeWindowMode;
    }

    activeWindowMode = 'windowed';
    applyDisplayPreset(window, activeDisplayPreset);
    sendWindowModeState(window);

    return activeWindowMode;
};

protocol.registerSchemesAsPrivileged([
    {
        scheme: APP_SCHEME,
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
            stream: true,
        },
    },
]);

steam.bootstrap();

app.commandLine.appendSwitch('disable-background-timer-throttling');

const sendFullscreenState = (window) =>
{
    sendWindowModeState(window);
};

const registerAppProtocol = () =>
{
    protocol.handle(APP_SCHEME, (request) =>
    {
        const { pathname } = new URL(request.url);
        let relativePath = decodeURIComponent(pathname);

        if (relativePath === '/' || relativePath === '')
        {
            relativePath = '/index.html';
        }

        const filePath = path.normalize(path.join(distDir(), relativePath.replace(/^\//, '')));
        const root = path.normalize(distDir());

        if (!filePath.startsWith(root))
        {
            return new Response('Forbidden', { status: 403 });
        }

        return net.fetch(pathToFileURL(filePath).toString());
    });
};

const createWindow = () =>
{
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        // Content size, not outer chrome — macOS title bar otherwise eats into 720p.
        useContentSize: true,
        minWidth: MIN_WINDOW_WIDTH,
        minHeight: MIN_WINDOW_HEIGHT,
        backgroundColor: '#0c0812',
        autoHideMenuBar: true,
        show: false,
        icon: appIconPath(),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    if (process.platform === 'darwin' && app.dock)
    {
        app.dock.setIcon(appIconPath());
    }

    mainWindow.once('ready-to-show', () =>
    {
        mainWindow?.show();
    });

    if (isDevMode())
    {
        const loadDev = (attempt = 0) =>
        {
            void mainWindow.loadURL(DEV_URL).catch(() =>
            {
                if (attempt < 40)
                {
                    setTimeout(() => loadDev(attempt + 1), 250);
                }
            });
        };

        loadDev();
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else
    {
        void mainWindow.loadURL(appIndexUrl());
    }

    mainWindow.on('enter-full-screen', () =>
    {
        activeWindowMode = 'fullscreen';
        sendWindowModeState(mainWindow);
    });
    mainWindow.on('leave-full-screen', () =>
    {
        if (activeWindowMode === 'fullscreen')
        {
            activeWindowMode = 'windowed';
            applyDisplayPreset(mainWindow, activeDisplayPreset);
        }

        sendWindowModeState(mainWindow);
    });

    mainWindow.webContents.on('before-input-event', (_event, input) =>
    {
        if (input.type !== 'keyDown' || input.key !== 'Escape')
        {
            return;
        }

        if (activeWindowMode === 'fullscreen' || activeWindowMode === 'borderless')
        {
            applyWindowMode(mainWindow, 'windowed');
        }
    });
};

ipcMain.on('app:quit', () =>
{
    app.quit();
});

ipcMain.on('app:fullscreen', (_event, enabled) =>
{
    const window = BrowserWindow.getFocusedWindow() ?? mainWindow;

    if (!window)
    {
        return;
    }

    applyWindowMode(window, enabled ? 'fullscreen' : 'windowed');
});

ipcMain.handle('app:get-fullscreen', () =>
    activeWindowMode === 'fullscreen' || activeWindowMode === 'borderless');

ipcMain.handle('app:get-window-mode', () => activeWindowMode);

ipcMain.handle('app:set-window-mode', (_event, mode) =>
{
    const window = BrowserWindow.getFocusedWindow() ?? mainWindow;

    if (!window)
    {
        return activeWindowMode;
    }

    return applyWindowMode(window, mode);
});

ipcMain.handle('app:get-display-preset', () => activeDisplayPreset);

ipcMain.handle('app:get-display-limits', () =>
{
    const window = BrowserWindow.getFocusedWindow() ?? mainWindow;

    return getDisplayLimits(window);
});

ipcMain.handle('app:set-display-preset', (_event, presetId) =>
{
    if (typeof presetId !== 'string' || !isValidPresetId(presetId))
    {
        return activeDisplayPreset;
    }

    const window = BrowserWindow.getFocusedWindow() ?? mainWindow;

    return applyDisplayPreset(window, presetId);
});

ipcMain.on('app:open-external', (_event, url) =>
{
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url))
    {
        return;
    }

    void shell.openExternal(url);
});

ipcMain.handle('steam:available', () => steam.isAvailable());
ipcMain.handle('steam:local-persona', () => steam.getLocalPersona());
ipcMain.handle('steam:friends', () => steam.getFriends());

app.whenReady().then(() =>
{
    if (!isDevMode())
    {
        registerAppProtocol();
    }

    Menu.setApplicationMenu(null);
    createWindow();

    app.on('activate', () =>
    {
        if (BrowserWindow.getAllWindows().length === 0)
        {
            createWindow();
        }
    });
});

app.on('window-all-closed', () =>
{
    if (process.platform !== 'darwin')
    {
        app.quit();
    }
});
