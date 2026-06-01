/** Parses `#rrggbb` or `rrggbb` into a Phaser color number. */
export const parseCatalogColor = (hex: string): number =>
{
    const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
    const value = Number.parseInt(normalized, 16);

    if (Number.isNaN(value))
    {
        throw new Error(`Invalid catalog color: ${hex}`);
    }

    return value;
};
