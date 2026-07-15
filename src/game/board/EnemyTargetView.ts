import { ENEMY_PASSIVE_TEXTURE_KEY } from '../../ui/icons/enemyPassiveIcons';
import { drawAvatarDiamond, drawCornerBrackets } from '../config/cyberpunkUiGraphics';
import { CYBER } from '../config/cyberpunkTheme';
import { uiDisplayTextStyle, uiTextStyle } from '../config/uiTypography';
import type { CombatTraitConfig } from '../cardGame/combat/combatTraits/types';
import type { EnemyState, EnemyTurnAction } from '../cardGame/domain/types';
import type { EnemyPassiveConfig } from '../cardGame/enemyPassives/types';
import {
    getEnemyIntentStepVisuals,
    type EnemyIntentStepVisual,
} from '../cardGame/presentation/enemyIntentVisuals';
import { attachEnemyPassiveTooltip } from '../cardGame/presentation/tooltips/EnemyPassiveTooltipController';
import { attachEnemyIntentTooltip } from '../cardGame/presentation/tooltips/EnemyIntentTooltipController';
import { playFloatingText, playHitFlash as playHitFlashTween } from '../cardGame/presentation/visualEffects/visualEffectTweens';
import {
    COMBAT_TRAIT_ICON_GAP,
    COMBAT_TRAIT_ICON_SIZE,
    COMBAT_TRAIT_ROW_BELOW_LABEL,
    CombatTraitRowView,
} from './CombatTraitRowView';
import type { BoardLayout } from './boardLayout';

const PASSIVE_ICON_SIZE = 26;
const PASSIVE_ICON_GAP = 4;
const INTENT_ICON_SIZE = 28;
const INTENT_AMOUNT_FONT_SIZE = 18;
const INTENT_STEP_GAP = 10;
const INTENT_STACK_GAP = 3;

const PASSIVE_ROW_COLORS: Record<EnemyPassiveConfig['id'], number> = {
    thorns: 0xf39c12,
    enrage: 0xe74c3c,
    lastStand: 0x8e44ad,
    smoke: 0x95a5a6,
    wetBlanket: 0x3498db,
    silenceTile: 0x9b59b6,
    loopHunter: 0xe67e22,
    jammer: 0x5dade2,
    escalate: 0xff6b6b,
    dampenTiles: 0x9b8cff,
    curseHand: 0xc97b9b,
};

const ENEMY_COLOR = CYBER.enemy;
const ENEMY_BAR_BG = CYBER.enemyBarBg;
const ENEMY_BAR_FILL = CYBER.enemyBarFill;
const ENEMY_SHIELD_COLOR = CYBER.enemyShield;
const ENEMY_SHIELD_FILL = CYBER.enemyShieldFill;

export class EnemyTargetView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly healthText: Phaser.GameObjects.Text;
    private readonly body: Phaser.GameObjects.Rectangle;
    private readonly outline: Phaser.GameObjects.Rectangle;
    private readonly shieldRing: Phaser.GameObjects.Rectangle;
    private readonly healthBarFill: Phaser.GameObjects.Rectangle;
    private readonly shieldBarFill: Phaser.GameObjects.Rectangle;
    private readonly shieldBarBg: Phaser.GameObjects.Rectangle;
    private readonly healthBarWidth: number;
    private readonly healthBarHeight: number;
    private readonly shieldBadge: Phaser.GameObjects.Container;
    private readonly shieldValueText: Phaser.GameObjects.Text;
    private readonly poisonBadge: Phaser.GameObjects.Text;
    private readonly enemyLabel: Phaser.GameObjects.Text;
    private readonly combatTraitRowView: CombatTraitRowView;
    private combatTraitCount = 0;
    private passiveCount = 0;
    private passiveIconsContainer?: Phaser.GameObjects.Container;
    private intentContainer?: Phaser.GameObjects.Container;
    private intentTween?: Phaser.Tweens.Tween;
    private intentAnchorY = 0;
    private shieldTween?: Phaser.Tweens.Tween;
    private readonly enemySize: number;
    private displayedShield = 0;
    private readonly threatRing: Phaser.GameObjects.Rectangle;
    private readonly targetPromptBadge: Phaser.GameObjects.Text;
    private idleTween?: Phaser.Tweens.Tween;
    private targetPromptTween?: Phaser.Tweens.Tween;
    private targetPromptActive = false;
    private selected = false;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        enemy: EnemyState,
    )
    {
        const { enemyX, enemyY, enemySize } = layout;
        this.enemySize = enemySize;
        const container = scene.add.container(enemyX, enemyY);

        this.threatRing = scene.add.rectangle(
            enemySize / 2,
            enemySize / 2,
            enemySize + 22,
            enemySize + 22,
            0x000000,
            0,
        );
        this.threatRing.setStrokeStyle(3, ENEMY_COLOR, 0.5);

        this.shieldRing = scene.add.rectangle(
            enemySize / 2,
            enemySize / 2,
            enemySize + 10,
            enemySize + 10,
            0x000000,
            0,
        );
        this.shieldRing.setStrokeStyle(3, ENEMY_SHIELD_COLOR, 0.95);
        this.shieldRing.setVisible(false);

        this.outline = scene.add.rectangle(0, 0, enemySize, enemySize);

        this.outline.setOrigin(0, 0);
        this.outline.setStrokeStyle(2, ENEMY_COLOR, 0.9);
        this.outline.setFillStyle(ENEMY_COLOR, 0.1);

        this.body = scene.add.rectangle(0, 0, enemySize, enemySize, ENEMY_COLOR, 0.22);

        this.body.setOrigin(0, 0);

        const frame = scene.add.graphics();

        drawCornerBrackets(frame, 2, 2, enemySize - 4, enemySize - 4, ENEMY_COLOR, {
            arm: Math.round(enemySize * 0.16),
            alpha: 0.95,
        });

        const avatar = scene.add.graphics();

        drawAvatarDiamond(avatar, enemySize / 2, enemySize / 2 - 2, enemySize * 0.4, ENEMY_COLOR);

        const barInset = 10;
        this.healthBarHeight = 12;
        this.healthBarWidth = enemySize - barInset * 2;
        const barY = enemySize - barInset - this.healthBarHeight;
        const shieldBarY = barY - this.healthBarHeight - 4;

        const healthBarBg = scene.add.rectangle(
            barInset,
            barY,
            this.healthBarWidth,
            this.healthBarHeight,
            ENEMY_BAR_BG,
            1,
        ).setOrigin(0, 0);

        this.healthBarFill = scene.add.rectangle(
            barInset,
            barY,
            this.healthBarWidth,
            this.healthBarHeight,
            ENEMY_BAR_FILL,
            1,
        ).setOrigin(0, 0);

        const shieldBarBg = scene.add.rectangle(
            barInset,
            shieldBarY,
            this.healthBarWidth,
            this.healthBarHeight,
            0x152535,
            1,
        ).setOrigin(0, 0);

        this.shieldBarBg = shieldBarBg;

        this.shieldBarFill = scene.add.rectangle(
            barInset,
            shieldBarY,
            this.healthBarWidth,
            this.healthBarHeight,
            ENEMY_SHIELD_FILL,
            1,
        ).setOrigin(0, 0);
        this.shieldBarFill.setVisible(false);
        this.shieldBarBg.setVisible(false);

        this.healthText = scene.add.text(enemySize / 2, enemySize / 2 - 2, '', {
            ...uiDisplayTextStyle(20, '#ffffff', { bold: true }),
        }).setOrigin(0.5);

        const label = scene.add.text(enemySize / 2, enemySize + 16, 'TARGET', {
            ...uiDisplayTextStyle(14, '#ff8ec4', { bold: true }),
        }).setOrigin(0.5, 0);

        this.enemyLabel = label;

        this.combatTraitRowView = new CombatTraitRowView(
            scene,
            container,
            enemySize,
            enemySize + 16 + COMBAT_TRAIT_ROW_BELOW_LABEL,
        );

        this.targetPromptBadge = scene.add.text(enemySize / 2, -10, 'LOCK TARGET', {
            ...uiDisplayTextStyle(12, '#fcee0a', {
                bold: true,
                backgroundColor: '#2a2400cc',
                padding: { x: 8, y: 4 },
            }),
        }).setOrigin(0.5, 1).setVisible(false);

        const badgeBg = scene.add.rectangle(0, 0, 108, 30, 0x152535);

        badgeBg.setStrokeStyle(2, ENEMY_SHIELD_COLOR, 0.95);

        const badgeLabel = scene.add.text(-46, 0, 'Shield', {
            ...uiTextStyle(14, '#c8e6ff', { bold: true }),
        }).setOrigin(0, 0.5);

        this.shieldValueText = scene.add.text(46, 0, '0', {
            ...uiTextStyle(19, '#ffffff', { bold: true }),
        }).setOrigin(1, 0.5);

        this.shieldBadge = scene.add.container(enemySize / 2, enemySize + 52, [ badgeBg, badgeLabel, this.shieldValueText ]);
        this.shieldBadge.setVisible(false);

        this.poisonBadge = scene.add.text(enemySize - 6, 6, '', {
            ...uiTextStyle(14, '#8fe3a0', {
                bold: true,
                backgroundColor: '#0a2a16cc',
                padding: { x: 5, y: 2 },
            }),
        }).setOrigin(1, 0);
        this.poisonBadge.setVisible(false);

        container.add([
            this.threatRing,
            this.shieldRing,
            this.outline,
            this.body,
            frame,
            avatar,
            this.shieldBarBg,
            this.shieldBarFill,
            healthBarBg,
            this.healthBarFill,
            this.healthText,
            label,
            this.targetPromptBadge,
            this.shieldBadge,
            this.poisonBadge,
        ]);
        this.container = container;
        this.setHealth(enemy);
        this.startIdlePulse();
    }

    setEnemyLabel (label: string): void
    {
        this.enemyLabel.setText(label);
    }

    setCombatTraits (traits: readonly CombatTraitConfig[]): void
    {
        this.combatTraitCount = traits.length;
        this.combatTraitRowView.setTraits(traits);
        this.updateShieldBadgePosition();
    }

    setEnemyPassives (allPassives: readonly EnemyPassiveConfig[]): void
    {
        this.passiveIconsContainer?.destroy();
        this.passiveIconsContainer = undefined;

        // Event-style abilities are surfaced via the turn intent, not the passive row.
        const passives = allPassives.filter((passive) => passive.id !== 'dampenTiles');

        this.passiveCount = passives.length;
        this.updateShieldBadgePosition();

        if (passives.length === 0)
        {
            return;
        }

        const rowWidth = passives.length * PASSIVE_ICON_SIZE + (passives.length - 1) * PASSIVE_ICON_GAP;
        const startX = this.enemySize / 2 - rowWidth / 2 + PASSIVE_ICON_SIZE / 2;
        const y = this.getPassiveRowY();
        const icons: Phaser.GameObjects.GameObject[] = [];

        passives.forEach((passive, index) =>
        {
            const x = startX + index * (PASSIVE_ICON_SIZE + PASSIVE_ICON_GAP);
            const background = this.scene.add.rectangle(
                x,
                y,
                PASSIVE_ICON_SIZE,
                PASSIVE_ICON_SIZE,
                0x141425,
                0.95,
            );

            background.setStrokeStyle(2, PASSIVE_ROW_COLORS[passive.id], 1);
            background.setInteractive({ useHandCursor: true });

            const textureKey = ENEMY_PASSIVE_TEXTURE_KEY[passive.id];
            const icon = this.scene.textures.exists(textureKey)
                ? this.scene.add.image(x, y, textureKey)
                : null;

            if (icon)
            {
                icon.setDisplaySize(18, 18);
                icon.setOrigin(0.5);
                icon.setTint(PASSIVE_ROW_COLORS[passive.id]);
            }

            attachEnemyPassiveTooltip(this.scene, background, passive);

            background.on('pointerover', () => background.setFillStyle(0x24243a, 1));
            background.on('pointerout', () => background.setFillStyle(0x141425, 0.95));

            icons.push(background);

            if (icon)
            {
                icons.push(icon);
            }
        });

        this.passiveIconsContainer = this.scene.add.container(0, 0, icons);
        this.container.add(this.passiveIconsContainer);
    }

    showIntent (action: EnemyTurnAction, phase: 'upcoming' | 'executing' = 'upcoming'): void
    {
        this.clearIntent();

        const steps = getEnemyIntentStepVisuals(action, phase);

        if (steps.length === 0)
        {
            return;
        }

        const metrics = this.getIntentMetrics();
        const { rows, rowWidths, rowHeights } = this.layoutIntentStepRows(steps, metrics);
        const rowGap = Math.max(4, metrics.stepGap - 2);
        const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0)
            + Math.max(0, rows.length - 1) * rowGap;
        const widestRow = rowWidths.reduce((max, width) => Math.max(max, width), 0);
        const fitScale = this.getIntentFitScale(widestRow);
        const parts: Phaser.GameObjects.GameObject[] = [];

        let rowTop = -totalHeight / 2;

        rows.forEach((row, rowIndex) =>
        {
            const rowWidth = rowWidths[rowIndex]!;
            const rowHeight = rowHeights[rowIndex]!;
            const rowCenterY = rowTop + rowHeight / 2;
            let x = -rowWidth / 2;

            row.forEach((visual) =>
            {
                parts.push(...this.buildIntentStep(visual, x, rowCenterY, phase, metrics));
                x += this.measureIntentStepWidth(visual, metrics) + metrics.stepGap;
            });

            rowTop += rowHeight + rowGap;
        });

        this.intentAnchorY = -(totalHeight / 2 + Math.round(this.enemySize * 0.28) + 10);
        this.intentContainer = this.scene.add.container(0, 0, parts);
        this.intentContainer.setAlpha(0);
        this.intentContainer.setScale(fitScale);
        this.intentContainer.setDepth(500);
        this.syncIntentWorldPosition();

        this.intentTween = this.scene.tweens.add({
            targets: this.intentContainer,
            alpha: 1,
            scaleX: fitScale,
            scaleY: fitScale,
            duration: phase === 'executing' ? 160 : 220,
            ease: 'Cubic.easeOut',
        });
    }

    private getIntentMetrics (): {
        scale: number;
        iconSize: number;
        stepGap: number;
        stepWidthStacked: number;
        stepWidthIconOnly: number;
        amountFontSize: number;
        stackGap: number;
        stepHeightStacked: number;
        stepHeightIconOnly: number;
    }
    {
        const scale = Math.max(0.94, Math.min(1.08, this.enemySize / 108));

        const iconSize = Math.max(22, Math.round(INTENT_ICON_SIZE * scale));
        const amountFontSize = Math.max(16, Math.round(INTENT_AMOUNT_FONT_SIZE * scale));
        const stackGap = Math.max(2, Math.round(INTENT_STACK_GAP * scale));
        const stepWidthStacked = Math.max(iconSize, Math.round(40 * scale));
        const stepWidthIconOnly = iconSize;

        return {
            scale,
            iconSize,
            stepGap: Math.max(6, Math.round(INTENT_STEP_GAP * scale)),
            stepWidthStacked,
            stepWidthIconOnly,
            amountFontSize,
            stackGap,
            stepHeightStacked: iconSize + stackGap + amountFontSize,
            stepHeightIconOnly: iconSize,
        };
    }

    private getIntentFitScale (rowWidth: number): number
    {
        if (rowWidth <= 0)
        {
            return 1;
        }

        const maxWidth = this.enemySize + 4;

        return Math.max(0.9, Math.min(1.08, maxWidth / rowWidth));
    }

    private measureIntentStepHeight (
        visual: EnemyIntentStepVisual,
        metrics: ReturnType<EnemyTargetView['getIntentMetrics']>,
    ): number
    {
        return visual.amountLabel ? metrics.stepHeightStacked : metrics.stepHeightIconOnly;
    }

    private getIntentRowHeight (
        steps: EnemyIntentStepVisual[],
        metrics: ReturnType<EnemyTargetView['getIntentMetrics']>,
    ): number
    {
        return steps.reduce(
            (max, step) => Math.max(max, this.measureIntentStepHeight(step, metrics)),
            metrics.stepHeightIconOnly,
        );
    }

    private layoutIntentStepRows (
        steps: EnemyIntentStepVisual[],
        metrics: ReturnType<EnemyTargetView['getIntentMetrics']>,
    ): {
        rows: EnemyIntentStepVisual[][];
        rowWidths: number[];
        rowHeights: number[];
    }
    {
        const maxRowWidth = this.enemySize + 4;
        const rows: EnemyIntentStepVisual[][] = [];
        const rowWidths: number[] = [];
        const rowHeights: number[] = [];
        let currentRow: EnemyIntentStepVisual[] = [];
        let currentWidth = 0;

        const pushRow = (): void =>
        {
            if (currentRow.length === 0)
            {
                return;
            }

            rows.push(currentRow);
            rowWidths.push(currentWidth);
            rowHeights.push(this.getIntentRowHeight(currentRow, metrics));
            currentRow = [];
            currentWidth = 0;
        };

        for (const visual of steps)
        {
            const stepWidth = this.measureIntentStepWidth(visual, metrics);
            const gap = currentRow.length > 0 ? metrics.stepGap : 0;
            const nextWidth = currentWidth + gap + stepWidth;

            if (currentRow.length > 0 && nextWidth > maxRowWidth)
            {
                pushRow();
            }

            if (currentRow.length > 0)
            {
                currentWidth += metrics.stepGap;
            }

            currentRow.push(visual);
            currentWidth += stepWidth;
        }

        pushRow();

        return { rows, rowWidths, rowHeights };
    }

    private syncIntentWorldPosition (): void
    {
        if (!this.intentContainer)
        {
            return;
        }

        this.intentContainer.setPosition(
            this.container.x + this.enemySize / 2,
            this.container.y + this.intentAnchorY,
        );
    }

    private measureIntentStepWidth (
        visual: EnemyIntentStepVisual,
        metrics: ReturnType<EnemyTargetView['getIntentMetrics']>,
    ): number
    {
        return visual.amountLabel ? metrics.stepWidthStacked : metrics.stepWidthIconOnly;
    }

    private buildIntentStep (
        visual: EnemyIntentStepVisual,
        x: number,
        y: number,
        phase: 'upcoming' | 'executing',
        metrics: ReturnType<EnemyTargetView['getIntentMetrics']>,
    ): Phaser.GameObjects.GameObject[]
    {
        const stepWidth = this.measureIntentStepWidth(visual, metrics);
        const stepHeight = visual.amountLabel ? metrics.stepHeightStacked : metrics.stepHeightIconOnly;
        const centerX = x + stepWidth / 2;
        const hitArea = this.scene.add.rectangle(
            centerX,
            y,
            stepWidth,
            stepHeight,
            0x000000,
            0,
        );

        attachEnemyIntentTooltip(this.scene, hitArea, visual.step, phase);

        const parts: Phaser.GameObjects.GameObject[] = [ hitArea ];
        const iconY = visual.amountLabel
            ? y - (metrics.amountFontSize + metrics.stackGap) / 2
            : y;

        if (this.scene.textures.exists(visual.textureKey))
        {
            const icon = this.scene.add.image(centerX, iconY, visual.textureKey);
            icon.setDisplaySize(metrics.iconSize, metrics.iconSize);
            icon.setOrigin(0.5);
            icon.setTint(visual.tint);
            icon.setAlpha(phase === 'executing' ? 1 : 0.95);
            parts.push(icon);
        }

        if (visual.amountLabel)
        {
            const labelY = iconY + metrics.iconSize / 2 + metrics.stackGap;
            const label = this.scene.add.text(centerX, labelY, visual.amountLabel, {
                ...uiDisplayTextStyle(metrics.amountFontSize, visual.textColor, {
                    bold: true,
                    strokeColor: '#0a0a14',
                }),
            }).setOrigin(0.5, 0);

            parts.push(label);
        }

        return parts;
    }

    clearIntent (): void
    {
        this.intentTween?.stop();
        this.intentTween = undefined;
        this.intentContainer?.destroy();
        this.intentContainer = undefined;
    }

    setShield (shield: number): void
    {
        if (!this.container.active || !this.shieldValueText.active)
        {
            return;
        }

        this.displayedShield = shield;
        this.shieldValueText.setText(String(shield));
        this.shieldBadge.setVisible(shield > 0);
        this.shieldBarBg.setVisible(shield > 0);
        this.shieldBarFill.setVisible(shield > 0);
        this.shieldBarFill.setScale(Math.min(1, shield / 10), 1);
        this.applyShieldVisuals();
    }

    setHealth (enemy: EnemyState): void
    {
        if (!this.container.active || !this.healthText.active)
        {
            return;
        }

        const fraction = enemy.maxHealth > 0
            ? Math.min(1, Math.max(0, enemy.health / enemy.maxHealth))
            : 0;

        this.healthText.setText(`${enemy.health}/${enemy.maxHealth}`);
        this.healthBarFill.setScale(fraction, 1);
        this.healthBarFill.setVisible(enemy.health > 0);
        this.setShield(enemy.shield);
        this.setPoison(enemy.poison ?? 0);
    }

    setPoison (stacks: number): void
    {
        if (!this.container.active || !this.poisonBadge.active)
        {
            return;
        }

        this.poisonBadge.setText(`\u2620 ${stacks}`);
        this.poisonBadge.setVisible(stacks > 0);
    }

    showPoisonApplied (stacks: number): void
    {
        if (stacks <= 0)
        {
            return;
        }

        this.showFloatingNumber(`+${stacks} poison`, '#8fe3a0');
    }

    showPoisonTick (damage: number): void
    {
        if (damage <= 0)
        {
            return;
        }

        this.showFloatingNumber(`-${damage} poison`, '#8fe3a0');
    }

    playHitFlash (): void
    {
        playHitFlashTween(this.scene, this.container, this.body, ENEMY_COLOR, {
            restoreAlpha: this.displayedShield > 0 ? 0.28 : 1,
        });

        if (this.displayedShield > 0)
        {
            this.scene.time.delayedCall(180, () => this.applyShieldVisuals());
        }
    }

    showDamageNumber (damage: number): void
    {
        if (damage <= 0)
        {
            return;
        }

        this.showFloatingNumber(`-${damage}`, '#ff7675');
    }

    showHealGain (heal: number): void
    {
        this.showFloatingNumber(`+${heal} HP`, '#7af0c8');

        this.scene.tweens.killTweensOf(this.body);
        this.body.setFillStyle(0x2a6b58, 0.55);

        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 140,
            ease: 'Back.easeOut',
            yoyo: true,
            onComplete: () =>
            {
                this.body.setFillStyle(ENEMY_COLOR, 0.22);
            },
        });
    }

    showShieldGain (shield: number): void
    {
        this.showFloatingNumber(`+${shield} shield`, '#aed6f1');

        this.scene.tweens.killTweensOf(this.body);
        this.body.setFillStyle(ENEMY_SHIELD_COLOR, 0.55);

        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 140,
            ease: 'Back.easeOut',
            yoyo: true,
            onComplete: () =>
            {
                this.applyShieldVisuals();
            },
        });
    }

    showShieldAbsorb (absorbed: number): void
    {
        if (absorbed <= 0)
        {
            return;
        }

        this.showFloatingNumber(`-${absorbed} shield`, '#aed6f1');
    }

    showHitBlocked (): void
    {
        this.showFloatingNumber('BLOCKED', '#bdc3c7');
    }

    playEnemyAttackPulse (): void
    {
        this.scene.tweens.killTweensOf(this.container);
        this.body.setFillStyle(0xff9f43, 1);

        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.16,
            scaleY: 1.16,
            duration: 120,
            ease: 'Back.easeOut',
            yoyo: true,
            repeat: 1,
            onComplete: () =>
            {
                this.applyShieldVisuals();
            },
        });
    }

    reposition (x: number, y: number): void
    {
        this.container.setPosition(x, y);
        this.syncIntentWorldPosition();
    }

    setSelected (selected: boolean): void
    {
        this.selected = selected;

        if (selected)
        {
            this.setTargetPrompt(false);
        }

        this.applyThreatRingStyle();
    }

    setTargetPrompt (active: boolean): void
    {
        if (!active)
        {
            if (!this.targetPromptActive)
            {
                return;
            }

            this.targetPromptActive = false;
            this.targetPromptTween?.stop();
            this.targetPromptTween = undefined;
            this.targetPromptBadge.setVisible(false);
            this.idleTween?.resume();
            this.applyThreatRingStyle();

            return;
        }

        if (this.selected || this.targetPromptActive)
        {
            return;
        }

        this.targetPromptActive = true;
        this.targetPromptBadge.setVisible(true);
        this.idleTween?.pause();
        this.threatRing.setVisible(true);
        this.threatRing.setStrokeStyle(4, 0xfcee0a, 1);
        this.threatRing.setScale(1);
        this.threatRing.setAlpha(1);
        this.targetPromptTween = this.scene.tweens.add({
            targets: this.threatRing,
            alpha: { from: 0.45, to: 1 },
            scaleX: { from: 1, to: 1.1 },
            scaleY: { from: 1, to: 1.1 },
            duration: 420,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    flashTargetPrompt (): void
    {
        if (!this.targetPromptActive)
        {
            return;
        }

        this.scene.tweens.add({
            targets: this.targetPromptBadge,
            scaleX: { from: 1, to: 1.14 },
            scaleY: { from: 1, to: 1.14 },
            duration: 120,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeOut',
        });
    }

    setDefeated (defeated: boolean): void
    {
        this.container.setAlpha(defeated ? 0.28 : 1);

        if (defeated)
        {
            this.clearIntent();
            this.setTargetPrompt(false);
            this.setSelected(false);
            this.setTargetClickHandler(null);
        }
    }

    setTargetClickHandler (handler: (() => void) | null): void
    {
        if (handler)
        {
            this.outline.setInteractive({ useHandCursor: true });
            this.outline.removeAllListeners('pointerdown');
            this.outline.on('pointerdown', handler);
            return;
        }

        this.outline.disableInteractive();
        this.outline.removeAllListeners('pointerdown');
    }

    destroy (): void
    {
        this.clearIntent();
        this.combatTraitRowView.destroy();
        this.passiveIconsContainer?.destroy();
        this.passiveIconsContainer = undefined;
        this.shieldTween?.stop();
        this.idleTween?.stop();
        this.targetPromptTween?.stop();
        this.container.destroy();
    }

    private getTraitRowY (): number
    {
        return this.enemySize + 16 + COMBAT_TRAIT_ROW_BELOW_LABEL;
    }

    private getPassiveRowY (): number
    {
        if (this.combatTraitCount === 0)
        {
            return this.getTraitRowY();
        }

        return this.getTraitRowY() + COMBAT_TRAIT_ICON_SIZE + COMBAT_TRAIT_ICON_GAP + 4;
    }

    private updateShieldBadgePosition (): void
    {
        const belowTraits = this.combatTraitCount > 0
            ? COMBAT_TRAIT_ICON_SIZE + 8
            : 0;
        const belowPassives = this.passiveCount > 0
            ? PASSIVE_ICON_SIZE + 8
            : 0;

        this.shieldBadge.setY(this.getTraitRowY() + belowTraits + belowPassives + 10);
    }

    private applyShieldVisuals (): void
    {
        const hasShield = this.displayedShield > 0;

        this.shieldRing.setVisible(hasShield);
        this.shieldBadge.setVisible(hasShield);
        this.shieldBarBg.setVisible(hasShield);
        this.shieldBarFill.setVisible(hasShield);

        if (hasShield)
        {
            this.outline.setStrokeStyle(3, ENEMY_SHIELD_COLOR, 1);
            this.body.setFillStyle(ENEMY_SHIELD_COLOR, 0.28);
            this.startShieldPulse();
            return;
        }

        this.shieldTween?.stop();
        this.shieldTween = undefined;
        this.outline.setStrokeStyle(2, ENEMY_COLOR, 0.9);
        this.body.setFillStyle(ENEMY_COLOR, 0.22);
    }

    private applyThreatRingStyle (): void
    {
        if (this.targetPromptActive)
        {
            return;
        }

        this.threatRing.setScale(1);
        this.threatRing.setAlpha(1);
        this.threatRing.setStrokeStyle(3, this.selected ? 0xfcee0a : ENEMY_COLOR, this.selected ? 1 : 0.5);
        this.threatRing.setVisible(this.selected || this.displayedShield > 0);
    }

    private startIdlePulse (): void
    {
        this.idleTween = this.scene.tweens.add({
            targets: this.threatRing,
            scaleX: 1.05,
            scaleY: 1.05,
            alpha: 0.88,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private startShieldPulse (): void
    {
        this.shieldTween?.stop();
        this.shieldRing.setAlpha(1);
        this.shieldTween = this.scene.tweens.add({
            targets: this.shieldRing,
            alpha: { from: 0.35, to: 1 },
            scaleX: { from: 0.98, to: 1.04 },
            scaleY: { from: 0.98, to: 1.04 },
            duration: 520,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });
    }

    showIntentLabel (text: string): void
    {
        this.showFloatingNumber(text, '#fcee0a');
    }

    private showFloatingNumber (text: string, color: string): void
    {
        playFloatingText(
            this.scene,
            this.container,
            this.body.width / 2,
            -8,
            text,
            color,
        );
    }
}
