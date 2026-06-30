import { getCardDefinitionOrThrow, GAME_RULES, getChainStepDistance } from '../cardGame/config/cardRegistry';
import type { CardInstance } from '../cardGame/domain/types';
import { isEnemyOwnedCard, isFieldOwnedCard } from '../cardGame/domain/cardOwnership';
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

/** Builds a card graphic from a card instance (arrow comes from the instance). */
export const buildCardGraphic = (
    scene: Phaser.Scene,
    card: CardInstance,
    options: CardVisualOptions,
): CardGraphic =>
{
    const definition = getCardDefinitionOrThrow(card.definitionId);
    const style = CARD_VISUALS[definition.behaviorId] ?? CARD_VISUALS.attack;
    const { width, height, interactive = false } = options;
    const container = scene.add.container(0, 0);
    const isJoker = definition.behaviorId === 'joker';
    const isBoost = definition.behaviorId === 'boost';
    const isLoopReset = definition.behaviorId === 'loop-reset';
    const isPoison = definition.behaviorId === 'poison';
    const leapDistance = getChainStepDistance(definition);

    const body = scene.add.rectangle(width / 2, height / 2, width, height, style.fill);

    body.setStrokeStyle(isEnemyOwnedCard(card) || isFieldOwnedCard(card) ? 3 : 2, style.border, 1);

    const arrowPos = arrowLabelPosition(card.arrow, width, height);
    const arrow = scene.add.text(arrowPos.x, arrowPos.y, isJoker ? '?' : ARROW_GLYPH[card.arrow], {
        fontFamily: 'monospace',
        fontSize: isJoker ? '22px' : '18px',
        color: '#ffffff',
        fontStyle: 'bold',
    }).setOrigin(0.5);

    const kindLabel = scene.add.text(width / 2, height * 0.38, definition.label, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: style.labelColor,
        fontStyle: 'bold',
    }).setOrigin(0.5);

    const power = scene.add.text(
        width / 2,
        height * 0.62,
        isJoker ? '★' : isBoost ? `×${GAME_RULES.fieldBoost.nextStepMultiplier}` : isLoopReset ? '↺' : isPoison ? `${definition.power}×→` : String(definition.power),
        {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: style.powerColor,
            fontStyle: 'bold',
        },
    ).setOrigin(0.5);

    container.add([ body, arrow, kindLabel, power ]);

    if (leapDistance > 1)
    {
        const leapBadge = scene.add.text(width - 6, 6, String(leapDistance), {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#ffffff',
            fontStyle: 'bold',
            backgroundColor: '#00000088',
            padding: { x: 3, y: 1 },
        }).setOrigin(1, 0);

        container.add(leapBadge);
    }

    if (interactive)
    {
        body.setInteractive({ useHandCursor: true });
    }

    return { container, hitArea: body };
};

/** @deprecated Use buildCardGraphic with a CardInstance. */
export const buildCardGraphicFromDefinition = (
    scene: Phaser.Scene,
    definitionId: string,
    options: CardVisualOptions,
): CardGraphic =>
    buildCardGraphic(scene, { instanceId: 'preview', definitionId, arrow: 'right' }, options);
