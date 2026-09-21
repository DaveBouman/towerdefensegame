#!/usr/bin/env node
/**
 * Builds the Signal Chain Electron / installer app icon (1024² PNG).
 * Brand mark: 3×3 chain grid from store capsule art.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'build');
const SIZE = 1024;

const buildIconSvg = () =>
{
    const pad = 96;
    const grid = 3;
    const gap = 28;
    const cell = (SIZE - pad * 2 - gap * (grid - 1)) / grid;
    const lit = new Set([ '0,0', '0,1', '0,2', '1,2' ]);

    const cells = [];

    for (let row = 0; row < grid; row += 1)
    {
        for (let col = 0; col < grid; col += 1)
        {
            const x = pad + col * (cell + gap);
            const y = pad + row * (cell + gap);
            const on = lit.has(`${row},${col}`);
            const stroke = on ? '#00e8ff' : '#2a3a55';
            const fill = on ? '#120818' : '#0a1018';
            const sw = on ? 14 : 8;

            cells.push(
                `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="28" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
            );

            if (row === 0 && col === 0)
            {
                const cx = x + cell / 2;
                const cy = y + cell / 2;
                cells.push(
                    `<circle cx="${cx}" cy="${cy}" r="${cell * 0.16}" fill="#fff6ea"/>`,
                    `<circle cx="${cx}" cy="${cy}" r="${cell * 0.08}" fill="#ff2d95"/>`,
                );
            }
        }
    }

    // Chain path through lit cells.
    const c = (r, col) => ({
        x: pad + col * (cell + gap) + cell / 2,
        y: pad + r * (cell + gap) + cell / 2,
    });
    const a = c(0, 0);
    const b = c(0, 1);
    const d = c(0, 2);
    const e = c(1, 2);
    const pathD = `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${d.x} ${d.y} L ${e.x} ${e.y}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#060910"/>
      <stop offset="55%" stop-color="#0c101c"/>
      <stop offset="100%" stop-color="#120818"/>
    </linearGradient>
    <radialGradient id="glow" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#ff2d95" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ff2d95" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>
  ${cells.join('\n  ')}
  <path d="${pathD}" fill="none" stroke="#ff2d95" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
</svg>`;
};

const main = () =>
{
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const svg = buildIconSvg();
    const svgPath = path.join(OUT_DIR, 'icon.svg');
    const pngPath = path.join(OUT_DIR, 'icon.png');

    fs.writeFileSync(svgPath, svg);
    const png = new Resvg(svg, {
        fitTo: { mode: 'width', value: SIZE },
    }).render().asPng();
    fs.writeFileSync(pngPath, png);

    // Browser favicon + dock-friendly sizes.
    for (const size of [ 256, 128, 64, 32, 16 ])
    {
        const out = new Resvg(svg, {
            fitTo: { mode: 'width', value: size },
        }).render().asPng();
        fs.writeFileSync(path.join(OUT_DIR, `icon-${size}.png`), out);
    }

    fs.writeFileSync(path.join(ROOT, 'public', 'favicon.png'), new Resvg(svg, {
        fitTo: { mode: 'width', value: 64 },
    }).render().asPng());

    console.log(`Wrote ${path.relative(ROOT, pngPath)} and public/favicon.png`);
};

main();
