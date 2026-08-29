import { getGameCursors } from '../ui/gameCursors';
import { getCardDefinitionOrThrow, getChainStepDistance } from '../cardGame/config/cardRegistry';
import type { CardInstance } from '../cardGame/domain/types';
import { isEnemyOwnedCard, isFieldOwnedCard } from '../cardGame/domain/cardOwnership';
import { drawCornerBrackets } from '../config/cyberpunkUiGraphics';
import { CYBER } from '../config/cyberpunkTheme';
import { uiDisplayTextStyle, uiTextStyle } from '../config/uiTypography';
import { getCardBehaviorTextureKey } from '../../ui/icons/cardBehaviorIcons';
import { ARROW_GLYPH, arrowLabelPosition, cornerEntryArrowPosition } from './cardArrows';
import { createDirectionArrowImage, createLoopBadgeImage } from './directionArrowVisual';
import type { CardDirection } from '../cardGame/domain/cardDirections';
import { CARD_VISUALS } from './cardVisuals';
import { formatCardPowerLabel } from './cardVisualUtils';

export interface CardVisualOptions {
    width: number;
    height: number;
    interactive?: boolean;
}

export interface CardGraphic {
    container: Phaser.GameObjects.Container;
    hitArea: Phaser.GameObjects.Rectangle;
}

const CARD_DIRECTION_MARK_KEY = 'directionMark';

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
    const isLoopReset = definition.behaviorId === 'loop-reset';
    const leapDistance = getChainStepDistance(definition);
    const owned = isEnemyOwnedCard(card) || isFieldOwnedCard(card);
    const tier = definition.tier ?? 1;
    const borderWidth = owned ? 3 : (tier >= 3 ? 3 : 2);
    const rarityGlow = tier >= 3 ? CYBER.purple : (tier === 2 ? CYBER.gold : style.border);
    const glowAlpha = tier >= 3 ? 0.22 : (tier === 2 ? 0.16 : 0.12);

    const glow = scene.add.rectangle(
        width / 2,
        height / 2,
        width + (tier >= 2 ? 12 : 8),
        height + (tier >= 2 ? 12 : 8),
        rarityGlow,
        glowAlpha,
    );
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

    // Soft bevel plate so cards read thicker without painted art.
    const bevel = scene.add.rectangle(
        width / 2,
        height / 2,
        width - 4,
        height - 4,
        0xffffff,
        tier >= 2 ? 0.04 : 0.025,
    );

    const accent = scene.add.rectangle(width / 2, 5, width - 18, 2, style.border, 0.55);
    const brackets = scene.add.graphics();
    const rarityBrackets = scene.add.graphics();

    drawCornerBrackets(brackets, 3, 3, width - 6, height - 6, style.border, {
        arm: Math.min(11, Math.round(width * 0.14)),
        alpha: 0.95,
    });

    if (tier >= 2)
    {
        drawCornerBrackets(rarityBrackets, 1, 1, width - 2, height - 2, rarityGlow, {
            arm: Math.min(14, Math.round(width * 0.16)),
            alpha: tier >= 3 ? 0.85 : 0.55,
            lineWidth: tier >= 3 ? 2 : 1,
        });
    }

    if (owned)
    {
        const ownershipTint = scene.add.rectangle(width / 2, height / 2, width - 6, height - 6, style.border, 0.08);

        container.add(ownershipTint);
    }

    const isCornerTurn = definition.cornerTurn === true;
    const arrowPos = isCornerTurn
        ? cornerEntryArrowPosition(card.arrow, width, height)
        : arrowLabelPosition(card.arrow, width, height);
    const arrowSize = Math.max(14, Math.round(width * 0.28));

    let primaryMark: Phaser.GameObjects.GameObject;

    if (definition.unplayable)
    {
        primaryMark = scene.add.text(arrowPos.x, arrowPos.y, '✕', {
            ...uiTextStyle(Math.max(12, Math.round(width * 0.32)), '#c97b7b', { bold: true }),
        }).setOrigin(0.5);
    }
    else if (isJoker && !card.jokerDirectionChosen)
    {
        primaryMark = scene.add.text(arrowPos.x, arrowPos.y, '?', {
            ...uiTextStyle(24, '#ffffff', { bold: true }),
        }).setOrigin(0.5);
    }
    else
    {
        const arrowTint = isLoopReset ? 0xfcee0a : 0xffffff;
        const arrow = createDirectionArrowImage(scene, card.arrow, {
            size: arrowSize,
            tint: arrowTint,
        }) ?? scene.add.text(0, 0, ARROW_GLYPH[card.arrow], {
            ...uiTextStyle(Math.max(12, Math.round(width * 0.32)), isLoopReset ? '#fcee0a' : '#ffffff', { bold: true }),
        }).setOrigin(0.5);

        arrow.setPosition(arrowPos.x, arrowPos.y);
        primaryMark = arrow;
    }

    container.setData(CARD_DIRECTION_MARK_KEY, primaryMark);

    const cardDecor: Phaser.GameObjects.GameObject[] = [ primaryMark ];

    if (isLoopReset && card.loopArrow)
    {
        const loopDirection = card.loopArrow;
        const loopPos = arrowLabelPosition(loopDirection, width, height);
        const loopArrow = createDirectionArrowImage(scene, loopDirection, {
            size: Math.max(12, Math.round(width * 0.22)),
            tint: 0xe8daef,
        }) ?? scene.add.text(0, 0, ARROW_GLYPH[loopDirection], {
            ...uiTextStyle(17, '#e8daef', { bold: true }),
        }).setOrigin(0.5);

        loopArrow.setPosition(loopPos.x, loopPos.y);
        cardDecor.push(loopArrow);

        const loopBadge = createLoopBadgeImage(scene, {
            size: Math.max(10, Math.round(width * 0.16)),
            tint: 0xe8daef,
        });

        if (loopBadge)
        {
            loopBadge.setPosition(width * 0.5, height * 0.72);
            cardDecor.push(loopBadge);
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
        formatCardPowerLabel(definition),
        {
            ...uiDisplayTextStyle(22, style.powerColor, { bold: true }),
        },
    ).setOrigin(0.5);

    container.add([ glow, body, bevel, inner, accent, brackets, rarityBrackets, ...cardDecor, power ]);

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
        body.setInteractive({ cursor: getGameCursors().pointer });
    }

    return { container, hitArea: body };
};

/** Replaces the card's direction mark (used when Reroute resolves to a chosen arrow). */
export const updateCardGraphicDirection = (
    scene: Phaser.Scene,
    graphic: Phaser.GameObjects.Container,
    direction: CardDirection,
    width: number,
    height: number,
): void =>
{
    const previous = graphic.getData(CARD_DIRECTION_MARK_KEY) as { x?: number; y?: number; destroy?: () => void } | undefined;
    const previousPosition = typeof previous?.x === 'number' && typeof previous.y === 'number'
        ? { x: previous.x, y: previous.y }
        : arrowLabelPosition(direction, width, height);

    previous?.destroy?.();

    const size = Math.max(14, Math.round(width * 0.28));
    const mark = createDirectionArrowImage(scene, direction, {
        size,
        tint: 0xffffff,
    }) ?? scene.add.text(0, 0, ARROW_GLYPH[direction], {
        ...uiTextStyle(Math.max(12, Math.round(width * 0.32)), '#ffffff', { bold: true }),
    }).setOrigin(0.5);

    mark.setPosition(previousPosition.x, previousPosition.y);
    graphic.add(mark);
    graphic.bringToTop(mark);
    graphic.setData(CARD_DIRECTION_MARK_KEY, mark);
};

export const CARD_BACK_TEXTURE_KEY = 'card-back';

/** Cosmetic pile variants — never tied to card identity or pile kind. */
export const CARD_BACK_VARIANT_KEYS = [
    'card-back-cyber-node',
    'card-back-cyber-signal',
] as const;

/**
 * Stable cosmetic pick for a stack layer. Uses a visual salt only — not the game RNG —
 * so the mix looks random and cannot encode deck/discard contents.
 */
export const pickCardBackTextureKey = (layerIndex: number, visualSalt: number): string =>
{
    const h = Math.imul(layerIndex + 1 + (visualSalt | 0) * 17, 0x9e3779b1) >>> 0;
    const key = CARD_BACK_VARIANT_KEYS[h & 1]!;

    return key;
};

/** Face-down stack card — painted back art when loaded, procedural fallback otherwise. */
export const buildCardBackGraphic = (
    scene: Phaser.Scene,
    options: CardVisualOptions,
    accentColor: number = CYBER.cyan,
    textureKey: string = CARD_BACK_TEXTURE_KEY,
): CardGraphic =>
{
    const { width, height, interactive = false } = options;
    const container = scene.add.container(0, 0);
    const stroke = Math.max(2, Math.round(width * 0.035));
    const artKey = scene.textures.exists(textureKey)
        ? textureKey
        : scene.textures.exists(CARD_BACK_TEXTURE_KEY)
            ? CARD_BACK_TEXTURE_KEY
            : null;

    const shadow = scene.add.rectangle(
        width / 2 + 2,
        height / 2 + 3,
        width,
        height,
        0x000000,
        0.4,
    );

    const glow = scene.add.rectangle(
        width / 2,
        height / 2,
        width + 8,
        height + 8,
        accentColor,
        0.14,
    );

    const hitBody = scene.add.rectangle(width / 2, height / 2, width, height, CYBER.cardBack, 0.001);

    hitBody.setStrokeStyle(stroke, accentColor, 0.85);

    if (artKey)
    {
        const art = scene.add.image(width / 2, height / 2, artKey);

        art.setDisplaySize(width - 2, height - 2);
        art.setOrigin(0.5);

        const rim = scene.add.graphics();

        rim.lineStyle(stroke, accentColor, 0.75);
        rim.strokeRect(1, 1, width - 2, height - 2);
        drawCornerBrackets(rim, 3, 3, width - 6, height - 6, accentColor, {
            arm: Math.min(12, Math.round(width * 0.14)),
            alpha: 0.7,
            lineWidth: 2,
        });

        container.add([ shadow, glow, art, rim, hitBody ]);
    }
    else
    {
        const body = scene.add.rectangle(width / 2, height / 2, width, height, CYBER.cardBack, 1);

        body.setStrokeStyle(stroke, CYBER.cardBackBorder, 1);

        const bevel = scene.add.graphics();

        bevel.lineStyle(2, 0xffffff, 0.14);
        bevel.strokeRect(2, 2, width - 4, height - 4);

        const inset = Math.round(width * 0.1);
        const inner = scene.add.rectangle(
            width / 2,
            height / 2,
            width - inset * 2,
            height - inset * 2,
            CYBER.cardInner,
            0.95,
        );

        inner.setStrokeStyle(1, accentColor, 0.28);

        const accent = scene.add.rectangle(width / 2, inset - 1, width - inset * 2 - 4, 3, accentColor, 0.55);
        const brackets = scene.add.graphics();

        drawCornerBrackets(brackets, 4, 4, width - 8, height - 8, accentColor, {
            arm: Math.min(14, Math.round(width * 0.16)),
            alpha: 0.9,
            lineWidth: 2,
        });

        const mark = scene.add.text(width / 2, height / 2, '◈', {
            ...uiDisplayTextStyle(Math.round(width * 0.32), `#${accentColor.toString(16).padStart(6, '0')}`, {
                bold: true,
                strokeColor: '#0a0610',
            }),
        }).setOrigin(0.5);

        container.add([ shadow, glow, body, bevel, inner, accent, brackets, mark, hitBody ]);
    }

    if (interactive)
    {
        hitBody.setInteractive({ cursor: getGameCursors().pointer });
    }

    return { container, hitArea: hitBody };
};
