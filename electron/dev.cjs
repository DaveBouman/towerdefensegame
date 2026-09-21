/**
 * Starts Vite, waits until :8080 answers, then launches Electron --dev.
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const electronPath = require('electron');

const root = path.join(__dirname, '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const DEV_URL = process.env.ELECTRON_DEV_URL ?? 'http://localhost:8080/';

const vite = spawn(process.execPath, [viteBin, '--config', 'vite/config.dev.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
});

const ping = (url) =>
    new Promise((resolve, reject) =>
    {
        const req = http.get(url, (res) =>
        {
            res.resume();
            resolve();
        });

        req.on('error', reject);
        req.setTimeout(1000, () =>
        {
            req.destroy();
            reject(new Error('timeout'));
        });
    });

const waitForVite = async () =>
{
    for (;;)
    {
        try
        {
            await ping(DEV_URL);
            return;
        }
        catch
        {
            await new Promise((r) => setTimeout(r, 250));
        }
    }
};

let shuttingDown = false;

const shutdown = (code = 0) =>
{
    if (shuttingDown)
    {
        return;
    }

    shuttingDown = true;

    if (!vite.killed)
    {
        vite.kill('SIGTERM');
    }

    process.exit(code);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

vite.on('exit', (code, signal) =>
{
    if (!shuttingDown && (code || signal))
    {
        shutdown(code ?? 1);
    }
});

waitForVite().then(() =>
{
    const electron = spawn(electronPath, ['.', '--dev'], {
        cwd: root,
        stdio: 'inherit',
        env: process.env,
    });

    electron.on('exit', (code) => shutdown(code ?? 0));
});
