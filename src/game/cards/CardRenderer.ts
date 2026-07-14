import { getCardDefinitionOrThrow, GAME_RULES, getChainStepDistance } from '../cardGame/config/cardRegistry';
import type { CardInstance } from '../cardGame/domain/types';
import { isEnemyOwnedCard, isFieldOwnedCard } from '../cardGame/domain/cardOwnership';
import { drawCornerBrackets } from '../config/cyberpunkUiGraphics';
import { CYBER } from '../config/cyberpunkTheme';
import { uiDisplayTextStyle, uiTextStyle } from '../config/uiTypography';
import { getCardBehaviorTextureKey } from '../../ui/icons/cardBehaviorIcons';
import { ARROW_GLYPH, arrowLabelPosition, cornerEntryArrowPosition } from './cardArrows';
import { cornerTargetDirections } from '../cardGame/domain/cardDirections';
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
    Math.max(18, Math.round(width * 0.26));

const cardKindLabelSize = (width: number): number =>
    Math.max(10, Math.round(width * 0.14));

/** Builds a card graphic from a card instance (arrow comes from the instance). */
export const buildCardGraphic = (
    scene: Phaser.Scene,
    card: CardInstance,
    options: CardVisualOptions,
): CardGraphic =>
{
    const definition = getCardDefinitionOrThrow(card.definitionId);
    const visualKey = definition.visualId ?? definition.behaviorId;
    const style = CARD_VISUALS[visualKey] ?? CARD_VISUALS[definition.behaviorId] ?? CARD_VISUALS.attack;
    const { width, height, interactive = false } = options;
    const container = scene.add.container(0, 0);
    const isJoker = definition.behaviorId === 'joker';
    const isBoost = definition.behaviorId === 'boost';
    const isLoopReset = definition.behaviorId === 'loop-reset';
    const isPoison = definition.behaviorId === 'poison';
    const isFire = definition.behaviorId === 'fire';
    const isCurse = definition.behaviorId === 'curse';
    const isFuse = visualKey === 'fuse';
    const handPenalty = definition.handEndPenalty ?? 0;
    const leapDistance = getChainStepDistance(definition);
    const owned = isEnemyOwnedCard(card) || isFieldOwnedCard(card);
    const borderWidth = owned ? 3 : 2;

    const glow = scene.add.rectangle(width / 2, height / 2, width + 8, height + 8, style.border, 0.12);
    const body = scene.add.rectangle(width / 2, height / 2, width, height, style.fill);

    body.setStrokeStyle(borderWidth, style.border, 1);

    const inner = scene.add.rectangle(
        width / 2,
        height / 2,
        width - 10,
        height - 10,
        CYBER.cardInner,
        0.88,
    );

    const accent = scene.add.rectangle(width / 2, 5, width - 18, 2, style.border, 0.55);
    const brackets = scene.add.graphics();

    drawCornerBrackets(brackets, 3, 3, width - 6, height - 6, style.border, {
        arm: Math.min(11, Math.round(width * 0.14)),
        alpha: 0.95,
    });

    if (owned)
    {
        const ownershipTint = scene.add.rectangle(width / 2, height / 2, width - 6, height - 6, style.border, 0.08);

        container.add(ownershipTint);
    }

    const isCornerDefense = definition.id === 'corner-defense';
    const arrowPos = isCornerDefense
        ? cornerEntryArrowPosition(card.arrow, width, height)
        : arrowLabelPosition(card.arrow, width, height);
    const continueArrow = scene.add.text(arrowPos.x, arrowPos.y, ARROW_GLYPH[card.arrow], {
        ...uiTextStyle(20, isLoopReset ? '#fcee0a' : '#ffffff', { bold: true }),
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

    if (definition.cornerTurn && !isCornerDefense)
    {
        for (const target of cornerTargetDirections(card.arrow))
        {
            const hookPos = arrowLabelPosition(target, width, height);
            const hookArrow = scene.add.text(hookPos.x, hookPos.y, ARROW_GLYPH[target], {
                ...uiTextStyle(15, '#ffd98a', { bold: true }),
            }).setOrigin(0.5);

            cardDecor.push(hookArrow);
        }
    }

    const kindIconY = height * 0.3;
    const kindLabelY = height * 0.44;
    const kindIconSize = cardKindIconSize(width);
    const kindTextureKey = getCardBehaviorTextureKey(visualKey)
        ?? getCardBehaviorTextureKey(definition.behaviorId);

    if (kindTextureKey && scene.textures.exists(kindTextureKey))
    {
        const kindIcon = scene.add.image(width / 2, kindIconY, kindTextureKey);
        kindIcon.setDisplaySize(kindIconSize, kindIconSize);
        kindIcon.setOrigin(0.5);
        kindIcon.setTint(style.border);
        cardDecor.push(kindIcon);
    }

    const kindLabel = scene.add.text(width / 2, kindLabelY, definition.label, {
        ...uiTextStyle(cardKindLabelSize(width), style.labelColor, { bold: true }),
    }).setOrigin(0.5);

    cardDecor.push(kindLabel);

    const power = scene.add.text(
        width / 2,
        height * 0.62,
        isJoker ? '★' : isBoost ? `×${GAME_RULES.fieldBoost.nextStepMultiplier}` : isLoopReset ? '↺1' : isPoison ? `${definition.power}×→` : isFire ? `${definition.power}↔` : isCurse && handPenalty > 0 ? `-${handPenalty}` : isFuse && handPenalty > 0 ? `${definition.power}!` : String(definition.power),
        {
            ...uiDisplayTextStyle(22, style.powerColor, { bold: true }),
        },
    ).setOrigin(0.5);

    if (definition.unplayable)
    {
        continueArrow.setText('✕');
        continueArrow.setColor('#c97b7b');
    }

    if (isJoker)
    {
        continueArrow.setText('?');
        continueArrow.setFontSize(24);
    }

    container.add([ glow, body, inner, accent, brackets, ...cardDecor, power ]);

    if (leapDistance > 1)
    {
        const leapBadge = scene.add.text(width - 6, 6, String(leapDistance), {
            ...uiDisplayTextStyle(12, '#ffffff', {
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

/** Face-down stack card — same chrome as hand cards, used on the draw pile. */
export const buildCardBackGraphic = (
    scene: Phaser.Scene,
    options: CardVisualOptions,
    accentColor: number = CYBER.cyan,
): CardGraphic =>
{
    const { width, height, interactive = false } = options;
    const container = scene.add.container(0, 0);

    const glow = scene.add.rectangle(width / 2, height / 2, width + 8, height + 8, accentColor, 0.1);
    const body = scene.add.rectangle(width / 2, height / 2, width, height, CYBER.cardBack, 1);

    body.setStrokeStyle(2, CYBER.cardBackBorder, 1);

    const inner = scene.add.rectangle(
        width / 2,
        height / 2,
        width - 10,
        height - 10,
        CYBER.cardInner,
        0.9,
    );

    const accent = scene.add.rectangle(width / 2, 5, width - 18, 2, accentColor, 0.45);
    const brackets = scene.add.graphics();

    drawCornerBrackets(brackets, 3, 3, width - 6, height - 6, accentColor, {
        arm: Math.min(11, Math.round(width * 0.14)),
        alpha: 0.85,
    });

    const mark = scene.add.text(width / 2, height / 2, '◈', {
        ...uiDisplayTextStyle(Math.round(width * 0.28), `#${accentColor.toString(16).padStart(6, '0')}`, { bold: true }),
    }).setOrigin(0.5);

    container.add([ glow, body, inner, accent, brackets, mark ]);

    if (interactive)
    {
        body.setInteractive({ useHandCursor: true });
    }

    return { container, hitArea: body };
};
