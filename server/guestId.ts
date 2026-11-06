const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Server-side guest id (uses Math.random — not gameplay RNG). */
export const createGuestId = (): string =>
{
    let id = 'G-';

    for (let i = 0; i < 8; i++)
    {
        id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }

    return id;
};
