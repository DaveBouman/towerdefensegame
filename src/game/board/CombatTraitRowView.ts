import type { CombatTraitConfig } from '../cardGame/combat/combatTraits/types';
import {
    summarizeCombatTraits,
    type CombatTraitDisplayEntry,
} from '../cardGame/combat/combatTraits/display';
import { attachCombatTraitTooltip } from '../cardGame/presentation/tooltips/CombatTraitTooltipController';

export const COMBAT_TRAIT_ICON_SIZE = 26;
export const COMBAT_TRAIT_ICON_GAP = 4;
export const COMBAT_TRAIT_ROW_BELOW_LABEL = 18;

export class CombatTraitRowView
{
    private iconsContainer?: Phaser.GameObjects.Container;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly parent: Phaser.GameObjects.Container,
        private readonly panelWidth: number,
        private readonly rowY: number,
    ) {}

    setTraits (traits: readonly CombatTraitConfig[]): void
    {
        this.iconsContainer?.destroy();
        this.iconsContainer = undefined;

        const entries = summarizeCombatTraits(traits);

        if (entries.length === 0)
        {
            return;
        }

        const rowWidth = entries.length * COMBAT_TRAIT_ICON_SIZE
            + (entries.length - 1) * COMBAT_TRAIT_ICON_GAP;
        const startX = this.panelWidth / 2 - rowWidth / 2 + COMBAT_TRAIT_ICON_SIZE / 2;
        const parts: Phaser.GameObjects.GameObject[] = [];

        entries.forEach((entry, index) =>
        {
            const x = startX + index * (COMBAT_TRAIT_ICON_SIZE + COMBAT_TRAIT_ICON_GAP);

            parts.push(...this.buildIcon(entry, x, this.rowY));
        });

        this.iconsContainer = this.scene.add.container(0, 0, parts);
        this.parent.add(this.iconsContainer);
    }

    destroy (): void
    {
        this.iconsContainer?.destroy();
        this.iconsContainer = undefined;
    }

    private buildIcon (
        entry: CombatTraitDisplayEntry,
        x: number,
        y: number,
    ): Phaser.GameObjects.GameObject[]
    {
        const background = this.scene.add.rectangle(
            x,
            y,
            COMBAT_TRAIT_ICON_SIZE,
            COMBAT_TRAIT_ICON_SIZE,
            0x141425,
            0.95,
        );

        background.setStrokeStyle(2, entry.tint, 1);
        background.setInteractive({ useHandCursor: true });

        const parts: Phaser.GameObjects.GameObject[] = [ background ];

        if (this.scene.textures.exists(entry.textureKey))
        {
            const icon = this.scene.add.image(x, y, entry.textureKey);

            icon.setDisplaySize(18, 18);
            icon.setOrigin(0.5);
            icon.setTint(entry.tint);
            parts.push(icon);
        }

        attachCombatTraitTooltip(this.scene, background, entry.trait);

        background.on('pointerover', () => background.setFillStyle(0x24243a, 1));
        background.on('pointerout', () => background.setFillStyle(0x141425, 0.95));

        return parts;
    }
}
