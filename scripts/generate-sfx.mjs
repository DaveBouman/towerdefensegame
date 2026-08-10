/**
 * Generates cyberpunk-ish placeholder WAV sfx (procedural, no license issues).
 * Dark sub thumps + crushed noise — not chiptune bleeps.
 *
 * Run: node scripts/generate-sfx.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/assets/sfx');

const SAMPLE_RATE = 44100;
const GAIN = 1.35;

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

const fm = (carrier, modulator, modIndex, duration, volume, decay = 12) =>
{
    const count = Math.floor(SAMPLE_RATE * duration);
    const out = new Float32Array(count);

    for (let i = 0; i < count; i++)
    {
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-t * decay);
        const mod = Math.sin(2 * Math.PI * modulator * t) * modIndex;
        out[i] = Math.sin(2 * Math.PI * carrier * t + mod) * volume * env;
    }

    return out;
};

const crush = (samples, bits = 5) =>
{
    const out = new Float32Array(samples.length);
    const steps = Math.pow(2, bits);

    for (let i = 0; i < samples.length; i++)
    {
        out[i] = Math.round((samples[i] ?? 0) * steps) / steps;
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

const subThump = (freq, duration, volume) =>
    mix(sine(freq, duration, volume * 0.85, 22), noise(duration, volume * 0.45, 28));

const glitchBurst = (duration, volume) =>
    crush(mix(noise(duration, volume, 38), subThump(160, duration * 0.7, volume * 0.35)), 4);

const noiseHit = (duration, volume, subFreq = 70) =>
    crush(mix(noise(duration, volume, 14), subThump(subFreq, duration * 1.1, volume * 0.55)), 4);

const sweep = (fromHz, toHz, duration, volume) =>
{
    const count = Math.floor(SAMPLE_RATE * duration);
    const out = new Float32Array(count);

    for (let i = 0; i < count; i++)
    {
        const t = i / count;
        const freq = fromHz + (toHz - fromHz) * t;
        const env = Math.exp(-t * 10) * (1 - t * 0.35);
        out[i] = Math.sin(2 * Math.PI * freq * (i / SAMPLE_RATE)) * volume * env;
    }

    return crush(out, 5);
};

const v = (n) => n * GAIN;

/** Metallic shield tone — tonal FM like the original, with softer edges (not hit-crunch). */
const softShieldTone = (duration, volume) =>
    mix(
        fm(210, 315, 1.1, duration * 0.9, volume * 0.5, 5),
        fm(280, 420, 1.4, duration * 0.75, volume * 0.32, 7),
        sine(165, duration, volume * 0.22, 4),
        noise(duration * 0.12, volume * 0.05, 28),
    );

/** Card / UI — sharp digital transients, minimal noise mud. */
const digitalTick = (freq, duration, volume) =>
    mix(
        sine(freq, duration * 0.35, volume, 38),
        sine(freq * 1.498, duration * 0.22, volume * 0.45, 48),
        fm(freq * 2.2, freq * 0.5, 1.2, duration * 0.28, volume * 0.3, 32),
    );

const cardSnap = (volume) =>
    mix(
        digitalTick(920, 0.022, volume),
        digitalTick(1380, 0.016, volume * 0.55),
        sine(2100, 0.01, volume * 0.12, 55),
    );

const SOUNDS = {
    'ui-click': () => digitalTick(1040, 0.028, v(0.26)),
    'ui-select': () => mix(digitalTick(780, 0.032, v(0.24)), digitalTick(1170, 0.02, v(0.14))),
    'card-place': () => cardSnap(v(0.3)),
    'chain-step': () => mix(
        sweep(480, 980, 0.042, v(0.18)),
        digitalTick(720, 0.028, v(0.16)),
    ),
    'hit-light': () => noiseHit(0.09, v(0.42), 75),
    'hit-heavy': () => noiseHit(0.14, v(0.55), 48),
    'kill': () => concat(
        subThump(95, 0.07, v(0.38)),
        subThump(62, 0.09, v(0.42)),
        crush(mix(noise(0.1, v(0.35), 11), fm(140, 70, 2.5, 0.08, v(0.2), 9)), 4),
    ),
    'shield': () => crush(softShieldTone(0.11, v(0.3)), 7),
    'defend-proc': () => crush(mix(
        softShieldTone(0.13, v(0.32)),
        sine(130, 0.09, v(0.14), 3),
    ), 7),
    'ability-cast': () => mix(
        sweep(320, 920, 0.075, v(0.2)),
        fm(640, 320, 1.8, 0.055, v(0.18), 16),
        digitalTick(990, 0.024, v(0.14)),
    ),
    'heal': () => concat(subThump(95, 0.06, v(0.22)), subThump(130, 0.08, v(0.24))),
    'enemy-hit': () => noiseHit(0.11, v(0.48), 52),
    'enemy-move': () => mix(
        fm(160, 80, 2.2, 0.1, v(0.24), 11),
        crush(noise(0.07, v(0.28), 18), 5),
    ),
    'map-travel': () => mix(sweep(120, 280, 0.08, v(0.18)), subThump(100, 0.05, v(0.12))),
    'reward': () => concat(
        subThump(140, 0.06, v(0.22)),
        sweep(200, 360, 0.09, v(0.2)),
        glitchBurst(0.05, v(0.18)),
    ),
    'shop-buy': () => mix(glitchBurst(0.045, v(0.26)), subThump(180, 0.04, v(0.2))),
    'floor-enter': () => concat(
        subThump(80, 0.09, v(0.2)),
        sweep(100, 220, 0.12, v(0.22)),
        subThump(130, 0.1, v(0.18)),
    ),
    'victory': () => concat(
        sweep(160, 320, 0.1, v(0.2)),
        subThump(120, 0.1, v(0.24)),
        glitchBurst(0.06, v(0.16)),
    ),
    'defeat': () => concat(
        subThump(55, 0.14, v(0.38)),
        crush(mix(noise(0.12, v(0.3), 6), fm(90, 45, 3, 0.14, v(0.22), 4)), 3),
    ),
    'boss-intro': () => mix(
        subThump(45, 0.2, v(0.45)),
        crush(mix(noise(0.16, v(0.22), 5), fm(70, 35, 2.5, 0.18, v(0.18), 3)), 3),
    ),
};

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [ name, build ] of Object.entries(SOUNDS))
{
    writeWav(path.join(OUT_DIR, `${name}.wav`), build());
    console.log(`wrote ${name}.wav`);
}
