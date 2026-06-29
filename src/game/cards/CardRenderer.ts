import { getCardDefinitionOrThrow } from '../cardGame/config/cardRegistry';
import { ARROW_GLYPH, arrowLabelPosition } from './cardArrows';
import { CARD_VISUALS } from './cardVisuals';

export interface CardVisualOptions {
    width: number;
    height: number;
    interactive?: boolean;
}

export interface CardGraphic {
    container: Phaser.GameObjects.Container;
    hitArea: Phaser.GameObjects.Rectangle;
}

/** Builds a card graphic from a definition id. */
export const buildCardGraphicFromDefinition = (
    scene: Phaser.Scene,
    definitionId: string,
    options: CardVisualOptions,
): CardGraphic =>
{
    const definition = getCardDefinitionOrThrow(definitionId);
    const style = CARD_VISUALS[definition.behaviorId] ?? CARD_VISUALS.attack;
    const { width, height, interactive = false } = options;
    const container = scene.add.container(0, 0);

    const body = scene.add.rectangle(width / 2, height / 2, width, height, style.fill);

    body.setStrokeStyle(2, style.border, 1);

    const arrowPos = arrowLabelPosition(definition.arrow, width, height);
    const arrow = scene.add.text(arrowPos.x, arrowPos.y, ARROW_GLYPH[definition.arrow], {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
    }).setOrigin(0.5);

    const kindLabel = scene.add.text(width / 2, height * 0.38, definition.label, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: style.labelColor,
        fontStyle: 'bold',
    }).setOrigin(0.5);

    const power = scene.add.text(width / 2, height * 0.62, String(definition.power), {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: style.powerColor,
        fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([ body, arrow, kindLabel, power ]);

    if (interactive)
    {
        body.setInteractive({ useHandCursor: true });
    }

    return { container, hitArea: body };
};
