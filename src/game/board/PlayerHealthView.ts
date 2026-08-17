import type { PlayerState } from '../cardGame/domain/types';
import type { CombatTraitConfig } from '../cardGame/combat/combatTraits/types';
import { drawAvatarDiamond, drawCornerBrackets } from '../config/cyberpunkUiGraphics';
import { CYBER } from '../config/cyberpunkTheme';
import { uiDisplayTextStyle, uiTextStyle } from '../config/uiTypography';
import { playFloatingText, playHitFlash as playHitFlashTween } from '../cardGame/presentation/visualEffects/visualEffectTweens';
import {
    COMBAT_TRAIT_ICON_SIZE,
    COMBAT_TRAIT_NAME_GAP,
    CombatTraitRowView,
} from './CombatTraitRowView';
import type { BoardLayout } from './boardLayout';
import {
    getLocalSteamPersona,
    getSteamPersonaTextureKey,
} from '../desktop/steamAvatars';

export class PlayerHealthView
{
    readonly container: Phaser.GameObjects.Container;
    private readonly healthText: Phaser.GameObjects.Text;
    private readonly body: Phaser.GameObjects.Rectangle;
    private readonly healthBarFill: Phaser.GameObjects.Rectangle;
    private readonly healthBarWidth: number;
    private readonly healthBarHeight: number;
    private readonly glowRing: Phaser.GameObjects.Rectangle;
    private readonly combatTraitRowView: CombatTraitRowView;
    private readonly playerLabel: Phaser.GameObjects.Text;
    private combatTraitCount = 0;
    private readonly playerSize: number;
    private idleTween?: Phaser.Tweens.Tween;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        player: PlayerState,
    )
    {
        const { playerX, playerY, playerSize } = layout;
        this.playerSize = playerSize;
        const container = scene.add.container(playerX, playerY);

        this.glowRing = scene.add.rectangle(
            playerSize / 2,
            playerSize / 2,
            playerSize + 18,
            playerSize + 18,
            0x000000,
            0,
        );
        this.glowRing.setStrokeStyle(3, CYBER.player, 0.45);

        const outline = scene.add.rectangle(0, 0, playerSize, playerSize);

        outline.setOrigin(0, 0);
        outline.setStrokeStyle(2, CYBER.player, 0.85);
        outline.setFillStyle(CYBER.player, 0.08);

        const body = scene.add.rectangle(0, 0, playerSize, playerSize, CYBER.player, 0.18);

        body.setOrigin(0, 0);

        const frame = scene.add.graphics();

        drawCornerBrackets(frame, 2, 2, playerSize - 4, playerSize - 4, CYBER.player, {
            arm: Math.round(playerSize * 0.16),
            alpha: 0.95,
        });

        const steamPersona = getLocalSteamPersona();
        const steamKey = steamPersona
            ? getSteamPersonaTextureKey(steamPersona.steamId)
            : null;
        const useSteamPortrait = Boolean(steamKey && scene.textures.exists(steamKey));
        let avatar: Phaser.GameObjects.GameObject;

        if (useSteamPortrait && steamKey)
        {
            const portraitInset = 3;
            const portrait = scene.add.image(playerSize / 2, playerSize / 2, steamKey);

            portrait.setDisplaySize(playerSize - portraitInset * 2, playerSize - portraitInset * 2);
            avatar = portrait;
        }
        else
        {
            const diamond = scene.add.graphics();

            drawAvatarDiamond(diamond, playerSize / 2, playerSize / 2 - 2, playerSize * 0.42, CYBER.player);
            avatar = diamond;
        }

        const barInset = 10;
        this.healthBarHeight = 12;
        this.healthBarWidth = playerSize - barInset * 2;
        const barY = playerSize - barInset - this.healthBarHeight;

        const healthBarBg = scene.add.rectangle(
            barInset,
            barY,
            this.healthBarWidth,
            this.healthBarHeight,
            CYBER.playerBarBg,
            1,
        ).setOrigin(0, 0);

        this.healthBarFill = scene.add.rectangle(
            barInset,
            barY,
            this.healthBarWidth,
            this.healthBarHeight,
            CYBER.playerBarFill,
            1,
        ).setOrigin(0, 0);

        this.healthText = scene.add.text(
            playerSize / 2,
            useSteamPortrait ? barY + this.healthBarHeight / 2 : playerSize / 2 - 2,
            '',
            {
                ...uiDisplayTextStyle(useSteamPortrait ? 12 : 20, '#ffffff', { bold: true }),
            },
        ).setOrigin(0.5);

        const runnerName = steamPersona?.personaName.trim()
            ? steamPersona.personaName.trim().slice(0, 14).toUpperCase()
            : 'RUNNER';
        const label = scene.add.text(playerSize / 2, playerSize + 16, runnerName, {
            ...uiDisplayTextStyle(14, '#ff7ab8', { bold: true }),
        }).setOrigin(0.5, 0);

        this.playerLabel = label;

        this.combatTraitRowView = new CombatTraitRowView(
            scene,
            container,
            playerSize,
            this.getTraitRowY(),
        );

        container.add([
            this.glowRing,
            outline,
            body,
            avatar,
            frame,
            healthBarBg,
            this.healthBarFill,
            this.healthText,
            label,
        ]);
        this.container = container;
        this.body = body;
        this.setHealth(player);
        this.syncStatusRowLayout();
        this.startIdlePulse();
    }

    setHealth (player: PlayerState): void
    {
        if (!this.container.active || !this.healthText.active)
        {
            return;
        }

        const fraction = player.maxHealth > 0
            ? Math.min(1, Math.max(0, player.health / player.maxHealth))
            : 0;

        this.healthText.setText(`${player.health}/${player.maxHealth}`);
        this.scene.tweens.add({
            targets: this.healthBarFill,
            scaleX: fraction,
            duration: 220,
            ease: 'Cubic.easeOut',
        });
        this.healthBarFill.setVisible(player.health > 0);

        const low = player.maxHealth > 0 && player.health / player.maxHealth <= 0.3;

        this.glowRing.setStrokeStyle(3, CYBER.player, low ? 0.85 : 0.45);
        this.body.setFillStyle(CYBER.player, low ? 0.32 : 0.18);
    }

    playHitFlash (): void
    {
        playHitFlashTween(this.scene, this.container, this.body, CYBER.player);
    }

    showDamageNumber (damage: number): void
    {
        if (damage <= 0)
        {
            return;
        }

        playFloatingText(
            this.scene,
            this.container,
            this.body.width / 2,
            -8,
            `-${damage}`,
            '#ff3b6b',
        );
    }

    setCombatTraits (traits: readonly CombatTraitConfig[]): void
    {
        this.combatTraitCount = traits.length;
        this.combatTraitRowView.setTraits(traits);
        this.syncStatusRowLayout();
    }

    getStatusChromeBottomWorldY (): number
    {
        return this.container.y + this.getContentStackBottomY();
    }

    private getContentStackBottomY (): number
    {
        let bottom = this.playerSize + 16 + this.playerLabel.height;

        if (this.combatTraitCount > 0)
        {
            bottom = this.getTraitRowY() + COMBAT_TRAIT_ICON_SIZE / 2;
        }

        return bottom;
    }

    private syncStatusRowLayout (): void
    {
        this.combatTraitRowView.setRowY(this.getTraitRowY());
    }

    private getTraitRowY (): number
    {
        return this.playerSize
            + 16
            + this.playerLabel.height
            + COMBAT_TRAIT_NAME_GAP
            + COMBAT_TRAIT_ICON_SIZE / 2;
    }

    destroy (): void
    {
        this.idleTween?.stop();
        this.combatTraitRowView.destroy();
        this.container.destroy();
    }

    private startIdlePulse (): void
    {
        this.idleTween = this.scene.tweens.add({
            targets: this.glowRing,
            scaleX: 1.04,
            scaleY: 1.04,
            alpha: 0.92,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }
}
