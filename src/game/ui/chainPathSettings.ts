/** Opt-in chain path glow on the battle board (idle preview + Attack playback). */

const STORAGE_KEY = 'signal-chain-path-lit';

/** Default on so combo storms / path are visible during prep and between-Attack windows. */
export const readChainPathLitEnabled = (): boolean =>
{
    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (raw === null)
        {
            return true;
        }

        return raw === '1';
    }
    catch
    {
        return true;
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
