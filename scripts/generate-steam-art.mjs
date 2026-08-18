/**
 * Procedural Steam store / library banner art for Signal Chain.
 *
 * Run: npm run generate-steam-art
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs/steam-art');
const FONT_DIR = path.join(ROOT, 'public/fonts');

const COLORS = {
    bgTop: '#060910',
    bgBottom: '#120818',
    grid: 'rgba(255, 45, 149, 0.18)',
    gridBright: 'rgba(0, 232, 255, 0.35)',
    magenta: '#ff2d95',
    cyan: '#00e8ff',
    amber: '#ffb347',
    text: '#fff6ea',
    muted: '#8aa0bc',
};

const CARD_STYLES = {
    attack: { fill: '#2a0a18', border: '#ff2d95', labelColor: '#ffb8dc', powerColor: '#ffffff', icon: 'attack.png' },
    defend: { fill: '#1a1408', border: '#ff9a1a', labelColor: '#ffd4a0', powerColor: '#ffffff', icon: 'defend.png' },
    fire: { fill: '#2a1408', border: '#ff6b35', labelColor: '#ffd4b8', powerColor: '#ff9f43', icon: 'fire.png' },
    poison: { fill: '#0a2218', border: '#00ff9d', labelColor: '#b8ffe0', powerColor: '#00ff9d', icon: 'poison.png' },
    echo: { fill: '#180a28', border: '#a855f7', labelColor: '#d8b8ff', powerColor: '#c89bff', icon: 'echo.png' },
    thorns: { fill: '#1a0a18', border: '#ff3b6b', labelColor: '#ffb8c8', powerColor: '#ff6b8a', icon: 'thorns.png' },
    boost: { fill: '#141a08', border: '#fcee0a', labelColor: '#fff9b0', powerColor: '#fcee0a', icon: 'boost.png' },
};

/** Mini cards placed on chain cells — index is row-major 5×5 cell. */
const BOARD_CHAIN_CARDS = [
    { cell: 0, style: 'attack', power: '6', dir: 'right', label: 'STRIKE' },
    { cell: 1, style: 'fire', power: '4', dir: 'right', label: 'CINDER' },
    { cell: 2, style: 'poison', power: '3', dir: 'down', label: 'MIASMA' },
    { cell: 7, style: 'defend', power: '5', dir: 'down', label: 'BULWARK' },
    { cell: 12, style: 'echo', power: '↺', dir: 'down', label: 'ECHO' },
    { cell: 17, style: 'thorns', power: '2', dir: 'down', label: 'THORNS' },
    { cell: 22, style: 'boost', power: '×2', dir: 'right', label: 'BOOST' },
    { cell: 23, style: 'attack', power: '8', dir: 'right', label: '' },
    { cell: 24, style: 'fire', power: '6', dir: 'right', label: '' },
];

const ICON_DIR = path.join(ROOT, 'public/assets/ui-icons');
const iconDataUriCache = new Map();

const iconToDataUri = (fileName) =>
{
    if (iconDataUriCache.has(fileName))
    {
        return iconDataUriCache.get(fileName);
    }

    const filePath = path.join(ICON_DIR, fileName);

    if (!fs.existsSync(filePath))
    {
        return null;
    }

    const uri = `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
    iconDataUriCache.set(fileName, uri);

    return uri;
};

/** @type {{ name: string; width: number; height: number; kind?: 'logo' }[]} */
const STEAM_ASSETS = [
    { name: 'capsule-header', width: 460, height: 215 },
    { name: 'capsule-main', width: 616, height: 353 },
    { name: 'capsule-small', width: 231, height: 87 },
    { name: 'library-header', width: 920, height: 430 },
    { name: 'library-hero', width: 3840, height: 1240 },
    { name: 'library-logo', width: 1280, height: 720, kind: 'logo' },
];

const TAGLINE = 'Build the chain. Break the system.';
const CHAIN_CELLS = [ 0, 1, 2, 7, 12, 17, 22, 23, 24 ];

const fontToDataUri = (filename) =>
{
    const filePath = path.join(FONT_DIR, filename);

    if (!fs.existsSync(filePath))
    {
        throw new Error(`Missing font: ${filePath}. Run npm run sync-fonts first.`);
    }

    return `data:font/woff2;base64,${fs.readFileSync(filePath).toString('base64')}`;
};

const buildFontDefs = () =>
{
    const orbitron800 = fontToDataUri('orbitron-latin-800-normal.woff2');
    const orbitron700 = fontToDataUri('orbitron-latin-700-normal.woff2');
    const rajdhani600 = fontToDataUri('rajdhani-latin-600-normal.woff2');
    const shareTech = fontToDataUri('share-tech-mono-latin-400-normal.woff2');

    return `
    <style>
      @font-face { font-family: 'Orbitron'; font-weight: 800; src: url('${orbitron800}') format('woff2'); }
      @font-face { font-family: 'Orbitron'; font-weight: 700; src: url('${orbitron700}') format('woff2'); }
      @font-face { font-family: 'Rajdhani'; font-weight: 600; src: url('${rajdhani600}') format('woff2'); }
      @font-face { font-family: 'Share Tech Mono'; font-weight: 400; src: url('${shareTech}') format('woff2'); }
    </style>`;
};

const buildFilters = () => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.bgTop}" />
      <stop offset="55%" stop-color="#0c101c" />
      <stop offset="100%" stop-color="${COLORS.bgBottom}" />
    </linearGradient>
    <radialGradient id="magentaGlow" cx="35%" cy="45%" r="55%">
      <stop offset="0%" stop-color="${COLORS.magenta}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${COLORS.magenta}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="cyanGlow" cx="78%" cy="62%" r="45%">
      <stop offset="0%" stop-color="${COLORS.cyan}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${COLORS.cyan}" stop-opacity="0" />
    </radialGradient>
    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.45" />
    </filter>
    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="#ffffff" opacity="0.03" />
    </pattern>
  </defs>`;

const getLayoutTier = (width, height) =>
{
    if (width >= 2000)
    {
        return 'hero';
    }

    if (width >= 560)
    {
        return 'wide';
    }

    if (width >= 380)
    {
        return 'header';
    }

    return 'micro';
};

/** Keep the grid fully to the right of the text column. */
const fitGridRight = (width, height, pad, textZoneEnd, heightFraction) =>
{
    const maxGridSize = Math.min(height * heightFraction, width - pad - textZoneEnd - 10);

    if (maxGridSize <= height * 0.2)
    {
        return { showGrid: false, gridSize: 0, originX: 0, originY: 0 };
    }

    const gridSize = maxGridSize;
    const originX = width - pad - gridSize;
    const originY = height * 0.5 - gridSize / 2;

    return { showGrid: true, gridSize, originX, originY };
};

/** Per-format safe layout — keeps text, grid, and cards inside the frame. */
const computeLayout = (width, height) =>
{
    const tier = getLayoutTier(width, height);
    const pad = Math.max(8, Math.min(width, height) * 0.04);

    if (tier === 'hero')
    {
        const gridSize = Math.min(width * 0.22, height * 0.52);
        const originX = width * 0.68 - gridSize / 2;
        const originY = height * 0.5 - gridSize / 2;

        return {
            tier,
            pad,
            titleX: width * 0.08,
            titleY: height * 0.46,
            titleSize: Math.min(width * 0.045, height * 0.18),
            tagSize: height * 0.055,
            eyebrowSize: height * 0.045,
            showEyebrow: true,
            showTagline: true,
            showPerspective: true,
            showBrackets: true,
            showGrid: true,
            gridSize,
            originX,
            originY,
            showChainLabel: false,
            showBoardCards: true,
            cards: [
                { style: 'fire', power: '4', label: 'CINDER', dir: 'down', x: width * 0.06, y: height * 0.68, w: width * 0.11, rot: -10 },
                { style: 'echo', power: '↺', label: 'ECHO', dir: 'right', x: width * 0.2, y: height * 0.62, w: width * 0.11, rot: 8 },
            ],
        };
    }

    if (tier === 'wide')
    {
        const gridSize = Math.min(width * 0.3, height * 0.58);
        const textZone = width * 0.52;
        const originX = Math.max(textZone, width - pad - gridSize);
        const originY = height * 0.5 - gridSize / 2;

        return {
            tier,
            pad,
            titleX: pad * 1.4,
            titleY: height * 0.42,
            titleSize: Math.min(width * 0.078, height * 0.17),
            tagSize: Math.min(width * 0.026, height * 0.05),
            eyebrowSize: Math.min(width * 0.022, height * 0.04),
            showEyebrow: true,
            showTagline: true,
            showPerspective: true,
            showBrackets: true,
            showGrid: true,
            gridSize,
            originX,
            originY,
            showChainLabel: false,
            showBoardCards: true,
            cards: [
                { style: 'poison', power: '3', label: 'MIASMA', dir: 'down', x: width * 0.06, y: height * 0.68, w: width * 0.11, rot: -10 },
                { style: 'thorns', power: '2', label: 'THORNS', dir: 'left', x: width * 0.2, y: height * 0.62, w: width * 0.11, rot: 8 },
            ],
        };
    }

    if (tier === 'header')
    {
        const textZoneEnd = width * 0.5;
        const grid = fitGridRight(width, height, pad, textZoneEnd, 0.72);
        const titleSize = height * 0.13;

        return {
            tier,
            pad,
            titleX: pad * 1.2,
            titleY: height * 0.38,
            titleSize,
            titleSplit: true,
            titleLine1Y: height * 0.28,
            titleLine2Y: height * 0.44,
            tagSize: height * 0.058,
            eyebrowSize: height * 0.048,
            showEyebrow: false,
            showTagline: true,
            showPerspective: false,
            showBrackets: true,
            showGrid: grid.showGrid,
            gridSize: grid.gridSize,
            originX: grid.originX,
            originY: grid.originY,
            showChainLabel: false,
            showBoardCards: false,
            cards: [],
        };
    }

    // micro — stacked title left, compact card accent right
    const titleSize = height * 0.21;
    const cardW = height * 0.44;

    return {
        tier,
        pad,
        titleX: pad * 1.3,
        titleY: height * 0.62,
        titleSize,
        titleSplit: true,
        titleLine1Y: height * 0.36,
        titleLine2Y: height * 0.66,
        tagSize: 0,
        eyebrowSize: 0,
        showEyebrow: false,
        showTagline: false,
        showPerspective: false,
        showBrackets: false,
        showGrid: false,
        gridSize: 0,
        originX: 0,
        originY: 0,
        showChainLabel: false,
        showBoardCards: false,
        showMicroAccent: true,
        cards: [
            {
                style: 'fire',
                power: '4',
                label: '',
                dir: 'right',
                x: width - pad - cardW,
                y: (height - cardW * 1.35) / 2,
                w: cardW,
                rot: 8,
            },
        ],
    };
};

const buildMicroAccent = (width, height, pad) =>
{
    const gridSize = height * 0.62;
    const originX = width - pad - gridSize - height * 0.5;
    const originY = (height - gridSize) / 2;
    const cell = gridSize / 3;
    const chain = [ 0, 1, 2, 5 ];
    const parts = [];

    for (let row = 0; row < 3; row++)
    {
        for (let col = 0; col < 3; col++)
        {
            const index = row * 3 + col;
            const x = originX + col * cell;
            const y = originY + row * cell;
            const onChain = chain.includes(index);

            parts.push(`
              <rect x="${x + 1}" y="${y + 1}" width="${cell - 2}" height="${cell - 2}" rx="1.5"
                fill="${onChain ? 'rgba(0, 60, 80, 0.5)' : 'rgba(8, 14, 24, 0.7)'}"
                stroke="${onChain ? COLORS.cyan : COLORS.grid}"
                stroke-width="${onChain ? 1.2 : 0.8}" opacity="0.9" />`);
        }
    }

    for (let i = 0; i < chain.length - 1; i++)
    {
        const from = chain[i];
        const to = chain[i + 1];
        const fromRow = Math.floor(from / 3);
        const fromCol = from % 3;
        const toRow = Math.floor(to / 3);
        const toCol = to % 3;
        const x1 = originX + fromCol * cell + cell / 2;
        const y1 = originY + fromRow * cell + cell / 2;
        const x2 = originX + toCol * cell + cell / 2;
        const y2 = originY + toRow * cell + cell / 2;

        parts.push(`
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="${COLORS.magenta}" stroke-width="1.5" stroke-linecap="round" opacity="0.75" />`);
    }

    const iconSize = cell * 0.72;
    const iconCx = originX + cell / 2;
    const iconCy = originY + cell / 2;

    parts.push(buildCardIcon(iconCx, iconCy, iconSize, CARD_STYLES.attack.icon));

    return parts.join('\n');
};

const buildCardIcon = (cx, cy, size, iconFile) =>
{
    const uri = iconToDataUri(iconFile);

    if (!uri)
    {
        return '';
    }

    const half = size / 2;

    return `
      <image x="${cx - half}" y="${cy - half}" width="${size}" height="${size}"
        href="${uri}" preserveAspectRatio="xMidYMid meet" opacity="0.95" />`;
};

const buildDirGlyph = (dir, x, y, size, color) =>
{
    const s = size * 0.55;

    if (dir === 'right')
    {
        return `<path d="M ${x} ${y - s * 0.6} L ${x + s} ${y} L ${x} ${y + s * 0.6} Z" fill="${color}" opacity="0.85" />`;
    }

    if (dir === 'down')
    {
        return `<path d="M ${x - s * 0.6} ${y} L ${x} ${y + s} L ${x + s * 0.6} ${y} Z" fill="${color}" opacity="0.85" />`;
    }

    if (dir === 'left')
    {
        return `<path d="M ${x} ${y - s * 0.6} L ${x - s} ${y} L ${x} ${y + s * 0.6} Z" fill="${color}" opacity="0.85" />`;
    }

    return '';
};

const buildMiniBoardCard = (cellX, cellY, cellSize, { style, power, dir, label, isStart }) =>
{
    const visual = CARD_STYLES[style] ?? CARD_STYLES.attack;
    const inset = cellSize * 0.1;
    const cardW = cellSize - inset * 2;
    const cardH = cardW * 1.12;
    const x = cellX + (cellSize - cardW) / 2;
    const y = cellY + (cellSize - cardH) / 2;
    const iconSize = cardW * 0.52;
    const showLabel = label.length > 0 && cellSize >= 42;
    const powerSize = Math.max(7, cardW * 0.28);

    return `
      <g filter="url(#cardShadow)">
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="${Math.max(2, cardW * 0.1)}"
          fill="${visual.fill}" stroke="${isStart ? COLORS.magenta : visual.border}"
          stroke-width="${isStart ? 2 : 1.4}" />
        ${showLabel ? `
        <text x="${x + cardW / 2}" y="${y + cardH * 0.2}" text-anchor="middle"
          font-family="'Share Tech Mono', monospace" font-size="${Math.max(5, cardW * 0.14)}"
          fill="${visual.labelColor}">${label}</text>` : ''}
        ${buildCardIcon(x + cardW / 2, y + cardH * 0.52, iconSize, visual.icon)}
        ${buildDirGlyph(dir, x + cardW * 0.82, y + cardH * 0.22, cardW * 0.18, visual.border)}
        <text x="${x + cardW - cardW * 0.1}" y="${y + cardH - cardW * 0.08}" text-anchor="end"
          font-family="'Orbitron', sans-serif" font-weight="700" font-size="${powerSize}"
          fill="${visual.powerColor}">${power}</text>
      </g>`;
};

const buildCard = ({ style, power, label, dir, x, y, w, rot }) =>
{
    const visual = CARD_STYLES[style] ?? CARD_STYLES.attack;
    const cardW = w;
    const cardH = w * 1.35;
    const cx = x + cardW / 2;
    const cy = y + cardH / 2;
    const inset = cardW * 0.08;
    const bracket = cardW * 0.14;
    const showLabel = label.length > 0 && cardH > 28;
    const iconSize = cardW * 0.46;

    return `
      <g transform="rotate(${rot} ${cx} ${cy})" filter="url(#cardShadow)">
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="${cardW * 0.08}"
          fill="${visual.fill}" stroke="${visual.border}" stroke-width="${Math.max(1.2, cardW * 0.04)}" />
        <polyline points="${x + inset},${y + inset + bracket} ${x + inset},${y + inset} ${x + inset + bracket},${y + inset}"
          fill="none" stroke="${visual.border}" stroke-width="${Math.max(1, cardW * 0.035)}" opacity="0.85" />
        <polyline points="${x + cardW - inset - bracket},${y + cardH - inset} ${x + cardW - inset},${y + cardH - inset} ${x + cardW - inset},${y + cardH - inset - bracket}"
          fill="none" stroke="${visual.border}" stroke-width="${Math.max(1, cardW * 0.035)}" opacity="0.85" />
        ${showLabel ? `
        <text x="${x + cardW / 2}" y="${y + cardH * 0.18}" text-anchor="middle"
          font-family="'Share Tech Mono', monospace" font-size="${cardW * 0.14}"
          fill="${visual.labelColor}" opacity="0.9">${label}</text>` : ''}
        ${buildCardIcon(x + cardW / 2, y + cardH * 0.54, iconSize, visual.icon)}
        ${buildDirGlyph(dir, x + cardW - inset * 1.1, y + inset * 1.6, cardW * 0.16, visual.border)}
        <text x="${x + cardW - inset}" y="${y + cardH - inset * 0.6}" text-anchor="end"
          font-family="'Orbitron', sans-serif" font-weight="700" font-size="${cardW * 0.3}"
          fill="${visual.powerColor}">${power}</text>
      </g>`;
};

const buildCards = (cards) => cards.map((card) => buildCard(card)).join('\n');

const buildGrid = (layout) =>
{
    if (!layout.showGrid)
    {
        return '';
    }

    const { gridSize, originX, originY, showChainLabel, showBoardCards } = layout;
    const cell = gridSize / 5;
    const boardCardByCell = new Map(BOARD_CHAIN_CARDS.map((entry) => [ entry.cell, entry ]));
    const parts = [];

    for (let row = 0; row < 5; row++)
    {
        for (let col = 0; col < 5; col++)
        {
            const index = row * 5 + col;
            const x = originX + col * cell;
            const y = originY + row * cell;
            const onChain = CHAIN_CELLS.includes(index);
            const isStart = index === 0;
            const hasBoardCard = showBoardCards && boardCardByCell.has(index);

            if (hasBoardCard)
            {
                parts.push(`
                  <rect x="${x + 1}" y="${y + 1}" width="${cell - 2}" height="${cell - 2}" rx="2"
                    fill="rgba(0, 40, 60, 0.35)" stroke="${isStart ? COLORS.magenta : 'rgba(0, 232, 255, 0.25)'}"
                    stroke-width="1" opacity="0.9" />`);
                continue;
            }

            parts.push(`
              <rect x="${x + 1}" y="${y + 1}" width="${cell - 2}" height="${cell - 2}" rx="2"
                fill="${onChain ? 'rgba(0, 60, 80, 0.55)' : 'rgba(8, 14, 24, 0.85)'}"
                stroke="${isStart ? COLORS.magenta : onChain ? COLORS.cyan : COLORS.grid}"
                stroke-width="${isStart ? 2 : onChain ? 1.4 : 1}"
                opacity="${onChain ? 1 : 0.85}" />`);
        }
    }

    for (let i = 0; i < CHAIN_CELLS.length - 1; i++)
    {
        const from = CHAIN_CELLS[i];
        const to = CHAIN_CELLS[i + 1];
        const fromRow = Math.floor(from / 5);
        const fromCol = from % 5;
        const toRow = Math.floor(to / 5);
        const toCol = to % 5;
        const x1 = originX + fromCol * cell + cell / 2;
        const y1 = originY + fromRow * cell + cell / 2;
        const x2 = originX + toCol * cell + cell / 2;
        const y2 = originY + toRow * cell + cell / 2;

        parts.push(`
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="${COLORS.magenta}" stroke-width="${Math.max(2, cell * 0.1)}"
            stroke-linecap="round" opacity="0.7" filter="url(#softGlow)" />`);
    }

    if (showBoardCards && cell >= 24)
    {
        for (const boardCard of BOARD_CHAIN_CARDS)
        {
            const row = Math.floor(boardCard.cell / 5);
            const col = boardCard.cell % 5;
            const cellX = originX + col * cell;
            const cellY = originY + row * cell;

            parts.push(buildMiniBoardCard(cellX, cellY, cell, {
                ...boardCard,
                isStart: boardCard.cell === 0,
            }));
        }
    }

    if (showChainLabel)
    {
        parts.push(`
          <text x="${originX - cell * 0.15}" y="${originY + cell * 0.55}"
            font-family="'Share Tech Mono', monospace" font-size="${cell * 0.38}"
            fill="${COLORS.cyan}" opacity="0.9">0</text>`);
    }

    return parts.join('\n');
};

const buildPerspectiveGrid = (width, height, layout) =>
{
    if (!layout.showPerspective)
    {
        return '';
    }

    const baseY = height * 0.88;
    const left = width * 0.05;
    const right = width * 0.95;
    const vanishX = width * 0.42;
    const vanishY = height * 0.35;
    const lines = [];

    for (let i = 0; i <= 8; i++)
    {
        const t = i / 8;
        const x = left + (right - left) * t;

        lines.push(`
          <line x1="${vanishX}" y1="${vanishY}" x2="${x}" y2="${baseY}"
            stroke="${COLORS.grid}" stroke-width="1" opacity="0.5" />`);
    }

    for (let i = 0; i <= 5; i++)
    {
        const t = i / 5;
        const y = vanishY + (baseY - vanishY) * t;
        const spread = 0.15 + t * 0.85;
        const x1 = vanishX - width * spread * 0.45;
        const x2 = vanishX + width * spread * 0.55;

        lines.push(`
          <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"
            stroke="${COLORS.gridBright}" stroke-width="1" opacity="${0.15 + t * 0.25}" />`);
    }

    return lines.join('\n');
};

const buildCornerBrackets = (width, height, layout) =>
{
    if (!layout.showBrackets)
    {
        return '';
    }

    const inset = Math.max(8, Math.min(width, height) * 0.03);
    const s = Math.max(12, Math.min(width, height) * 0.05);
    const color = COLORS.magenta;

    return `
      <polyline points="${inset},${inset + s} ${inset},${inset} ${inset + s},${inset}"
        fill="none" stroke="${color}" stroke-width="2" opacity="0.75" />
      <polyline points="${width - inset - s},${inset} ${width - inset},${inset} ${width - inset},${inset + s}"
        fill="none" stroke="${color}" stroke-width="2" opacity="0.75" />
      <polyline points="${inset},${height - inset - s} ${inset},${height - inset} ${inset + s},${height - inset}"
        fill="none" stroke="${color}" stroke-width="2" opacity="0.75" />
      <polyline points="${width - inset - s},${height - inset} ${width - inset},${height - inset} ${width - inset},${height - inset - s}"
        fill="none" stroke="${color}" stroke-width="2" opacity="0.75" />`;
};

const buildTitle = (layout) =>
{
    const letterSpacing = layout.tier === 'micro' ? '0.04em' : '0.06em';

    if (layout.titleSplit)
    {
        return `
  <text x="${layout.titleX}" y="${layout.titleLine1Y}" font-family="'Orbitron', sans-serif" font-weight="800"
    font-size="${layout.titleSize}" fill="${COLORS.text}" letter-spacing="${letterSpacing}"
    filter="url(#softGlow)">SIGNAL</text>
  <text x="${layout.titleX}" y="${layout.titleLine2Y}" font-family="'Orbitron', sans-serif" font-weight="800"
    font-size="${layout.titleSize}" fill="${COLORS.text}" letter-spacing="${letterSpacing}"
    filter="url(#softGlow)">CHAIN</text>`;
    }

    return `
  <text x="${layout.titleX}" y="${layout.titleY}" font-family="'Orbitron', sans-serif" font-weight="800"
    font-size="${layout.titleSize}" fill="${COLORS.text}" letter-spacing="${letterSpacing}"
    filter="url(#softGlow)">SIGNAL CHAIN</text>`;
};

const buildBannerSvg = (width, height) =>
{
    const layout = computeLayout(width, height);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${buildFontDefs()}
  ${buildFilters()}
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect width="${width}" height="${height}" fill="url(#magentaGlow)" />
  <rect width="${width}" height="${height}" fill="url(#cyanGlow)" />
  ${buildPerspectiveGrid(width, height, layout)}
  ${buildGrid(layout)}
  ${layout.showMicroAccent ? buildMicroAccent(width, height, layout.pad) : ''}
  ${buildCards(layout.cards)}
  ${buildCornerBrackets(width, height, layout)}
  <rect width="${width}" height="${height}" fill="url(#scanlines)" />
  ${layout.showEyebrow ? `
  <text x="${layout.titleX}" y="${height * 0.16}" font-family="'Share Tech Mono', monospace"
    font-size="${layout.eyebrowSize}" fill="${COLORS.muted}" letter-spacing="0.18em">CARD-CHAIN GAUNTLET</text>` : ''}
  ${buildTitle(layout)}
  ${layout.showTagline ? `
  <text x="${layout.titleX}" y="${(layout.titleSplit ? layout.titleLine2Y : layout.titleY) + layout.tagSize * 2.4}" font-family="'Rajdhani', sans-serif" font-weight="600"
    font-size="${layout.tagSize}" fill="${COLORS.amber}">${TAGLINE}</text>` : ''}
</svg>`;
};

const buildLogoSvg = (width, height) =>
{
    const titleSize = Math.min(width * 0.11, height * 0.16);
    const tagSize = titleSize * 0.28;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${buildFontDefs()}
  ${buildFilters()}
  <text x="50%" y="46%" text-anchor="middle" font-family="'Orbitron', sans-serif" font-weight="800"
    font-size="${titleSize}" fill="${COLORS.text}" letter-spacing="0.1em" filter="url(#softGlow)">SIGNAL</text>
  <text x="50%" y="62%" text-anchor="middle" font-family="'Orbitron', sans-serif" font-weight="800"
    font-size="${titleSize}" fill="${COLORS.magenta}" letter-spacing="0.1em" filter="url(#softGlow)">CHAIN</text>
  <line x1="28%" y1="70%" x2="72%" y2="70%" stroke="${COLORS.cyan}" stroke-width="3" opacity="0.65" />
  <text x="50%" y="78%" text-anchor="middle" font-family="'Rajdhani', sans-serif" font-weight="600"
    font-size="${tagSize}" fill="${COLORS.muted}">${TAGLINE}</text>
</svg>`;
};

const main = async () =>
{
    let sharp;

    try
    {
        sharp = (await import('sharp')).default;
    }
    catch
    {
        console.error('Missing sharp. Run: npm install --save-dev sharp');
        process.exit(1);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    for (const asset of STEAM_ASSETS)
    {
        const svg = asset.kind === 'logo'
            ? buildLogoSvg(asset.width, asset.height)
            : buildBannerSvg(asset.width, asset.height);

        const svgPath = path.join(OUT_DIR, `${asset.name}.svg`);
        const pngPath = path.join(OUT_DIR, `${asset.name}.png`);

        fs.writeFileSync(svgPath, svg);

        await sharp(Buffer.from(svg))
            .png()
            .toFile(pngPath);

        console.log(`Wrote ${path.relative(ROOT, svgPath)} + ${path.relative(ROOT, pngPath)} (${asset.width}×${asset.height})`);
    }

    console.log(`\nDone. Upload PNGs from ${path.relative(ROOT, OUT_DIR)}/ to Steamworks.`);
};

main().catch((error) =>
{
    console.error(error);
    process.exit(1);
});
