/**
 * Generates lightweight placeholder WAV sfx (procedural, no license issues).
 * Replace files in public/assets/sfx/ with packs from Kenney.nl (CC0) when ready.
 *
 * Run: node scripts/generate-sfx.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/assets/sfx');

const SAMPLE_RATE = 44100;

const writeWav = (filePath, samples) =>
{
    const numSamples = samples.length;
    const buffer = Buffer.alloc(44 + numSamples * 2);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(SAMPLE_RATE, 24);
    buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    for (let i = 0; i < numSamples; i++)
    {
        const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
        buffer.writeInt16LE(Math.floor(clamped * 32767), 44 + i * 2);
    }

    fs.writeFileSync(filePath, buffer);
};

const sine = (freq, duration, volume = 0.35, decay = 10) =>
{
    const count = Math.floor(SAMPLE_RATE * duration);
    const out = new Float32Array(count);

    for (let i = 0; i < count; i++)
    {
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-t * decay);
        out[i] = Math.sin(2 * Math.PI * freq * t) * volume * env;
    }

    return out;
};

const noise = (duration, volume = 0.25, decay = 14) =>
{
    const count = Math.floor(SAMPLE_RATE * duration);
    const out = new Float32Array(count);

    for (let i = 0; i < count; i++)
    {
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-t * decay);
        out[i] = (Math.random() * 2 - 1) * volume * env;
    }

    return out;
};

const mix = (...parts) =>
{
    const len = Math.max(...parts.map((part) => part.length));
    const out = new Float32Array(len);

    for (const part of parts)
    {
        for (let i = 0; i < part.length; i++)
        {
            out[i] += part[i];
        }
    }

    return out;
};

const concat = (...parts) =>
{
    const len = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Float32Array(len);
    let offset = 0;

    for (const part of parts)
    {
        out.set(part, offset);
        offset += part.length;
    }

    return out;
};

const GAIN = 1.45;

const SOUNDS = {
    'ui-click': () => sine(880, 0.04, 0.22 * GAIN, 40),
    'ui-select': () => mix(sine(620, 0.06, 0.2 * GAIN, 18), sine(980, 0.05, 0.12 * GAIN, 22)),
    'card-place': () => mix(sine(520, 0.05, 0.18 * GAIN, 28), noise(0.03, 0.08 * GAIN, 35)),
    'chain-step': () => sine(740, 0.07, 0.16 * GAIN, 16),
    'hit-light': () => mix(noise(0.07, 0.28 * GAIN, 22), sine(180, 0.08, 0.18 * GAIN, 18)),
    'hit-heavy': () => mix(noise(0.12, 0.42 * GAIN, 12), sine(120, 0.14, 0.28 * GAIN, 10)),
    'kill': () => concat(sine(420, 0.08, 0.22 * GAIN, 12), sine(660, 0.1, 0.24 * GAIN, 10), sine(880, 0.14, 0.2 * GAIN, 8)),
    'shield': () => mix(sine(300, 0.1, 0.2 * GAIN, 8), sine(450, 0.08, 0.15 * GAIN, 12)),
    'heal': () => concat(sine(520, 0.08, 0.14 * GAIN, 10), sine(780, 0.1, 0.16 * GAIN, 8)),
    'enemy-hit': () => mix(noise(0.09, 0.35 * GAIN, 16), sine(90, 0.11, 0.25 * GAIN, 9)),
    'map-travel': () => mix(sine(500, 0.05, 0.12 * GAIN, 20), sine(900, 0.06, 0.1 * GAIN, 24)),
    'reward': () => concat(sine(660, 0.07, 0.16 * GAIN, 12), sine(880, 0.09, 0.18 * GAIN, 10), sine(1100, 0.11, 0.14 * GAIN, 8)),
    'shop-buy': () => mix(sine(980, 0.05, 0.18 * GAIN, 20), sine(1320, 0.06, 0.12 * GAIN, 24)),
    'floor-enter': () => concat(sine(330, 0.1, 0.14 * GAIN, 8), sine(440, 0.12, 0.16 * GAIN, 7), sine(660, 0.14, 0.14 * GAIN, 6)),
    'victory': () => concat(
        sine(523, 0.12, 0.16 * GAIN, 6),
        sine(659, 0.12, 0.16 * GAIN, 6),
        sine(784, 0.18, 0.18 * GAIN, 5),
    ),
    'defeat': () => concat(sine(220, 0.18, 0.22 * GAIN, 4), sine(165, 0.22, 0.18 * GAIN, 3)),
    'boss-intro': () => mix(sine(110, 0.25, 0.3 * GAIN, 3), noise(0.15, 0.12 * GAIN, 6)),
};

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [ name, build ] of Object.entries(SOUNDS))
{
    writeWav(path.join(OUT_DIR, `${name}.wav`), build());
    console.log(`wrote ${name}.wav`);
}
