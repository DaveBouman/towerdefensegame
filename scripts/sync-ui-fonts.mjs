/**
 * Copies latin woff2 UI fonts into public/fonts for offline play.
 * Source: @fontsource packages (OFL license). Run after npm install.
 *
 * Usage: node scripts/sync-ui-fonts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public', 'fonts');

const SPECS = [
    { pkg: 'rajdhani', family: 'Rajdhani', weights: [ 400, 500, 600, 700 ] },
    { pkg: 'orbitron', family: 'Orbitron', weights: [ 500, 600, 700, 800 ] },
    { pkg: 'share-tech-mono', family: 'Share Tech Mono', weights: [ 400 ] },
];

fs.mkdirSync(outDir, { recursive: true });

const cssBlocks = [];

for (const { pkg, family, weights } of SPECS)
{
    const filesDir = path.join(root, 'node_modules', '@fontsource', pkg, 'files');

    if (!fs.existsSync(filesDir))
    {
        throw new Error(`Missing @fontsource/${pkg}. Run npm install first.`);
    }

    for (const weight of weights)
    {
        const base = `${pkg}-latin-${weight}-normal`;
        const src = path.join(filesDir, `${base}.woff2`);
        const destName = `${base}.woff2`;
        const dest = path.join(outDir, destName);

        if (!fs.existsSync(src))
        {
            throw new Error(`Font file not found: ${src}`);
        }

        fs.copyFileSync(src, dest);
        cssBlocks.push(`@font-face {
  font-family: '${family}';
  font-style: normal;
  font-display: swap;
  font-weight: ${weight};
  src: url('/fonts/${destName}') format('woff2');
}`);
    }
}

const license = `# UI fonts (latin subsets)

Orbitron, Rajdhani — SIL Open Font License 1.1
Share Tech Mono — SIL Open Font License 1.1

Synced from @fontsource packages via \`npm run sync-fonts\`.
`;

fs.writeFileSync(path.join(outDir, 'fonts.css'), `${cssBlocks.join('\n\n')}\n`);
fs.writeFileSync(path.join(outDir, 'README.md'), license);

console.log(`Synced ${cssBlocks.length} font files to public/fonts/`);
