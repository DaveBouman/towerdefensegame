/**
 * Global seeded random number generator.
 *
 * All gameplay randomness routes through `random()` here instead of
 * `Math.random()`, so a run can be made fully reproducible from a seed.
 *
 * The design reseeds at deterministic boundaries (map generation, each node's
 * reward, each battle) via seeds derived from the run seed + a scope string.
 * Because each boundary reseeds, those results are idempotent and independent
 * of the order in which other boundaries run — "same seed → same map/rewards"
 * always holds, and "same seed + same actions → same battle" holds within a
 * battle (player actions consume the stream in order).
 */

const INITIAL_STATE = 0x9e3779b9;

let state = INITIAL_STATE >>> 0;

/** Returns the next pseudo-random float in [0, 1). mulberry32. */
export const random = (): number =>
{
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Resets the generator to a specific 32-bit seed. */
export const reseed = (seed: number): void =>
{
    state = seed >>> 0;
};

/** Hashes a string into a 32-bit unsigned integer seed. xmur3. */
export const hashSeed = (input: string): number =>
{
    let h = 1779033703 ^ input.length;

    for (let i = 0; i < input.length; i++)
    {
        h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }

    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;

    return h >>> 0;
};

/** Derives a numeric seed from a run seed string plus a scope label. */
export const deriveSeed = (seed: string, scope: string): number =>
    hashSeed(`${seed}:${scope}`);

/** Reseeds the global generator for a named scope of a run seed. */
export const seedScope = (seed: string, scope: string): void =>
{
    reseed(deriveSeed(seed, scope));
};

const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a fresh, human-friendly run seed. Uses `Math.random` intentionally:
 * this picks an unpredictable *new* seed and is not part of any deterministic
 * stream.
 */
export const createRandomSeed = (): string =>
{
    let seed = '';

    for (let i = 0; i < 6; i++)
    {
        seed += SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)];
    }

    return seed;
};

/** Normalizes user-entered seed text to the canonical form. */
export const normalizeSeed = (input: string): string =>
    input.trim().toUpperCase();

export const randomInt = (maxExclusive: number): number =>
    Math.floor(random() * maxExclusive);

export const pickRandom = <T>(items: readonly T[]): T =>
    items[randomInt(items.length)]!;

export const shuffleInPlace = <T>(items: T[]): T[] =>
{
    for (let i = items.length - 1; i > 0; i--)
    {
        const j = Math.floor(random() * (i + 1));
        [ items[i], items[j] ] = [ items[j]!, items[i]! ];
    }

    return items;
};
