import { getGameCursors, setViewportGrabbingCursor } from '../ui/gameCursors';
import { uiTextStyle, uiDisplayTextStyle } from '../config/uiTypography';
import { CYBER } from '../config/cyberpunkTheme';
import { drawCornerBrackets, drawNeonPanel } from '../config/cyberpunkUiGraphics';
import { GRID_CONFIG } from '../config/gridConfig';
import { buildCardGraphic, setCardChainChromeMuted, updateCardGraphicDirection } from '../cards/CardRenderer';
import type { CardStreakSeams } from '../cards/CardRenderer';
import { attachCardTooltip } from '../cardGame/presentation/tooltips/CardTooltipController';
import { getJokerDirectionChoices } from '../cardGame/combat/AttackPipeline';
import { GAME_RULES } from '../cardGame/config/cardRegistry';
import type { BoardModel } from '../cardGame/domain/BoardModel';
import { isEnemyOwnedCard, isFieldOwnedCard } from '../cardGame/domain/cardOwnership';
import type { CardDirection } from '../cardGame/domain/cardDirections';
import type { CardInstance, SlotPosition } from '../cardGame/domain/types';
import { boardColLabel } from './boardCoordinates';
import type { BoardLayout } from './boardLayout';
import { JokerDirectionPicker } from './JokerDirectionPicker';
import { playCardPlaceSettle } from '../cardGame/presentation/visualEffects/visualEffectTweens';
import type { StreakBarRun } from '../cardGame/combat/streakBarRuns';

const STREAK_STORM_COLORS: Record<string, { glow: number; label: string }> = {
    attack: { glow: CYBER.attackGlow, label: '#ffb8dc' },
    defend: { glow: CYBER.defendGlow, label: '#ffd4a0' },
    poison: { glow: 0x00ff9d, label: '#b8ffe0' },
    fire: { glow: 0xff6b35, label: '#ffc8a0' },
    siphon: { glow: 0x55efc4, label: '#b8ffe8' },
    thorns: { glow: 0xc44dff, label: '#e0c8ff' },
    echo: { glow: 0x5ce1e6, label: '#b8f8ff' },
    redline: { glow: 0xff4a6a, label: '#ffb8c8' },
    'battle-mod': { glow: 0xfcee0a, label: '#fff9b0' },
};

const streakStormColor = (behaviorId: string): { glow: number; label: string } =>
    STREAK_STORM_COLORS[behaviorId] ?? { glow: CYBER.magenta, label: '#ffd0ea' };

const SLOT_FILL = CYBER.slotFill;
const SLOT_BORDER = CYBER.slotBorder;
const SLOT_DROP = CYBER.slotDrop;
const SLOT_REPLACE = CYBER.slotReplace;
const SLOT_MOVE = CYBER.slotMove;
const SLOT_SWAP = CYBER.slotSwap;
const SLOT_SILENCED = CYBER.slotSilenced;
const SLOT_SILENCED_BORDER = CYBER.slotSilencedBorder;
const SLOT_BOMB_DISABLED = CYBER.slotBombDisabled;
const SLOT_BOMB_DISABLED_BORDER = CYBER.slotBombDisabledBorder;
const SLOT_DAMPENED = CYBER.slotDampened;
const SLOT_DAMPENED_BORDER = CYBER.slotDampenedBorder;
const SLOT_NULLIFIED = CYBER.slotNullified;
const SLOT_NULLIFIED_BORDER = CYBER.slotNullifiedBorder;
const SLOT_INSET = 4;
const AXIS_IDLE = '#a89482';
const AXIS_START = '#7af0ff';
const AXIS_ACTIVE = '#fcee0a';
/** Tap vs drag on a start-column card: below this, click sets chain start. */
const CHAIN_START_TAP_SLOP_PX = 10;
const CHAIN_START_BADGE = 'START';

export interface BoardCardDragHandlers {
    canDrag: () => boolean;
    onDragMove: (fromSlot: SlotPosition, worldX: number, worldY: number) => void;
    onDragEnd: (fromSlot: SlotPosition, worldX: number, worldY: number) => boolean;
}

export interface ChainStartHandlers {
    canSelect: () => boolean;
    onSelect: (slot: SlotPosition) => void;
}

interface ChainStartIndicator {
    slot: SlotPosition;
    ring: Phaser.GameObjects.Rectangle;
    brackets: Phaser.GameObjects.Graphics;
    badge: Phaser.GameObjects.Text;
    hitArea: Phaser.GameObjects.Rectangle;
}

export type BoardHighlightMode = 'place' | 'replace' | 'move' | 'swap' | null;

const CHAIN_START_SELECTED = CYBER.chainStartSelected;
const CHAIN_START_IDLE = CYBER.chainStartIdle;

export class CardBoardView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly slotBodies: Phaser.GameObjects.Rectangle[][] = [];
    private readonly silencedOverlays: (Phaser.GameObjects.Rectangle | null)[][] = [];
    private readonly bombDisabledOverlays: (Phaser.GameObjects.Rectangle | null)[][] = [];
    private readonly dampenedOverlays: (Phaser.GameObjects.Rectangle | null)[][] = [];
    private readonly nullifiedOverlays: (Phaser.GameObjects.Rectangle | null)[][] = [];
    private readonly cardContainers: (Phaser.GameObjects.Container | null)[][] = [];
    private highlightedSlot: SlotPosition | null = null;
    private highlightMode: BoardHighlightMode = null;
    private draggingFromSlot: SlotPosition | null = null;
    private draggingWrapper: Phaser.GameObjects.Container | null = null;
    private boardDragProxy?: Phaser.GameObjects.Container;
    private chainStartSlot: SlotPosition = {
        row: GAME_RULES.activationStart.row,
        col: GAME_RULES.activationStartColumn,
    };
    private readonly chainStartIndicators: ChainStartIndicator[] = [];
    private chainStartPickable = false;
    private chainStartColumnGlow?: Phaser.GameObjects.Rectangle;
    private chainStartIdleTween?: Phaser.Tweens.Tween;
    private chainStartTween?: Phaser.Tweens.Tween;
    private readonly colAxisLabels: Phaser.GameObjects.Text[] = [];
    private activeCoordinate: SlotPosition | null = null;
    private readonly jokerDirectionPicker = new JokerDirectionPicker();
    private readonly chainPathGfx: Phaser.GameObjects.Graphics;
    private readonly streakBarGfx: Phaser.GameObjects.Graphics;
    private readonly streakBarLabels: Phaser.GameObjects.Container;
    private chainPathSlots: SlotPosition[] = [];
    private chainPathVisited = 0;
    private chainPathActive = false;
    private chainPathTentativeFrom: number | null = null;
    private streakBarRuns: StreakBarRun[] = [];
    private streakBarDimSlots = new Set<string>();
    private readonly streakStormTimers: (Phaser.Time.TimerEvent | undefined)[] = [];
    private readonly streakStormStrikeGfx: Phaser.GameObjects.Graphics[] = [];

    constructor (
        private readonly scene: Phaser.Scene,
        private layout: BoardLayout,
        private readonly board: BoardModel,
        private readonly boardDragHandlers?: BoardCardDragHandlers,
        private readonly chainStartHandlers?: ChainStartHandlers,
    )
    {
        const { cols, rows, tileSize } = GRID_CONFIG;
        this.container = scene.add.container(layout.gridOffsetX, layout.gridOffsetY);
        this.chainPathGfx = scene.add.graphics();
        this.streakBarGfx = scene.add.graphics();
        this.streakBarLabels = scene.add.container(0, 0);

        const panelPad = 14;
        const panelW = cols * tileSize + panelPad * 2;
        const panelH = rows * tileSize + panelPad * 2;
        const backdrop = scene.add.graphics();

        drawNeonPanel(
            backdrop,
            -panelPad,
            -panelPad,
            panelW,
            panelH,
            0x120c16,
            CYBER.magenta,
            0.94,
            0.35,
        );
        this.container.add([ backdrop, this.chainPathGfx, this.streakBarGfx, this.streakBarLabels ]);

        const slotBrackets = scene.add.graphics();

        drawCornerBrackets(
            slotBrackets,
            -panelPad + 4,
            -panelPad + 4,
            panelW - 8,
            panelH - 8,
            CYBER.magenta,
            { arm: 16, alpha: 0.45 },
        );
        this.container.add(slotBrackets);

        this.drawAxisLegend(cols, rows, tileSize, panelPad);

        for (let row = 0; row < rows; row++)
        {
            this.slotBodies[row] = [];
            this.silencedOverlays[row] = [];
            this.bombDisabledOverlays[row] = [];
            this.dampenedOverlays[row] = [];
            this.nullifiedOverlays[row] = [];
            this.cardContainers[row] = [];

            for (let col = 0; col < cols; col++)
            {
                const x = col * tileSize + tileSize / 2;
                const y = row * tileSize + tileSize / 2;
                const slotSize = tileSize - SLOT_INSET * 2;
                const slot = scene.add.rectangle(x, y, slotSize, slotSize, SLOT_FILL);

                slot.setStrokeStyle(2, SLOT_BORDER, 0.75);
                slot.setDepth(0);
                this.container.add(slot);
                this.slotBodies[row][col] = slot;
                this.silencedOverlays[row][col] = null;
                this.bombDisabledOverlays[row][col] = null;
                this.dampenedOverlays[row][col] = null;
                this.nullifiedOverlays[row][col] = null;
                this.cardContainers[row][col] = null;

                const card = board.getCardAt({ row, col });

                if (card)
                {
                    slot.setVisible(false);
                    this.cardContainers[row][col] = this.drawCard({ row, col }, x, y, tileSize, card);
                }
            }
        }

        this.drawChainStartIndicators();
        this.setChainStartSlot(this.chainStartSlot);
    }

    getChainStartSlot (): SlotPosition
    {
        return { ...this.chainStartSlot };
    }

    isDragging (): boolean
    {
        return this.draggingFromSlot !== null;
    }

    private normalizeWrapper (wrapper: Phaser.GameObjects.Container | null | undefined): void
    {
        wrapper?.setAlpha(1);
    }

    setChainStartSlot (slot: SlotPosition): void
    {
        this.chainStartSlot = { ...slot };
        this.refreshAxisLegendStyles();
        this.updateChainStartSelection();
    }

    /** Idle preview of the planned route (dim). Cleared while attacking. */
    setChainPathPreview (
        slots: readonly SlotPosition[],
        tentativeFromIndex: number | null = null,
    ): void
    {
        this.chainPathSlots = slots.map((slot) => ({ ...slot }));
        this.chainPathVisited = 0;
        this.chainPathActive = false;
        this.chainPathTentativeFrom = tentativeFromIndex;
        this.redrawChainPath();
    }

    /** Type-stack / combo runs — mute only cards currently in a streak. */
    setStreakBars (runs: readonly StreakBarRun[]): void
    {
        this.streakBarRuns = runs.map((run) => ({
            ...run,
            slots: run.slots.map((slot) => ({ ...slot })),
        }));
        this.syncStreakCardChrome();
        this.redrawStreakBars();
    }

    clearStreakBars (): void
    {
        this.stopStreakLightning();
        this.streakBarRuns = [];
        this.syncStreakCardChrome();
        this.streakBarGfx.clear();
        this.streakBarLabels.removeAll(true);
    }

    clearChainPath (): void
    {
        this.chainPathSlots = [];
        this.chainPathVisited = 0;
        this.chainPathActive = false;
        this.chainPathTentativeFrom = null;
        this.chainPathGfx.clear();
    }

    /** During Attack: brighten the path through the latest activated slot. */
    advanceChainPath (slot: SlotPosition): void
    {
        if (this.chainPathSlots.length === 0)
        {
            return;
        }

        this.chainPathActive = true;
        const index = this.chainPathSlots.findIndex(
            (step) => step.row === slot.row && step.col === slot.col,
        );

        if (index >= 0)
        {
            this.chainPathVisited = Math.max(this.chainPathVisited, index + 1);
        }

        this.redrawChainPath();
    }

    private slotCenter (slot: SlotPosition): { x: number; y: number }
    {
        const { tileSize } = GRID_CONFIG;

        return {
            x: slot.col * tileSize + tileSize / 2,
            y: slot.row * tileSize + tileSize / 2,
        };
    }

    private redrawChainPath (): void
    {
        this.chainPathGfx.clear();

        if (this.chainPathSlots.length < 2)
        {
            return;
        }

        this.container.bringToTop(this.chainPathGfx);

        const points = this.chainPathSlots.map((slot) => this.slotCenter(slot));
        const visited = this.chainPathActive
            ? Math.max(1, Math.min(this.chainPathVisited, points.length))
            : points.length;
        const fork = this.chainPathTentativeFrom === null
            ? points.length
            : Math.max(0, Math.min(this.chainPathTentativeFrom, points.length - 1));
        const previewAlpha = this.chainPathActive ? 0.18 : 0.32;
        const activeAlpha = 0.75;

        const strokeSegment = (
            from: number,
            to: number,
            width: number,
            color: number,
            alpha: number,
        ): void =>
        {
            if (to <= from)
            {
                return;
            }

            this.chainPathGfx.lineStyle(width, color, alpha);
            this.chainPathGfx.beginPath();
            this.chainPathGfx.moveTo(points[from]!.x, points[from]!.y);

            for (let i = from + 1; i <= to; i++)
            {
                this.chainPathGfx.lineTo(points[i]!.x, points[i]!.y);
            }

            this.chainPathGfx.strokePath();
        };

        // Known route (thinner than first pass).
        strokeSegment(0, Math.min(fork, points.length - 1), 5, CYBER.magenta, previewAlpha * 0.45);
        strokeSegment(0, Math.min(fork, points.length - 1), 2, CYBER.gold, previewAlpha);

        // Past unset Reroute: softer guess so it reads as provisional.
        if (fork < points.length - 1)
        {
            strokeSegment(fork, points.length - 1, 4, CYBER.magenta, previewAlpha * 0.28);
            strokeSegment(fork, points.length - 1, 1.5, CYBER.gold, previewAlpha * 0.55);
        }

        if (this.chainPathActive && visited > 1)
        {
            strokeSegment(0, visited - 1, 6, CYBER.cyan, activeAlpha * 0.28);
            strokeSegment(0, visited - 1, 2.5, CYBER.chainStartSelected, activeAlpha);
        }

        for (let i = 0; i < points.length; i++)
        {
            const lit = !this.chainPathActive || i < visited;
            const tentative = this.chainPathTentativeFrom !== null && i > this.chainPathTentativeFrom;
            const point = points[i]!;

            this.chainPathGfx.fillStyle(
                lit ? CYBER.chainStartSelected : CYBER.magenta,
                lit
                    ? (this.chainPathActive ? 0.85 : tentative ? 0.28 : 0.4)
                    : 0.15,
            );
            this.chainPathGfx.fillCircle(point.x, point.y, lit ? (tentative ? 2.5 : 3.5) : 2);
        }
    }

    private slotKey (slot: SlotPosition): string
    {
        return `${slot.row}:${slot.col}`;
    }

    private setSlotChainChrome (key: string, seams: CardStreakSeams | null): void
    {
        const [ rowText, colText ] = key.split(':');
        const row = Number(rowText);
        const col = Number(colText);
        const wrapper = this.cardContainers[row]?.[col];
        const graphic = wrapper?.getData('cardGraphic') as Phaser.GameObjects.Container | undefined;

        if (!wrapper || !graphic)
        {
            return;
        }

        wrapper.setAlpha(1);
        setCardChainChromeMuted(graphic, seams);
    }

    private seamsForSlot (
        slot: SlotPosition,
        runKeys: ReadonlySet<string>,
    ): CardStreakSeams
    {
        return {
            hideLeft: runKeys.has(this.slotKey({ row: slot.row, col: slot.col - 1 })),
            hideRight: runKeys.has(this.slotKey({ row: slot.row, col: slot.col + 1 })),
            hideTop: runKeys.has(this.slotKey({ row: slot.row - 1, col: slot.col })),
            hideBottom: runKeys.has(this.slotKey({ row: slot.row + 1, col: slot.col })),
        };
    }

    /**
     * Only shared edges between neighbors in the same streak open up —
     * outer perimeter stays so the run reads as one larger card.
     */
    private syncStreakCardChrome (): void
    {
        const nextKeys = new Set<string>();
        const seamsByKey = new Map<string, CardStreakSeams>();

        for (const run of this.streakBarRuns)
        {
            const runKeys = new Set(run.slots.map((slot) => this.slotKey(slot)));

            for (const slot of run.slots)
            {
                const key = this.slotKey(slot);

                nextKeys.add(key);

                const nextSeams = this.seamsForSlot(slot, runKeys);
                const previous = seamsByKey.get(key);

                seamsByKey.set(key, previous
                    ? {
                        hideLeft: previous.hideLeft || nextSeams.hideLeft,
                        hideRight: previous.hideRight || nextSeams.hideRight,
                        hideTop: previous.hideTop || nextSeams.hideTop,
                        hideBottom: previous.hideBottom || nextSeams.hideBottom,
                    }
                    : nextSeams);
            }
        }

        for (const key of this.streakBarDimSlots)
        {
            if (!nextKeys.has(key))
            {
                this.setSlotChainChrome(key, null);
            }
        }

        for (const key of nextKeys)
        {
            this.setSlotChainChrome(key, seamsByKey.get(key) ?? null);
        }

        this.streakBarDimSlots = nextKeys;
    }

    private stopStreakLightning (): void
    {
        for (let i = 0; i < this.streakStormTimers.length; i++)
        {
            this.streakStormTimers[i]?.remove(false);
            this.streakStormTimers[i] = undefined;
        }

        this.streakStormTimers.length = 0;

        while (this.streakStormStrikeGfx.length > 0)
        {
            const gfx = this.streakStormStrikeGfx.pop();

            if (gfx?.active)
            {
                this.scene.tweens.killTweensOf(gfx);
                gfx.destroy();
            }
        }

        this.streakBarGfx.clear();
        this.streakBarGfx.setAlpha(1);
    }

    private startStreakLightning (): void
    {
        this.stopStreakLightning();

        const activeRuns = this.streakBarRuns.filter((run) => run.slots.length >= 2);

        if (activeRuns.length === 0)
        {
            return;
        }

        // Each streak set gets its own randomized storm clock.
        activeRuns.forEach((run, index) =>
        {
            this.scheduleRunStormStrike(run, true, index);
        });
    }

    private scheduleRunStormStrike (
        run: StreakBarRun,
        immediate: boolean,
        setIndex: number,
    ): void
    {
        const runStillPresent = (): boolean => this.streakBarRuns.some((candidate) =>
            candidate.behaviorId === run.behaviorId
            && candidate.slots.length === run.slots.length
            && candidate.slots.every((slot, i) =>
                slot.row === run.slots[i]?.row && slot.col === run.slots[i]?.col));

        if (!runStillPresent())
        {
            return;
        }

        // Cosmetics only — not game RNG. Each set has its own beat.
        const delay = immediate
            ? 350 + setIndex * 420 + Math.random() * 900
            : 1200 + Math.random() * 2400;

        this.streakStormTimers[setIndex]?.remove(false);

        this.streakStormTimers[setIndex] = this.scene.time.delayedCall(delay, () =>
        {
            if (!runStillPresent())
            {
                return;
            }

            this.fireRunStormStrike(run);
            this.scheduleRunStormStrike(run, false, setIndex);
        });
    }

    private fireRunStormStrike (run: StreakBarRun): void
    {
        const gfx = this.scene.add.graphics();
        const centers = run.slots.map((slot) => this.slotCenter(slot));
        const palette = streakStormColor(run.behaviorId);

        this.container.add(gfx);
        this.container.bringToTop(gfx);
        this.container.bringToTop(this.streakBarLabels);
        this.streakStormStrikeGfx.push(gfx);

        this.drawThroughBolt(gfx, centers, palette.glow);

        for (const point of centers)
        {
            const rect = this.cardInnerRect(point);

            gfx.fillStyle(palette.glow, 0.12 + Math.random() * 0.08);
            gfx.fillRoundedRect(rect.left, rect.top, rect.width, rect.height, 4);
        }

        gfx.setAlpha(1);

        this.scene.time.delayedCall(90, () =>
        {
            if (!gfx.active)
            {
                return;
            }

            gfx.setAlpha(0.3);
            this.scene.time.delayedCall(70, () =>
            {
                if (!gfx.active)
                {
                    return;
                }

                gfx.setAlpha(1);
                this.scene.tweens.add({
                    targets: gfx,
                    alpha: 0,
                    duration: 420,
                    ease: 'Cubic.easeOut',
                    onComplete: () =>
                    {
                        const index = this.streakStormStrikeGfx.indexOf(gfx);

                        if (index >= 0)
                        {
                            this.streakStormStrikeGfx.splice(index, 1);
                        }

                        gfx.destroy();
                    },
                });
            });
        });
    }

    private cardInnerRect (center: { x: number; y: number }): {
        left: number;
        right: number;
        top: number;
        bottom: number;
        width: number;
        height: number;
    }
    {
        const size = this.layout.tileSize - SLOT_INSET * 2;
        const pad = 7;

        return {
            left: center.x - size / 2 + pad,
            right: center.x + size / 2 - pad,
            top: center.y - size / 2 + pad,
            bottom: center.y + size / 2 - pad,
            width: size - pad * 2,
            height: size - pad * 2,
        };
    }

    private clampToCardInner (
        point: { x: number; y: number },
        center: { x: number; y: number },
    ): { x: number; y: number }
    {
        const rect = this.cardInnerRect(center);

        return {
            x: Math.max(rect.left, Math.min(rect.right, point.x)),
            y: Math.max(rect.top, Math.min(rect.bottom, point.y)),
        };
    }

    private pointAlongCenters (
        centers: readonly { x: number; y: number }[],
        t: number,
    ): { x: number; y: number }
    {
        if (centers.length === 1)
        {
            return { ...centers[0]! };
        }

        let total = 0;
        const lengths: number[] = [];

        for (let i = 1; i < centers.length; i++)
        {
            const len = Math.hypot(
                centers[i]!.x - centers[i - 1]!.x,
                centers[i]!.y - centers[i - 1]!.y,
            );

            lengths.push(len);
            total += len;
        }

        const target = Math.max(0, Math.min(1, t)) * Math.max(total, 1);
        let walked = 0;

        for (let i = 0; i < lengths.length; i++)
        {
            const seg = lengths[i]!;
            const from = centers[i]!;
            const to = centers[i + 1]!;

            if (walked + seg >= target || i === lengths.length - 1)
            {
                const local = seg <= 0 ? 0 : (target - walked) / seg;
                const clamped = Math.max(0, Math.min(1, local));

                return {
                    x: from.x + (to.x - from.x) * clamped,
                    y: from.y + (to.y - from.y) * clamped,
                };
            }

            walked += seg;
        }

        return { ...centers[centers.length - 1]! };
    }

    private nearestCardCenter (
        point: { x: number; y: number },
        centers: readonly { x: number; y: number }[],
    ): { x: number; y: number }
    {
        let best = centers[0]!;
        let bestDist = Number.POSITIVE_INFINITY;

        for (const center of centers)
        {
            const dist = Math.hypot(point.x - center.x, point.y - center.y);

            if (dist < bestDist)
            {
                bestDist = dist;
                best = center;
            }
        }

        return best;
    }

    /** One continuous storm bolt threading through every card in the run (stays inside faces). */
    private drawThroughBolt (
        gfx: Phaser.GameObjects.Graphics,
        centers: readonly { x: number; y: number }[],
        glow: number,
    ): void
    {
        if (centers.length === 0)
        {
            return;
        }

        const samples = Math.max(10, centers.length * 6);
        const path: { x: number; y: number }[] = [];

        for (let i = 0; i <= samples; i++)
        {
            const t = i / samples;
            const along = this.pointAlongCenters(centers, t);
            const host = this.nearestCardCenter(along, centers);
            const rect = this.cardInnerRect(host);
            const zig = (i === 0 || i === samples)
                ? 0
                : (i % 2 === 0 ? 1 : -1) * (rect.width * (0.12 + Math.random() * 0.16));
            const angle = i < samples
                ? Math.atan2(
                    this.pointAlongCenters(centers, Math.min(1, t + 1 / samples)).y - along.y,
                    this.pointAlongCenters(centers, Math.min(1, t + 1 / samples)).x - along.x,
                )
                : 0;
            const perp = angle + Math.PI / 2;

            path.push(this.clampToCardInner({
                x: along.x + Math.cos(perp) * zig,
                y: along.y + Math.sin(perp) * zig * 0.85,
            }, host));
        }

        this.strokeBoltPath(gfx, path, false, glow);

        if (Math.random() > 0.4 && path.length > 6)
        {
            const forkAt = 3 + Math.floor(Math.random() * (path.length - 6));
            const origin = path[forkAt]!;
            const host = this.nearestCardCenter(origin, centers);
            const rect = this.cardInnerRect(host);
            const forkEnd = this.clampToCardInner({
                x: origin.x + (Math.random() - 0.5) * rect.width * 0.7,
                y: origin.y + rect.height * (0.15 + Math.random() * 0.35),
            }, host);

            this.strokeBoltPath(gfx, [
                origin,
                this.clampToCardInner({
                    x: (origin.x + forkEnd.x) / 2 + (Math.random() - 0.5) * 10,
                    y: (origin.y + forkEnd.y) / 2,
                }, host),
                forkEnd,
            ], true, glow);
        }
    }

    private strokeBoltPath (
        gfx: Phaser.GameObjects.Graphics,
        path: readonly { x: number; y: number }[],
        branch: boolean,
        glow: number,
    ): void
    {
        if (path.length < 2)
        {
            return;
        }

        const outer = branch ? 3 : 5;
        const inner = branch ? 1.2 : 2.2;
        const outerAlpha = branch ? 0.35 : 0.55;

        gfx.lineStyle(outer, glow, outerAlpha);
        gfx.beginPath();
        gfx.moveTo(path[0]!.x, path[0]!.y);

        for (let i = 1; i < path.length; i++)
        {
            gfx.lineTo(path[i]!.x, path[i]!.y);
        }

        gfx.strokePath();

        gfx.lineStyle(inner, 0xffffff, branch ? 0.7 : 0.95);
        gfx.beginPath();
        gfx.moveTo(path[0]!.x, path[0]!.y);

        for (let i = 1; i < path.length; i++)
        {
            gfx.lineTo(path[i]!.x, path[i]!.y);
        }

        gfx.strokePath();

        const tip = path[path.length - 1]!;

        gfx.fillStyle(0xffffff, 0.85);
        gfx.fillCircle(tip.x, tip.y, branch ? 2 : 4);
        gfx.fillStyle(glow, 0.4);
        gfx.fillCircle(tip.x, tip.y, branch ? 5 : 10);
    }

    private redrawStreakBars (): void
    {
        this.stopStreakLightning();
        this.streakBarGfx.clear();
        this.streakBarLabels.removeAll(true);

        if (this.streakBarRuns.length === 0)
        {
            return;
        }

        this.container.bringToTop(this.streakBarGfx);
        this.container.bringToTop(this.streakBarLabels);

        for (const run of this.streakBarRuns)
        {
            if (run.slots.length < 2)
            {
                continue;
            }

            const points = run.slots.map((slot) => this.slotCenter(slot));
            const midIndex = (points.length - 1) / 2;
            const midA = points[Math.floor(midIndex)]!;
            const midB = points[Math.ceil(midIndex)]!;
            const labelX = (midA.x + midB.x) / 2;
            const labelY = (midA.y + midB.y) / 2 - this.layout.tileSize * 0.38;
            const palette = streakStormColor(run.behaviorId);
            const label = this.scene.add.text(labelX, labelY, run.label, {
                ...uiDisplayTextStyle(run.kind === 'combo' ? 13 : 15, palette.label, { bold: true }),
            }).setOrigin(0.5);

            this.streakBarLabels.add(label);
        }

        this.startStreakLightning();
    }

    /** When true, all start-column tiles show pick hints (between attacks). */
    setChainStartPickable (pickable: boolean): void
    {
        if (this.chainStartPickable === pickable)
        {
            return;
        }

        this.chainStartPickable = pickable;
        this.refreshAxisLegendStyles();
        this.refreshChainStartPickableVisuals();
        this.updateChainStartSelection();
    }

    setChainStartActive (active: boolean): void
    {
        this.chainStartTween?.stop();
        this.chainStartTween = undefined;

        const indicator = this.getSelectedChainStartIndicator();

        if (!indicator)
        {
            return;
        }

        indicator.ring.setScale(1);
        this.scene.tweens.killTweensOf(indicator.brackets);

        if (active)
        {
            indicator.ring.setStrokeStyle(3, CYBER.cyan, 1);
            indicator.ring.setOrigin(0.5, 0.5);
            this.chainStartTween = this.scene.tweens.add({
                targets: indicator.ring,
                alpha: { from: 0.45, to: 1 },
                scaleX: { from: 0.96, to: 1.06 },
                scaleY: { from: 0.96, to: 1.06 },
                duration: 320,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
            this.scene.tweens.add({
                targets: indicator.brackets,
                alpha: { from: 0.55, to: 1 },
                duration: 320,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
            return;
        }

        this.updateChainStartSelection();
    }

    /** Highlights the column label for the slot currently resolving in the chain. */
    setActiveCoordinate (slot: SlotPosition | null): void
    {
        this.activeCoordinate = slot ? { ...slot } : null;
        this.refreshAxisLegendStyles();
    }

    getCardVisualTarget (slot: SlotPosition): import('../cardGame/presentation/visualEffects/types').CardVisualTarget | null
    {
        const wrapper = this.cardContainers[slot.row]?.[slot.col];

        if (!wrapper)
        {
            return null;
        }

        const { tileSize } = GRID_CONFIG;
        const slotSize = tileSize - SLOT_INSET * 2;

        return { slot, wrapper, width: slotSize, height: slotSize };
    }

    bringCardToFront (slot: SlotPosition): void
    {
        const wrapper = this.cardContainers[slot.row]?.[slot.col];

        if (wrapper)
        {
            this.container.bringToTop(wrapper);
        }
    }

    applyLayout (layout: BoardLayout): void
    {
        this.layout = layout;
        this.container.setPosition(layout.gridOffsetX, layout.gridOffsetY);
    }

    showJokerDirectionPicker (
        slot: SlotPosition,
        onChoose: (direction: CardDirection) => void,
    ): void
    {
        const directions = getJokerDirectionChoices(this.board, slot);

        if (directions.length === 0)
        {
            onChoose('right');
            return;
        }

        this.jokerDirectionPicker.show(
            this.scene,
            this.layout.gridOffsetX,
            this.layout.gridOffsetY,
            slot,
            directions,
            onChoose,
        );
    }

    hideJokerDirectionPicker (): void
    {
        this.jokerDirectionPicker.hide();
    }

    /** Swaps Reroute's `?` for the chosen chain arrow after the player picks. */
    setCardDirectionMark (slot: SlotPosition, direction: CardDirection): void
    {
        const wrapper = this.cardContainers[slot.row]?.[slot.col];
        const graphic = wrapper?.getData('cardGraphic') as Phaser.GameObjects.Container | undefined;

        if (!wrapper || !graphic)
        {
            return;
        }

        const size = GRID_CONFIG.tileSize - SLOT_INSET * 2;

        updateCardGraphicDirection(this.scene, graphic, direction, size, size);
    }

    findSlotAt (worldX: number, worldY: number): SlotPosition | null
    {
        const { tileSize, cols, rows } = GRID_CONFIG;
        const localX = worldX - this.layout.gridOffsetX;
        const localY = worldY - this.layout.gridOffsetY;
        const col = Math.floor(localX / tileSize);
        const row = Math.floor(localY / tileSize);

        if (col < 0 || col >= cols || row < 0 || row >= rows)
        {
            return null;
        }

        return { row, col };
    }

    findDropSlot (worldX: number, worldY: number): SlotPosition | null
    {
        const slot = this.findSlotAt(worldX, worldY);

        if (!slot || !this.board.isEmpty(slot))
        {
            return null;
        }

        return slot;
    }

    highlightSlot (slot: SlotPosition | null, mode: BoardHighlightMode): void
    {
        if (
            slot?.row === this.highlightedSlot?.row
            && slot?.col === this.highlightedSlot?.col
            && mode === this.highlightMode
        )
        {
            return;
        }

        this.clearHighlight();
        this.highlightedSlot = slot;
        this.highlightMode = mode;

        if (!slot || !mode)
        {
            return;
        }

        const body = this.slotBodies[slot.row][slot.col];
        const styles: Record<Exclude<BoardHighlightMode, null>, { fill: number; stroke: number }> = {
            place: { fill: SLOT_DROP, stroke: 0x5dade2 },
            replace: { fill: SLOT_REPLACE, stroke: 0xf39c12 },
            move: { fill: SLOT_MOVE, stroke: 0x58d68d },
            swap: { fill: SLOT_SWAP, stroke: 0xbb8fce },
        };
        const style = styles[mode];

        body.setFillStyle(style.fill);
        body.setStrokeStyle(2, style.stroke, 1);
    }

    highlightHandPlacement (worldX: number, worldY: number): void
    {
        const slot = this.findSlotAt(worldX, worldY);

        if (!slot)
        {
            this.clearHighlight();
            return;
        }

        this.highlightSlot(slot, this.board.isEmpty(slot) ? 'place' : 'replace');
    }

    highlightBoardDrag (fromSlot: SlotPosition, worldX: number, worldY: number): void
    {
        const slot = this.findSlotAt(worldX, worldY);

        if (!slot || (slot.row === fromSlot.row && slot.col === fromSlot.col))
        {
            this.clearHighlight();
            return;
        }

        if (this.board.isEmpty(slot))
        {
            this.highlightSlot(slot, 'move');
            return;
        }

        this.highlightSlot(slot, 'swap');
    }

    clearHighlight (): void
    {
        if (!this.highlightedSlot)
        {
            return;
        }

        const { row, col } = this.highlightedSlot;
        const body = this.slotBodies[row][col];

        body.setFillStyle(SLOT_FILL);
        body.setStrokeStyle(2, SLOT_BORDER, 0.9);
        this.highlightedSlot = null;
        this.highlightMode = null;
    }

    removeCard (slot: SlotPosition): void
    {
        this.cardContainers[slot.row][slot.col]?.destroy();
        this.cardContainers[slot.row][slot.col] = null;
        this.slotBodies[slot.row][slot.col].setVisible(true);
        this.slotBodies[slot.row][slot.col].setFillStyle(SLOT_FILL);
        this.slotBodies[slot.row][slot.col].setStrokeStyle(2, SLOT_BORDER, 0.9);
        this.clearHighlight();
        this.bringChainStartToFront();
        this.refreshChainStartHitAreas();
    }

    moveCard (from: SlotPosition, to: SlotPosition): void
    {
        const { tileSize } = GRID_CONFIG;
        const wrapper = this.cardContainers[from.row][from.col];

        if (!wrapper)
        {
            return;
        }

        this.cardContainers[to.row][to.col]?.destroy();

        const x = to.col * tileSize + tileSize / 2;
        const y = to.row * tileSize + tileSize / 2;
        const size = tileSize - SLOT_INSET * 2;

        wrapper.setPosition(x - size / 2, y - size / 2);
        wrapper.setData('slotRow', to.row);
        wrapper.setData('slotCol', to.col);
        this.normalizeWrapper(wrapper);
        this.cardContainers[to.row][to.col] = wrapper;
        this.cardContainers[from.row][from.col] = null;
        this.slotBodies[from.row][from.col].setVisible(true);
        this.slotBodies[from.row][from.col].setFillStyle(SLOT_FILL);
        this.slotBodies[from.row][from.col].setStrokeStyle(2, SLOT_BORDER, 0.9);
        this.slotBodies[to.row][to.col].setVisible(false);
        this.clearHighlight();
        this.bringChainStartToFront();
        this.refreshChainStartHitAreas();
    }

    swapCards (a: SlotPosition, b: SlotPosition): void
    {
        const { tileSize } = GRID_CONFIG;
        const wrapperA = this.cardContainers[a.row][a.col];
        const wrapperB = this.cardContainers[b.row][b.col];
        const size = tileSize - SLOT_INSET * 2;

        const positionFor = (slot: SlotPosition): { x: number; y: number } =>
        {
            const x = slot.col * tileSize + tileSize / 2;
            const y = slot.row * tileSize + tileSize / 2;

            return { x: x - size / 2, y: y - size / 2 };
        };

        if (wrapperA)
        {
            const pos = positionFor(b);
            wrapperA.setPosition(pos.x, pos.y);
            wrapperA.setData('slotRow', b.row);
            wrapperA.setData('slotCol', b.col);
            this.normalizeWrapper(wrapperA);
        }

        if (wrapperB)
        {
            const pos = positionFor(a);
            wrapperB.setPosition(pos.x, pos.y);
            wrapperB.setData('slotRow', a.row);
            wrapperB.setData('slotCol', a.col);
            this.normalizeWrapper(wrapperB);
        }

        this.cardContainers[a.row][a.col] = wrapperB;
        this.cardContainers[b.row][b.col] = wrapperA;
        this.slotBodies[a.row][a.col].setVisible(wrapperB === null);
        this.slotBodies[b.row][b.col].setVisible(wrapperA === null);

        if (wrapperB === null)
        {
            this.slotBodies[a.row][a.col].setFillStyle(SLOT_FILL);
            this.slotBodies[a.row][a.col].setStrokeStyle(2, SLOT_BORDER, 0.9);
        }

        if (wrapperA === null)
        {
            this.slotBodies[b.row][b.col].setFillStyle(SLOT_FILL);
            this.slotBodies[b.row][b.col].setStrokeStyle(2, SLOT_BORDER, 0.9);
        }

        this.clearHighlight();
        this.bringChainStartToFront();
        this.refreshChainStartHitAreas();
    }

    placeCard (slot: SlotPosition, card: CardInstance): void
    {
        this.setSlotCard(slot, card);
        this.playSlotPlaceSettle(slot);
        this.refreshChainStartHitAreas();
    }

    /** Settle tween for a card that just landed on a tile. */
    playSlotPlaceSettle (slot: SlotPosition): void
    {
        const wrapper = this.cardContainers[slot.row]?.[slot.col];

        if (wrapper)
        {
            playCardPlaceSettle(this.scene, wrapper);
        }
    }

    /** Soft flash when the board clears into a new energy round. */
    playRoundResetFlash (): void
    {
        const { cols, rows, tileSize } = GRID_CONFIG;
        const flash = this.scene.add.rectangle(
            (cols * tileSize) / 2,
            (rows * tileSize) / 2,
            cols * tileSize + 20,
            rows * tileSize + 20,
            CYBER.cyan,
            0.22,
        );

        this.container.add(flash);
        this.container.bringToTop(flash);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 280,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy(),
        });
    }

    /** Marks board slots the player cannot place cards on. */
    setBlockedSlots (
        silenced: readonly SlotPosition[],
        bombDisabled: readonly SlotPosition[],
    ): void
    {
        this.setSlotOverlays(
            silenced,
            this.silencedOverlays,
            SLOT_SILENCED,
            SLOT_SILENCED_BORDER,
        );
        this.setSlotOverlays(
            bombDisabled,
            this.bombDisabledOverlays,
            SLOT_BOMB_DISABLED,
            SLOT_BOMB_DISABLED_BORDER,
        );
    }

    /** Marks tiles weakened by the enemy's Dead Zone field. */
    setDampenedSlots (slots: readonly SlotPosition[]): void
    {
        this.setSlotOverlays(
            slots,
            this.dampenedOverlays,
            SLOT_DAMPENED,
            SLOT_DAMPENED_BORDER,
        );
    }

    /** Marks tiles on an active Null Strip (cards placeable, payloads dead). */
    setNullifiedSlots (slots: readonly SlotPosition[]): void
    {
        this.setSlotOverlays(
            slots,
            this.nullifiedOverlays,
            SLOT_NULLIFIED,
            SLOT_NULLIFIED_BORDER,
        );
    }

    private setSlotOverlays (
        slots: readonly SlotPosition[],
        overlays: (Phaser.GameObjects.Rectangle | null)[][],
        fill: number,
        border: number,
    ): void
    {
        const active = new Set(slots.map((slot) => `${slot.row},${slot.col}`));
        const { rows, cols, tileSize } = GRID_CONFIG;

        for (let row = 0; row < rows; row++)
        {
            for (let col = 0; col < cols; col++)
            {
                const key = `${row},${col}`;
                const existing = overlays[row][col];

                if (!active.has(key))
                {
                    existing?.destroy();
                    overlays[row][col] = null;
                    continue;
                }

                if (existing)
                {
                    continue;
                }

                const x = col * tileSize + tileSize / 2;
                const y = row * tileSize + tileSize / 2;
                const slotSize = tileSize - SLOT_INSET * 2;
                const overlay = this.scene.add.rectangle(
                    x,
                    y,
                    slotSize,
                    slotSize,
                    fill,
                    0.55,
                );

                overlay.setStrokeStyle(2, border, 0.95);
                overlay.setDepth(1);
                this.container.add(overlay);
                overlays[row][col] = overlay;
            }
        }
    }

    /** Rebuilds all card visuals from the board model — prevents ghost cards after moves/swaps/replaces. */
    syncFromBoard (board: BoardModel): void
    {
        this.hideJokerDirectionPicker();
        this.clearHighlight();

        const { rows, cols, tileSize } = GRID_CONFIG;

        for (let row = 0; row < rows; row++)
        {
            for (let col = 0; col < cols; col++)
            {
                this.cardContainers[row][col]?.destroy();
                this.cardContainers[row][col] = null;

                const slotBody = this.slotBodies[row][col];

                slotBody.setVisible(true);
                slotBody.setFillStyle(SLOT_FILL);
                slotBody.setStrokeStyle(2, SLOT_BORDER, 0.9);
            }
        }

        for (let row = 0; row < rows; row++)
        {
            for (let col = 0; col < cols; col++)
            {
                const card = board.getCardAt({ row, col });

                if (card)
                {
                    this.setSlotCard({ row, col }, card, tileSize);
                }
            }
        }

        this.syncStreakCardChrome();
        this.redrawStreakBars();
        this.bringChainStartToFront();
    }

    /** Flies proxy cards to the graveyard or exhaust pile, then resets empty slots. Latch pins stay. */
    animateCardsToPiles (
        targets: { graveyard: { x: number; y: number }; exhaust: { x: number; y: number } },
        onComplete: () => void,
        keepInstanceIds: ReadonlySet<string> = new Set(),
    ): void
    {
        this.hideJokerDirectionPicker();
        this.clearHighlight();
        this.setChainStartActive(false);

        const { tileSize } = GRID_CONFIG;
        const cardSize = tileSize - SLOT_INSET * 2;
        const flights: { proxy: Phaser.GameObjects.Container; x: number; y: number }[] = [];

        for (let row = 0; row < GRID_CONFIG.rows; row++)
        {
            for (let col = 0; col < GRID_CONFIG.cols; col++)
            {
                const wrapper = this.cardContainers[row][col];
                const card = this.board.getCardAt({ row, col });

                if (!wrapper || !card)
                {
                    continue;
                }

                if (keepInstanceIds.has(card.instanceId))
                {
                    continue;
                }

                const matrix = wrapper.getWorldTransformMatrix();
                const { container: graphic } = buildCardGraphic(this.scene, card, {
                    width: cardSize,
                    height: cardSize,
                });
                const proxy = this.scene.add.container(matrix.tx, matrix.ty);
                const dest = card.exhausted ? targets.exhaust : targets.graveyard;

                proxy.setDepth(1500);
                proxy.add(graphic);
                flights.push({ proxy, x: dest.x, y: dest.y });

                this.scene.tweens.killTweensOf(wrapper);
                wrapper.setScale(1);
                wrapper.setAlpha(1);
                wrapper.destroy();
                this.cardContainers[row][col] = null;

                const slotBody = this.slotBodies[row][col];

                slotBody.setVisible(true);
                slotBody.setFillStyle(SLOT_FILL);
                slotBody.setStrokeStyle(2, SLOT_BORDER, 0.9);
            }
        }

        if (flights.length === 0)
        {
            onComplete();
            return;
        }

        let completed = false;

        const finish = (): void =>
        {
            if (completed)
            {
                return;
            }

            completed = true;

            for (const { proxy } of flights)
            {
                this.scene.tweens.killTweensOf(proxy);
                proxy.destroy();
            }

            onComplete();
        };

        for (const flight of flights)
        {
            this.scene.tweens.add({
                targets: flight.proxy,
                x: flight.x,
                y: flight.y,
                angle: flight.proxy.angle + 180,
                scaleX: 0.25,
                scaleY: 0.25,
                alpha: 0,
                duration: 480,
                ease: 'Back.easeIn',
                onComplete: finish,
            });
        }

        this.scene.time.delayedCall(520, finish);
    }

    clearBoard (): void
    {
        this.hideJokerDirectionPicker();

        const { rows, cols } = GRID_CONFIG;

        for (let row = 0; row < rows; row++)
        {
            for (let col = 0; col < cols; col++)
            {
                const wrapper = this.cardContainers[row][col];

                if (wrapper)
                {
                    this.scene.tweens.killTweensOf(wrapper);
                    wrapper.setScale(1);
                    wrapper.setAlpha(1);
                    wrapper.destroy();
                }

                this.cardContainers[row][col] = null;

                const slotBody = this.slotBodies[row][col];

                slotBody.setVisible(true);
                slotBody.setFillStyle(SLOT_FILL);
                slotBody.setStrokeStyle(2, SLOT_BORDER, 0.9);
            }
        }

        this.clearHighlight();
        this.setChainStartActive(false);
        this.setActiveCoordinate(null);
        this.bringChainStartToFront();
    }

    destroy (): void
    {
        this.cancelBoardDrag();
        this.hideJokerDirectionPicker();
        this.chainStartTween?.stop();
        this.chainStartIdleTween?.stop();
        this.clearChainPath();
        this.container.destroy();
    }

    private drawAxisLegend (
        cols: number,
        rows: number,
        tileSize: number,
        panelPad: number,
    ): void
    {
        const axisY = -panelPad - 12;

        this.colAxisLabels.length = 0;

        for (let col = 0; col < cols; col++)
        {
            const labelText = col === GAME_RULES.activationStartColumn
                ? 'START'
                : boardColLabel(col);
            const label = this.scene.add.text(
                col * tileSize + tileSize / 2,
                axisY,
                labelText,
                uiTextStyle(11, AXIS_IDLE, { bold: true, stroke: false }),
            );
            label.setOrigin(0.5, 1);
            this.container.add(label);
            this.colAxisLabels[col] = label;
        }

        this.refreshAxisLegendStyles();
        this.bringAxisLegendToFront();
    }

    private refreshAxisLegendStyles (): void
    {
        const startCol = GAME_RULES.activationStartColumn;
        const activeCol = this.activeCoordinate?.col ?? null;

        for (let col = 0; col < this.colAxisLabels.length; col++)
        {
            const label = this.colAxisLabels[col];

            if (!label)
            {
                continue;
            }

            const active = activeCol === col;
            const start = col === startCol;
            label.setColor(active ? AXIS_ACTIVE : start ? AXIS_START : AXIS_IDLE);
            label.setScale(active ? 1.2 : start ? 1.08 : 1);
            label.setAlpha(active || start || activeCol === null ? 1 : 0.55);
        }
    }

    private redrawChainStartBrackets (
        brackets: Phaser.GameObjects.Graphics,
        slot: SlotPosition,
        tileSize: number,
        selected: boolean,
    ): void
    {
        const slotSize = tileSize - SLOT_INSET * 2;
        const left = slot.col * tileSize + SLOT_INSET;
        const top = slot.row * tileSize + SLOT_INSET;
        const color = selected ? CHAIN_START_SELECTED : CHAIN_START_IDLE;

        drawCornerBrackets(brackets, left, top, slotSize, slotSize, color, {
            arm: Math.max(8, Math.round(slotSize * 0.22)),
            lineWidth: selected ? 2 : 1,
            alpha: selected ? 0.95 : 0.42,
        });
    }

    private drawChainStartIndicators (): void
    {
        const { tileSize, rows } = GRID_CONFIG;
        const startCol = GAME_RULES.activationStartColumn;

        this.chainStartColumnGlow = this.scene.add.rectangle(
            startCol * tileSize + tileSize / 2,
            (rows * tileSize) / 2,
            tileSize + 6,
            rows * tileSize + 4,
            CHAIN_START_SELECTED,
            0,
        );
        this.chainStartColumnGlow.setOrigin(0.5, 0.5);
        this.chainStartColumnGlow.setVisible(false);
        this.container.add(this.chainStartColumnGlow);

        for (let row = 0; row < rows; row++)
        {
            const slot = { row, col: startCol };
            const centerX = slot.col * tileSize + tileSize / 2;
            const centerY = slot.row * tileSize + tileSize / 2;
            const slotSize = tileSize - SLOT_INSET * 2;

            const ring = this.scene.add.rectangle(
                centerX,
                centerY,
                slotSize + 8,
                slotSize + 8,
                0x000000,
                0,
            );
            ring.setOrigin(0.5, 0.5);

            const brackets = this.scene.add.graphics();
            this.redrawChainStartBrackets(brackets, slot, tileSize, false);

            const badge = this.scene.add.text(
                centerX,
                centerY + slotSize * 0.28,
                CHAIN_START_BADGE,
                uiTextStyle(9, '#7af0ff', { bold: true, stroke: false }),
            ).setOrigin(0.5, 0.5);
            badge.setVisible(false);

            // Full cell hit target — click the first-column tile to set chain start
            // without needing a card from hand.
            const hitArea = this.scene.add.rectangle(
                centerX,
                centerY,
                slotSize + 8,
                slotSize + 8,
                0x000000,
                0.001,
            );

            hitArea.setInteractive({ cursor: getGameCursors().pointer });
            hitArea.on('pointerdown', () =>
            {
                this.trySelectChainStart(slot);
            });

            this.container.add([ ring, brackets, badge, hitArea ]);
            this.chainStartIndicators.push({ slot, ring, brackets, badge, hitArea });
        }

        this.bringChainStartToFront();
        this.refreshChainStartHitAreas();
        this.updateChainStartSelection();
    }

    private trySelectChainStart (slot: SlotPosition): void
    {
        if (!this.chainStartHandlers?.canSelect())
        {
            return;
        }

        this.chainStartHandlers.onSelect(slot);
    }

    /** Full-cell hits when empty; player cards use tap-vs-drag instead. */
    private refreshChainStartHitAreas (): void
    {
        for (const indicator of this.chainStartIndicators)
        {
            if (this.startSlotUsesCardTap(indicator.slot))
            {
                indicator.hitArea.disableInteractive();
            }
            else if (!indicator.hitArea.input)
            {
                indicator.hitArea.setInteractive({ cursor: getGameCursors().pointer });
            }
        }
    }

    private startSlotUsesCardTap (slot: SlotPosition): boolean
    {
        const card = this.board.getCardAt(slot);

        if (!card || isEnemyOwnedCard(card) || isFieldOwnedCard(card))
        {
            return false;
        }

        return true;
    }

    private getSelectedChainStartIndicator (): ChainStartIndicator | undefined
    {
        return this.chainStartIndicators.find((indicator) =>
            indicator.slot.row === this.chainStartSlot.row
            && indicator.slot.col === this.chainStartSlot.col);
    }

    private updateChainStartSelection (): void
    {
        const { tileSize } = GRID_CONFIG;
        const showPickHints = this.chainStartPickable && this.chainStartHandlers?.canSelect();

        for (const indicator of this.chainStartIndicators)
        {
            const selected = indicator.slot.row === this.chainStartSlot.row
                && indicator.slot.col === this.chainStartSlot.col;

            if (!selected)
            {
                indicator.ring.setVisible(false);
                indicator.brackets.setVisible(false);
                indicator.badge.setVisible(false);
                indicator.badge.setAlpha(0);
                continue;
            }

            indicator.ring.setVisible(true);
            indicator.brackets.setVisible(true);
            indicator.ring.setAlpha(1);
            indicator.brackets.setAlpha(1);
            this.redrawChainStartBrackets(
                indicator.brackets,
                indicator.slot,
                tileSize,
                true,
            );

            indicator.badge.setText(CHAIN_START_BADGE);
            indicator.badge.setVisible(true);
            indicator.badge.setAlpha(1);
            indicator.badge.setColor('#fcee0a');

            indicator.ring.setStrokeStyle(
                2,
                CHAIN_START_SELECTED,
                showPickHints ? 0.95 : 0.65,
            );
        }

        this.bringChainStartToFront();
        this.refreshChainStartPickableVisuals();
    }

    private refreshChainStartPickableVisuals (): void
    {
        this.chainStartColumnGlow?.setVisible(false);
        this.chainStartColumnGlow?.setAlpha(0);

        this.chainStartIdleTween?.stop();
        this.chainStartIdleTween = undefined;

        const selected = this.getSelectedChainStartIndicator();

        if (selected)
        {
            selected.ring.setScale(1);
            this.scene.tweens.killTweensOf(selected.ring);
        }
    }

    private bringChainStartToFront (): void
    {
        for (const indicator of this.chainStartIndicators)
        {
            this.container.bringToTop(indicator.ring);
            this.container.bringToTop(indicator.brackets);
            this.container.bringToTop(indicator.badge);
            this.container.bringToTop(indicator.hitArea);
        }

        this.bringAxisLegendToFront();
        this.refreshChainStartHitAreas();
    }

    private bringAxisLegendToFront (): void
    {
        for (const label of this.colAxisLabels)
        {
            if (label)
            {
                this.container.bringToTop(label);
            }
        }
    }

    private setSlotCard (slot: SlotPosition, card: CardInstance | null, tileSize = GRID_CONFIG.tileSize): void
    {
        const slotBody = this.slotBodies[slot.row][slot.col];

        this.cardContainers[slot.row][slot.col]?.destroy();
        this.cardContainers[slot.row][slot.col] = null;

        if (!card)
        {
            slotBody.setVisible(true);
            slotBody.setFillStyle(SLOT_FILL);
            slotBody.setStrokeStyle(2, SLOT_BORDER, 0.9);
            return;
        }

        const x = slot.col * tileSize + tileSize / 2;
        const y = slot.row * tileSize + tileSize / 2;

        slotBody.setVisible(false);

        const wrapper = this.drawCard(slot, x, y, tileSize, card);

        this.normalizeWrapper(wrapper);
        this.cardContainers[slot.row][slot.col] = wrapper;
    }

    private drawCard (
        slot: SlotPosition,
        x: number,
        y: number,
        tileSize: number,
        card: CardInstance,
    ): Phaser.GameObjects.Container
    {
        const size = tileSize - SLOT_INSET * 2;
        const { container: graphic, hitArea } = buildCardGraphic(
            this.scene,
            card,
            {
                width: size,
                height: size,
                interactive: true,
            },
        );
        const wrapper = this.scene.add.container(x - size / 2, y - size / 2);

        wrapper.setDepth(1);
        wrapper.add(graphic);
        wrapper.setData('slotRow', slot.row);
        wrapper.setData('slotCol', slot.col);
        wrapper.setData('cardGraphic', graphic);
        this.container.add(wrapper);
        this.container.bringToTop(wrapper);

        if (card.spent)
        {
            wrapper.setAlpha(0.42);
        }

        if (this.boardDragHandlers)
        {
            hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
            {
                const row = wrapper.getData('slotRow') as number;
                const col = wrapper.getData('slotCol') as number;
                const currentSlot = { row, col };
                const currentCard = this.board.getCardAt(currentSlot);

                if (!currentCard || isEnemyOwnedCard(currentCard) || isFieldOwnedCard(currentCard))
                {
                    return;
                }

                const startCol = GAME_RULES.activationStartColumn;

                if (col === startCol)
                {
                    this.beginStartColumnPointer(currentSlot, currentCard, pointer, size);
                    return;
                }

                if (currentCard.exhausted)
                {
                    return;
                }

                this.beginBoardDrag(currentSlot, currentCard, pointer, size);
            });
        }

        attachCardTooltip(this.scene, hitArea, card);

        return wrapper;
    }

    /** Start-column cards: tap sets chain start; drag still moves the card. */
    private beginStartColumnPointer (
        slot: SlotPosition,
        card: CardInstance,
        pointer: Phaser.Input.Pointer,
        size: number,
    ): void
    {
        if (!this.boardDragHandlers?.canDrag() || this.draggingFromSlot)
        {
            return;
        }

        pointer.updateWorldPoint(this.scene.cameras.main);
        const originX = pointer.worldX;
        const originY = pointer.worldY;
        let startedDrag = false;

        const cleanup = (): void =>
        {
            this.scene.input.off('pointermove', onPointerMove);
            this.scene.input.off('pointerup', onPointerUp);
            this.scene.input.off('pointerupoutside', onPointerUp);
        };

        const onPointerMove = (movePointer: Phaser.Input.Pointer): void =>
        {
            if (startedDrag)
            {
                return;
            }

            movePointer.updateWorldPoint(this.scene.cameras.main);
            const dx = movePointer.worldX - originX;
            const dy = movePointer.worldY - originY;

            if ((dx * dx) + (dy * dy) < CHAIN_START_TAP_SLOP_PX * CHAIN_START_TAP_SLOP_PX)
            {
                return;
            }

            if (card.exhausted)
            {
                return;
            }

            startedDrag = true;
            cleanup();
            this.beginBoardDrag(slot, card, movePointer, size);
        };

        const onPointerUp = (): void =>
        {
            cleanup();

            if (!startedDrag)
            {
                this.trySelectChainStart(slot);
            }
        };

        this.scene.input.on('pointermove', onPointerMove);
        this.scene.input.on('pointerup', onPointerUp);
        this.scene.input.on('pointerupoutside', onPointerUp);
    }

    private findSlotForPosition (centerX: number, centerY: number, tileSize: number): SlotPosition | null
    {
        const col = Math.floor((centerX - tileSize / 2) / tileSize + 0.5);
        const row = Math.floor((centerY - tileSize / 2) / tileSize + 0.5);

        if (row < 0 || row >= GRID_CONFIG.rows || col < 0 || col >= GRID_CONFIG.cols)
        {
            return null;
        }

        return { row, col };
    }

    private beginBoardDrag (
        slot: SlotPosition,
        card: CardInstance,
        pointer: Phaser.Input.Pointer,
        size: number,
    ): void
    {
        if (!this.boardDragHandlers?.canDrag() || this.draggingFromSlot)
        {
            return;
        }

        this.draggingFromSlot = slot;
        const wrapper = this.cardContainers[slot.row][slot.col];
        this.draggingWrapper = wrapper ?? null;

        pointer.updateWorldPoint(this.scene.cameras.main);
        const worldMatrix = wrapper?.getWorldTransformMatrix();
        const worldX = worldMatrix?.tx ?? pointer.worldX;
        const worldY = worldMatrix?.ty ?? pointer.worldY;
        const dragOffsetX = pointer.worldX - worldX;
        const dragOffsetY = pointer.worldY - worldY;

        wrapper?.setAlpha(0.25);

        const { container } = buildCardGraphic(this.scene, card, {
            width: size,
            height: size,
        });

        this.boardDragProxy = this.scene.add.container(
            pointer.worldX - dragOffsetX,
            pointer.worldY - dragOffsetY,
        );
        this.boardDragProxy.setDepth(1000);
        this.boardDragProxy.add(container);
        this.boardDragProxy.setData('offsetX', dragOffsetX);
        this.boardDragProxy.setData('offsetY', dragOffsetY);

        const onPointerMove = (movePointer: Phaser.Input.Pointer): void =>
        {
            if (!this.draggingFromSlot || !this.boardDragProxy)
            {
                return;
            }

            movePointer.updateWorldPoint(this.scene.cameras.main);
            const offsetX = this.boardDragProxy.getData('offsetX') as number;
            const offsetY = this.boardDragProxy.getData('offsetY') as number;

            this.boardDragProxy.setPosition(
                movePointer.worldX - offsetX,
                movePointer.worldY - offsetY,
            );
            this.boardDragHandlers?.onDragMove(this.draggingFromSlot, movePointer.worldX, movePointer.worldY);
        };

        const onPointerUp = (upPointer: Phaser.Input.Pointer): void =>
        {
            if (!this.draggingFromSlot)
            {
                return;
            }

            const fromSlot = this.draggingFromSlot;

            upPointer.updateWorldPoint(this.scene.cameras.main);
            const handled = this.boardDragHandlers?.onDragEnd(
                fromSlot,
                upPointer.worldX,
                upPointer.worldY,
            ) ?? false;

            if (handled)
            {
                this.finishBoardDrag();
            }
            else
            {
                this.cancelBoardDrag();
                this.normalizeWrapper(this.cardContainers[fromSlot.row]?.[fromSlot.col]);
            }
        };

        this.scene.input.on('pointermove', onPointerMove);
        this.scene.input.on('pointerup', onPointerUp);
        this.scene.input.on('pointerupoutside', onPointerUp);
        this.boardDragProxy.setData('cleanup', () =>
        {
            this.scene.input.off('pointermove', onPointerMove);
            this.scene.input.off('pointerup', onPointerUp);
            this.scene.input.off('pointerupoutside', onPointerUp);
            setViewportGrabbingCursor(false);
        });
        setViewportGrabbingCursor(true);
    }

    private finishBoardDrag (): void
    {
        const cleanup = this.boardDragProxy?.getData('cleanup') as (() => void) | undefined;

        cleanup?.();
        this.boardDragProxy?.destroy();
        this.boardDragProxy = undefined;
        this.draggingWrapper = null;
        this.draggingFromSlot = null;
        this.clearHighlight();
    }

    private cancelBoardDrag (): void
    {
        const cleanup = this.boardDragProxy?.getData('cleanup') as (() => void) | undefined;

        cleanup?.();
        this.boardDragProxy?.destroy();
        this.boardDragProxy = undefined;
        this.normalizeWrapper(this.draggingWrapper);
        this.draggingWrapper = null;
        this.draggingFromSlot = null;
        this.clearHighlight();
    }
}
