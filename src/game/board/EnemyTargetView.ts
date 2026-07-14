import { ENEMY_PASSIVE_TEXTURE_KEY } from '../../ui/icons/enemyPassiveIcons';
import { drawAvatarDiamond, drawCornerBrackets } from '../config/cyberpunkUiGraphics';
import { CYBER } from '../config/cyberpunkTheme';
import { uiDisplayTextStyle, uiTextStyle } from '../config/uiTypography';
import type { EnemyState, EnemyTurnAction } from '../cardGame/domain/types';
import type { EnemyPassiveConfig } from '../cardGame/enemyPassives/types';
import {
    getEnemyIntentStepVisuals,
    type EnemyIntentStepVisual,
} from '../cardGame/presentation/enemyIntentVisuals';
import { attachEnemyPassiveTooltip } from '../cardGame/presentation/tooltips/EnemyPassiveTooltipController';
import { attachEnemyIntentTooltip } from '../cardGame/presentation/tooltips/EnemyIntentTooltipController';
import { playFloatingText, playHitFlash as playHitFlashTween } from '../cardGame/presentation/visualEffects/visualEffectTweens';
import type { BoardLayout } from './boardLayout';

const PASSIVE_ICON_SIZE = 26;
const PASSIVE_ICON_GAP = 4;
const INTENT_ICON_SIZE = 28;
const INTENT_CHIP_HEIGHT = 40;
const INTENT_CHIP_GAP = 10;
const INTENT_PLUS_GAP = 6;

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
    private passiveIconsContainer?: Phaser.GameObjects.Container;
    private intentContainer?: Phaser.GameObjects.Container;
    private intentTween?: Phaser.Tweens.Tween;
    private shieldTween?: Phaser.Tweens.Tween;
    private readonly enemySize: number;
    private displayedShield = 0;
    private readonly threatRing: Phaser.GameObjects.Rectangle;
    private idleTween?: Phaser.Tweens.Tween;

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

        const badgeBg = scene.add.rectangle(0, 0, 108, 30, 0x152535);

        badgeBg.setStrokeStyle(2, ENEMY_SHIELD_COLOR, 0.95);

        const badgeLabel = scene.add.text(-46, 0, 'Shield', {
            ...uiTextStyle(14, '#c8e6ff', { bold: true }),
        }).setOrigin(0, 0.5);

        this.shieldValueText = scene.add.text(46, 0, '0', {
            ...uiTextStyle(19, '#ffffff', { bold: true }),
        }).setOrigin(1, 0.5);

        this.shieldBadge = scene.add.container(enemySize / 2, -22, [ badgeBg, badgeLabel, this.shieldValueText ]);
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

    setEnemyPassives (allPassives: readonly EnemyPassiveConfig[]): void
    {
        this.passiveIconsContainer?.destroy();
        this.passiveIconsContainer = undefined;

        // Event-style abilities are surfaced via the turn intent, not the passive row.
        const passives = allPassives.filter((passive) => passive.id !== 'dampenTiles');

        if (passives.length === 0)
        {
            return;
        }

        const rowWidth = passives.length * PASSIVE_ICON_SIZE + (passives.length - 1) * PASSIVE_ICON_GAP;
        const startX = this.enemySize / 2 - rowWidth / 2 + PASSIVE_ICON_SIZE / 2;
        const y = this.enemySize + 34;
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
        const intentY = -66;
        const rowWidth = this.measureIntentRowWidth(steps);
        const startX = this.enemySize / 2 - rowWidth / 2;
        const parts: Phaser.GameObjects.GameObject[] = [];

        let x = startX;

        steps.forEach((visual, index) =>
        {
            if (index > 0)
            {
                const plus = this.scene.add.text(x + INTENT_PLUS_GAP, intentY, '+', {
                    ...uiTextStyle(17, '#a8a8c8', { bold: true }),
                }).setOrigin(0, 0.5);

                parts.push(plus);
                x += INTENT_PLUS_GAP + 12;
            }

            parts.push(...this.buildIntentChip(visual, x, intentY, phase));
            x += this.measureIntentChipWidth(visual) + INTENT_CHIP_GAP;
        });

        this.intentContainer = this.scene.add.container(0, 0, parts);
        this.intentContainer.setAlpha(0.92);
        this.intentContainer.setScale(0.96);
        this.container.add(this.intentContainer);

        this.intentTween = this.scene.tweens.add({
            targets: this.intentContainer,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: phase === 'executing' ? 160 : 220,
            ease: 'Cubic.easeOut',
        });
    }

    private measureIntentChipWidth (visual: EnemyIntentStepVisual): number
    {
        return visual.amountLabel ? 62 : 44;
    }

    private measureIntentRowWidth (steps: EnemyIntentStepVisual[]): number
    {
        if (steps.length === 0)
        {
            return 0;
        }

        let width = steps.reduce((sum, step) => sum + this.measureIntentChipWidth(step), 0);
        width += (steps.length - 1) * (INTENT_CHIP_GAP + INTENT_PLUS_GAP + 12);

        return width;
    }

    private buildIntentChip (
        visual: EnemyIntentStepVisual,
        x: number,
        y: number,
        phase: 'upcoming' | 'executing',
    ): Phaser.GameObjects.GameObject[]
    {
        const chipWidth = this.measureIntentChipWidth(visual);
        const chipBg = this.scene.add.rectangle(
            x + chipWidth / 2,
            y,
            chipWidth,
            INTENT_CHIP_HEIGHT,
            phase === 'executing' ? 0x221828 : 0x14101c,
            0.94,
        );

        chipBg.setStrokeStyle(1.5, visual.tint, phase === 'executing' ? 0.85 : 0.55);

        const hitArea = this.scene.add.rectangle(
            x + chipWidth / 2,
            y,
            chipWidth,
            INTENT_CHIP_HEIGHT,
            0x000000,
            0,
        );

        attachEnemyIntentTooltip(this.scene, hitArea, visual.step, phase);

        const parts: Phaser.GameObjects.GameObject[] = [ chipBg, hitArea ];
        const iconX = visual.amountLabel ? x + INTENT_ICON_SIZE / 2 + 4 : x + chipWidth / 2;

        if (this.scene.textures.exists(visual.textureKey))
        {
            const icon = this.scene.add.image(iconX, y, visual.textureKey);
            icon.setDisplaySize(INTENT_ICON_SIZE, INTENT_ICON_SIZE);
            icon.setOrigin(0.5);
            icon.setTint(visual.tint);
            parts.push(icon);
        }

        if (visual.amountLabel)
        {
            const label = this.scene.add.text(x + chipWidth - 4, y, visual.amountLabel, {
                ...uiTextStyle(20, visual.textColor, { bold: true }),
            }).setOrigin(1, 0.5);

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
    }

    setSelected (selected: boolean): void
    {
        this.threatRing.setStrokeStyle(3, selected ? 0xfcee0a : ENEMY_COLOR, selected ? 1 : 0.5);
        this.threatRing.setVisible(selected || this.displayedShield > 0);
    }

    setDefeated (defeated: boolean): void
    {
        this.container.setAlpha(defeated ? 0.28 : 1);
        this.clearIntent();

        if (defeated)
        {
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
        this.passiveIconsContainer?.destroy();
        this.passiveIconsContainer = undefined;
        this.shieldTween?.stop();
        this.idleTween?.stop();
        this.container.destroy();
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
