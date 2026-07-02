import { getCardDefinitionOrThrow, GAME_RULES, getChainStepDistance } from '../cardGame/config/cardRegistry';
import type { CardInstance } from '../cardGame/domain/types';
import { isEnemyOwnedCard, isFieldOwnedCard } from '../cardGame/domain/cardOwnership';
import { uiTextStyle } from '../config/uiTypography';
import { getCardBehaviorTextureKey } from '../../ui/icons/cardBehaviorIcons';
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

const cardKindIconSize = (width: number): number =>
    Math.max(22, Math.round(width * 0.34));

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
    const isFire = definition.behaviorId === 'fire';
    const leapDistance = getChainStepDistance(definition);

    const body = scene.add.rectangle(width / 2, height / 2, width, height, style.fill);

    body.setStrokeStyle(isEnemyOwnedCard(card) || isFieldOwnedCard(card) ? 3 : 2, style.border, 1);

    const arrowPos = arrowLabelPosition(card.arrow, width, height);
    const continueArrow = scene.add.text(arrowPos.x, arrowPos.y, ARROW_GLYPH[card.arrow], {
        ...uiTextStyle(20, isLoopReset ? '#f1c40f' : '#ffffff', { bold: true }),
    }).setOrigin(0.5);

    const cardDecor: Phaser.GameObjects.GameObject[] = [ continueArrow ];

    if (isLoopReset && card.loopArrow)
    {
        const loopDirection = card.loopArrow;
        const loopPos = arrowLabelPosition(loopDirection, width, height);
        const loopArrow = scene.add.text(loopPos.x, loopPos.y, `↺${ARROW_GLYPH[loopDirection]}`, {
            ...uiTextStyle(17, '#e8daef', { bold: true }),
        }).setOrigin(0.5);

        cardDecor.push(loopArrow);
    }

    const kindIconY = height * 0.38;
    const kindIconSize = cardKindIconSize(width);
    const kindTextureKey = getCardBehaviorTextureKey(definition.behaviorId);

    if (kindTextureKey && scene.textures.exists(kindTextureKey))
    {
        const kindIcon = scene.add.image(width / 2, kindIconY, kindTextureKey);
        kindIcon.setDisplaySize(kindIconSize, kindIconSize);
        kindIcon.setOrigin(0.5);
        kindIcon.setTint(style.border);
        cardDecor.push(kindIcon);
    }
    else
    {
        const kindLabel = scene.add.text(width / 2, kindIconY, definition.label, {
            ...uiTextStyle(14, style.labelColor, { bold: true }),
        }).setOrigin(0.5);

        cardDecor.push(kindLabel);
    }

    const power = scene.add.text(
        width / 2,
        height * 0.62,
        isJoker ? '★' : isBoost ? `×${GAME_RULES.fieldBoost.nextStepMultiplier}` : isLoopReset ? '↺1' : isPoison ? `${definition.power}×→` : isFire ? `${definition.power}↔` : String(definition.power),
        {
            ...uiTextStyle(22, style.powerColor, { bold: true }),
        },
    ).setOrigin(0.5);

    if (isJoker)
    {
        continueArrow.setText('?');
        continueArrow.setFontSize(24);
    }

    container.add([ body, ...cardDecor, power ]);

    if (leapDistance > 1)
    {
        const leapBadge = scene.add.text(width - 6, 6, String(leapDistance), {
            ...uiTextStyle(12, '#ffffff', {
                bold: true,
                backgroundColor: '#000000aa',
                padding: { x: 4, y: 2 },
            }),
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
