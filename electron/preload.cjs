const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('signalChainDesktop', {
    quit: () => ipcRenderer.send('app:quit'),
    setFullscreen: (enabled) => ipcRenderer.send('app:fullscreen', enabled),
    getFullscreen: () => ipcRenderer.invoke('app:get-fullscreen'),
    onFullscreenChange: (listener) =>
    {
        if (typeof listener !== 'function')
        {
            return () => undefined;
        }

        const handler = (_event, enabled) => listener(Boolean(enabled));

        ipcRenderer.on('app:fullscreen-changed', handler);

        return () => ipcRenderer.removeListener('app:fullscreen-changed', handler);
    },
    setDisplayPreset: (presetId) => ipcRenderer.invoke('app:set-display-preset', presetId),
    getDisplayPreset: () => ipcRenderer.invoke('app:get-display-preset'),
    getDisplayLimits: () => ipcRenderer.invoke('app:get-display-limits'),
    openExternal: (url) => ipcRenderer.send('app:open-external', url),
    platform: process.platform,
    steam: {
        isAvailable: () => ipcRenderer.invoke('steam:available'),
        getLocalPersona: () => ipcRenderer.invoke('steam:local-persona'),
        getFriends: () => ipcRenderer.invoke('steam:friends'),
    },
});
