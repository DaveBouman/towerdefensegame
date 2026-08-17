const { app, BrowserWindow, ipcMain, Menu, net, protocol, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const steam = require('./steam.cjs');

const DEV_URL = process.env.ELECTRON_DEV_URL ?? 'http://localhost:8080';
const APP_SCHEME = 'app';
const APP_HOST = 'signalchain';

const isDevMode = () =>
    process.argv.includes('--dev')
    || process.env.ELECTRON_DEV === '1';

const distDir = () => path.join(__dirname, '..', 'dist');
const appIndexUrl = () => `${APP_SCHEME}://${APP_HOST}/index.html`;

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;

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
    if (!window)
    {
        return;
    }

    window.webContents.send('app:fullscreen-changed', window.isFullScreen());
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
        minWidth: 960,
        minHeight: 540,
        backgroundColor: '#0c0812',
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    mainWindow.once('ready-to-show', () =>
    {
        mainWindow?.show();
    });

    if (isDevMode())
    {
        void mainWindow.loadURL(DEV_URL);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else
    {
        void mainWindow.loadURL(appIndexUrl());
    }

    mainWindow.on('enter-full-screen', () => sendFullscreenState(mainWindow));
    mainWindow.on('leave-full-screen', () => sendFullscreenState(mainWindow));

    mainWindow.webContents.on('before-input-event', (_event, input) =>
    {
        if (input.type !== 'keyDown' || input.key !== 'Escape' || !mainWindow?.isFullScreen())
        {
            return;
        }

        mainWindow.setFullScreen(false);
        sendFullscreenState(mainWindow);
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

    window.setFullScreen(Boolean(enabled));
    sendFullscreenState(window);
});

ipcMain.handle('app:get-fullscreen', () =>
{
    const window = BrowserWindow.getFocusedWindow() ?? mainWindow;

    return window ? window.isFullScreen() : false;
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
