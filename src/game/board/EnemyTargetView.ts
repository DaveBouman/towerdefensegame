import type { EnemyState, EnemyTurnAction } from '../cardGame/domain/types';
import { describeEnemyIntent } from '../cardGame/combat/enemyTurn';
import type { BoardLayout } from './boardLayout';

const ENEMY_COLOR = 0xe74c3c;
const ENEMY_BAR_BG = 0x3a1520;
const ENEMY_BAR_FILL = 0xff6b6b;
const ENEMY_SHIELD_COLOR = 0x5dade2;
const ENEMY_SHIELD_FILL = 0x2471a3;

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
    private intentContainer?: Phaser.GameObjects.Container;
    private intentTween?: Phaser.Tweens.Tween;
    private shieldTween?: Phaser.Tweens.Tween;
    private readonly enemySize: number;
    private displayedShield = 0;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        enemy: EnemyState,
    )
    {
        const { enemyX, enemyY, enemySize } = layout;
        this.enemySize = enemySize;
        const container = scene.add.container(enemyX, enemyY);

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
        this.outline.setStrokeStyle(2, ENEMY_COLOR, 0.7);
        this.outline.setFillStyle(ENEMY_COLOR, 0.12);

        this.body = scene.add.rectangle(0, 0, enemySize, enemySize, ENEMY_COLOR);

        this.body.setOrigin(0, 0);

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

        this.healthText = scene.add.text(enemySize / 2, enemySize / 2 - 4, '', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        const label = scene.add.text(enemySize / 2, enemySize + 14, 'Enemy', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#f5b7b1',
        }).setOrigin(0.5, 0);

        const badgeBg = scene.add.rectangle(0, 0, 108, 30, 0x152535);

        badgeBg.setStrokeStyle(2, ENEMY_SHIELD_COLOR, 0.95);

        const badgeLabel = scene.add.text(-46, 0, 'Shield', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#aed6f1',
            fontStyle: 'bold',
        }).setOrigin(0, 0.5);

        this.shieldValueText = scene.add.text(46, 0, '0', {
            fontFamily: 'monospace',
            fontSize: '17px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(1, 0.5);

        this.shieldBadge = scene.add.container(enemySize / 2, -22, [ badgeBg, badgeLabel, this.shieldValueText ]);
        this.shieldBadge.setVisible(false);

        container.add([
            this.shieldRing,
            this.outline,
            this.body,
            this.shieldBarBg,
            this.shieldBarFill,
            healthBarBg,
            this.healthBarFill,
            this.healthText,
            label,
            this.shieldBadge,
        ]);
        this.container = container;
        this.setHealth(enemy);
    }

    showIntent (action: EnemyTurnAction, phase: 'upcoming' | 'executing' = 'upcoming'): void
    {
        this.clearIntent();

        const { title, color } = describeEnemyIntent(action, phase);
        const intentY = -58;
        const intentWidth = this.enemySize + 24;
        const strokeColor = action.kind === 'attack'
            ? (phase === 'executing' ? 0xff7675 : 0xff9f43)
            : 0x5dade2;

        const badge = this.scene.add.rectangle(
            this.enemySize / 2,
            intentY,
            intentWidth,
            30,
            0x141425,
            0.95,
        );
        badge.setStrokeStyle(2, strokeColor, 1);

        const text = this.scene.add.text(this.enemySize / 2, intentY, title, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color,
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.intentContainer = this.scene.add.container(0, 0, [ badge, text ]);
        this.container.add(this.intentContainer);

        this.intentTween = this.scene.tweens.add({
            targets: this.intentContainer,
            alpha: { from: 0.65, to: 1 },
            duration: phase === 'executing' ? 180 : 320,
            yoyo: true,
            repeat: -1,
        });
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
    }

    playHitFlash (): void
    {
        this.scene.tweens.killTweensOf(this.container);
        this.container.setScale(1);
        this.body.setFillStyle(0xffffff, 0.95);

        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 100,
            yoyo: true,
            onComplete: () =>
            {
                this.applyShieldVisuals();
            },
        });
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
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 180,
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
            scaleX: 1.14,
            scaleY: 1.14,
            duration: 160,
            yoyo: true,
            repeat: 1,
            onComplete: () =>
            {
                this.applyShieldVisuals();
            },
        });
    }

    destroy (): void
    {
        this.clearIntent();
        this.shieldTween?.stop();
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
        this.outline.setStrokeStyle(2, ENEMY_COLOR, 0.7);
        this.body.setFillStyle(ENEMY_COLOR, 1);
    }

    private startShieldPulse (): void
    {
        this.shieldTween?.stop();
        this.shieldRing.setAlpha(1);
        this.shieldTween = this.scene.tweens.add({
            targets: this.shieldRing,
            alpha: { from: 0.45, to: 1 },
            duration: 700,
            yoyo: true,
            repeat: -1,
        });
    }

    private showFloatingNumber (text: string, color: string): void
    {
        const popup = this.scene.add.text(this.body.width / 2, -8, text, {
            fontFamily: 'monospace',
            fontSize: '22px',
            color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 1);

        this.container.add(popup);

        this.scene.tweens.add({
            targets: popup,
            y: -36,
            alpha: 0,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => popup.destroy(),
        });
    }
}
