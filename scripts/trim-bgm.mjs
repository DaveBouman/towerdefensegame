/**
 * Trims the tail from BGM mp3s so loops don't hit an outro fade.
 * Requires: npm install (ffmpeg-static is a devDependency)
 *
 * Run: node scripts/trim-bgm.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MUSIC_DIR = path.join(__dirname, '../public/assets/music');

/** Seconds removed from the end of each track. */
const TAIL_TRIM_SEC = 5;

const FILES = [
    'glass-streets-at-midnight.mp3',
    'concrete-veins.mp3',
    'iron-gait.mp3',
    'last-gatekeeper.mp3',
];

const readDurationSec = (filePath) =>
{
    const { stderr } = spawnSync(ffmpegPath, [ '-i', filePath ], { encoding: 'utf8' });
    const output = stderr ?? '';

    const match = output.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);

    if (!match)
    {
        throw new Error(`Could not read duration for ${filePath}`);
    }

    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
};

for (const name of FILES)
{
    const input = path.join(MUSIC_DIR, name);
    const temp = path.join(MUSIC_DIR, `.${name}.tmp.mp3`);
    const duration = readDurationSec(input);
    const keep = Math.max(1, duration - TAIL_TRIM_SEC);

    console.log(`${name}: ${duration.toFixed(2)}s → keep ${keep.toFixed(2)}s`);

    execFileSync(ffmpegPath, [
        '-y',
        '-i', input,
        '-t', String(keep),
        '-codec:a', 'libmp3lame',
        '-q:a', '2',
        temp,
    ], { stdio: 'pipe' });

    fs.renameSync(temp, input);
}

console.log('BGM tail trim complete.');
