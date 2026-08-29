/** Opt-in chain path glow on the battle board (idle preview + Attack playback). */

const STORAGE_KEY = 'signal-chain-path-lit';

export const readChainPathLitEnabled = (): boolean =>
{
    try
    {
        return localStorage.getItem(STORAGE_KEY) === '1';
    }
    catch
    {
        return false;
    }
};

export const writeChainPathLitEnabled = (enabled: boolean): void =>
{
    try
    {
        localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    }
    catch
    {
        /* ignore */
    }
};
