import { getCardDefinition } from '../../config/cardRegistry';
import type { SlotPosition } from '../../domain/types';
import type Phaser from 'phaser';

const degToRad = (degrees: number): number => (degrees * Math.PI) / 180;

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export type ElementHitKind = 'attack' | 'fire' | 'poison' | 'bleed' | 'overload';

export interface ElementHitContext {
    visualId?: string;
    behaviorId?: string;
    abilityId?: string;
    definitionId?: string;
    sourceSlot?: SlotPosition;
}

const ELEMENT_COLORS: Record<ElementHitKind, number> = {
    attack: 0xff7675,
    fire: 0xff6b35,
    poison: 0x58d68d,
    bleed: 0xff3b6b,
    overload: 0xfcee0a,
};

const VISUAL_TO_ELEMENT: Record<string, ElementHitKind> = {
    attack: 'attack',
    fire: 'fire',
    cinder: 'fire',
    scorch: 'fire',
    poison: 'poison',
    miasma: 'poison',
    bleed: 'bleed',
    rupture: 'bleed',
    lacerate: 'bleed',
    shiv: 'bleed',
    exsanguinate: 'bleed',
    serration: 'bleed',
    surge: 'overload',
    'amp-core': 'overload',
};

const ABILITY_TO_ELEMENT: Record<string, ElementHitKind> = {
    bleed: 'bleed',
    'fire-alternation': 'fire',
    'poison-trail': 'poison',
    overload: 'overload',
};

const CHAIN_ABILITY_ELEMENT: Record<string, ElementHitKind> = {
    bleed: 'bleed',
    'fire-alternation': 'fire',
    'poison-trail': 'poison',
    overload: 'overload',
};

const VFX_DEPTH = 1800;

const getWorldCenter = (
    obj: Phaser.GameObjects.GameObject,
    localCenterX: number,
    localCenterY: number,
): { x: number; y: number } =>
{
    try
    {
        const bounds = obj.getBounds();

        if (bounds.width > 0 && bounds.height > 0)
        {
            return { x: bounds.centerX, y: bounds.centerY };
        }

        const matrix = (obj as Phaser.GameObjects.Container).getWorldTransformMatrix();

        return {
            x: matrix.tx + localCenterX,
            y: matrix.ty + localCenterY,
        };
    }
    catch
    {
        return { x: localCenterX, y: localCenterY };
    }
};

export const resolveElementHitKind = (context: ElementHitContext = {}): ElementHitKind =>
{
    if (context.abilityId && ABILITY_TO_ELEMENT[context.abilityId])
    {
        return ABILITY_TO_ELEMENT[context.abilityId]!;
    }

    if (context.behaviorId === 'fire')
    {
        return 'fire';
    }

    if (context.behaviorId === 'poison')
    {
        return 'poison';
    }

    if (context.definitionId)
    {
        const definition = getCardDefinition(context.definitionId);

        for (const abilityId of definition?.chainAbilityIds ?? [])
        {
            const mapped = CHAIN_ABILITY_ELEMENT[abilityId];

            if (mapped)
            {
                return mapped;
            }
        }
    }

    const visualKey = context.visualId ?? context.behaviorId;

    if (visualKey && VISUAL_TO_ELEMENT[visualKey])
    {
        return VISUAL_TO_ELEMENT[visualKey]!;
    }

    return 'attack';
};

export const getElementHitColor = (context: ElementHitContext = {}): number =>
    ELEMENT_COLORS[resolveElementHitKind(context)];

const tweenAndDestroy = (
    scene: Phaser.Scene,
    targets: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
    duration: number,
): void =>
{
    scene.tweens.add({
        targets,
        alpha: 0,
        duration,
        ease: 'Cubic.easeIn',
        onComplete: () =>
        {
            const list = Array.isArray(targets) ? targets : [ targets ];

            for (const target of list)
            {
                target.destroy();
            }
        },
    });
};

const spawnRisingEmbers = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    color: number,
    count: number,
): void =>
{
    for (let index = 0; index < count; index += 1)
    {
        const offsetX = (index - (count - 1) / 2) * 10;
        const ember = scene.add.circle(x + offsetX, y, 5 + index % 2, color, 0.75);

        parent.add(ember);
        ember.setDepth(VFX_DEPTH);

        scene.tweens.add({
            targets: ember,
            y: y - 28 - index * 6,
            x: x + offsetX + (index % 2 === 0 ? -8 : 8),
            scaleX: 1.8,
            scaleY: 1.8,
            alpha: 0,
            duration: 260 + index * 40,
            ease: 'Cubic.easeOut',
            onComplete: () => ember.destroy(),
        });
    }
};

const playAttackHitEffect = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
): void =>
{
    const burst = scene.add.circle(x, y, 8, ELEMENT_COLORS.attack, 0.55);

    parent.add(burst);
    burst.setDepth(VFX_DEPTH);

    scene.tweens.add({
        targets: burst,
        scaleX: 2.6,
        scaleY: 2.6,
        alpha: 0,
        duration: 220,
        ease: 'Cubic.easeOut',
        onComplete: () => burst.destroy(),
    });

    const sparks = scene.add.graphics();

    parent.add(sparks);
    sparks.setDepth(VFX_DEPTH + 1);

    sparks.lineStyle(2, 0xffffff, 0.9);

    for (let angle = 0; angle < 360; angle += 45)
    {
        const radians = degToRad(angle);
        sparks.lineBetween(
            x,
            y,
            x + Math.cos(radians) * 18,
            y + Math.sin(radians) * 18,
        );
    }

    tweenAndDestroy(scene, sparks, 180);
};

const playFireHitEffect = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
): void =>
{
    const core = scene.add.circle(x, y, 10, 0xffe066, 0.85);
    const outer = scene.add.circle(x, y, 14, ELEMENT_COLORS.fire, 0.45);

    parent.add([ core, outer ]);
    core.setDepth(VFX_DEPTH);
    outer.setDepth(VFX_DEPTH);

    scene.tweens.add({
        targets: [ core, outer ],
        scaleX: 2.4,
        scaleY: 2.4,
        alpha: 0,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () =>
        {
            core.destroy();
            outer.destroy();
        },
    });

    spawnRisingEmbers(scene, parent, x, y, ELEMENT_COLORS.fire, 4);
    spawnRisingEmbers(scene, parent, x, y, 0xffe066, 2);
};

const playPoisonHitEffect = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
): void =>
{
    for (let index = 0; index < 5; index += 1)
    {
        const bubble = scene.add.circle(
            x + (index - 2) * 9,
            y + index * 4,
            4 + (index % 2),
            ELEMENT_COLORS.poison,
            0.65,
        );

        parent.add(bubble);
        bubble.setDepth(VFX_DEPTH);

        scene.tweens.add({
            targets: bubble,
            y: y - 24 - index * 5,
            x: bubble.x + (index % 2 === 0 ? -6 : 6),
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 420 + index * 30,
            ease: 'Sine.easeOut',
            onComplete: () => bubble.destroy(),
        });
    }
};

const playBleedHitEffect = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
): void =>
{
    const slashes = scene.add.graphics();

    parent.add(slashes);
    slashes.setDepth(VFX_DEPTH + 1);
    slashes.lineStyle(3, ELEMENT_COLORS.bleed, 0.95);
    slashes.lineBetween(x - 16, y - 10, x + 14, y + 12);
    slashes.lineStyle(2, 0xff8fab, 0.85);
    slashes.lineBetween(x - 10, y + 8, x + 18, y - 14);

    tweenAndDestroy(scene, slashes, 220);

    const drip = scene.add.circle(x, y + 6, 5, ELEMENT_COLORS.bleed, 0.7);

    parent.add(drip);
    drip.setDepth(VFX_DEPTH);

    scene.tweens.add({
        targets: drip,
        y: y + 22,
        alpha: 0,
        duration: 280,
        ease: 'Quad.easeIn',
        onComplete: () => drip.destroy(),
    });
};

const playOverloadHitEffect = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
): void =>
{
    const flash = scene.add.circle(x, y, 12, 0xffffff, 0.75);
    const glow = scene.add.circle(x, y, 16, ELEMENT_COLORS.overload, 0.55);

    parent.add([ flash, glow ]);
    flash.setDepth(VFX_DEPTH);
    glow.setDepth(VFX_DEPTH);

    scene.tweens.add({
        targets: [ flash, glow ],
        scaleX: 2.2,
        scaleY: 2.2,
        alpha: 0,
        duration: 200,
        ease: 'Cubic.easeOut',
        onComplete: () =>
        {
            flash.destroy();
            glow.destroy();
        },
    });

    const bolt = scene.add.graphics();

    parent.add(bolt);
    bolt.setDepth(VFX_DEPTH + 1);
    bolt.lineStyle(2, ELEMENT_COLORS.overload, 1);
    bolt.lineBetween(x - 14, y - 18, x + 4, y - 4);
    bolt.lineBetween(x + 4, y - 4, x - 6, y + 8);
    bolt.lineBetween(x - 6, y + 8, x + 12, y + 16);
    bolt.lineStyle(1, 0x7af0ff, 0.85);
    bolt.lineBetween(x - 12, y - 16, x + 6, y - 2);
    bolt.lineBetween(x + 6, y - 2, x - 4, y + 10);
    bolt.lineBetween(x - 4, y + 10, x + 10, y + 14);

    tweenAndDestroy(scene, bolt, 180);
};

export const playElementHitEffect = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    context: ElementHitContext = {},
): void =>
{
    switch (resolveElementHitKind(context))
    {
        case 'fire':
            playFireHitEffect(scene, parent, x, y);
            break;
        case 'poison':
            playPoisonHitEffect(scene, parent, x, y);
            break;
        case 'bleed':
            playBleedHitEffect(scene, parent, x, y);
            break;
        case 'overload':
            playOverloadHitEffect(scene, parent, x, y);
            break;
        default:
            playAttackHitEffect(scene, parent, x, y);
            break;
    }
};

const buildLightningPoints = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    segments: number,
): { x: number; y: number }[] =>
{
    const points: { x: number; y: number }[] = [ { x: fromX, y: fromY } ];

    for (let index = 1; index < segments; index += 1)
    {
        const t = index / segments;
        const baseX = lerp(fromX, toX, t);
        const baseY = lerp(fromY, toY, t);
        const offset = (index % 2 === 0 ? 1 : -1) * (12 + (index % 3) * 4);

        points.push({
            x: baseX + offset,
            y: baseY + offset * 0.35,
        });
    }

    points.push({ x: toX, y: toY });

    return points;
};

const drawLightningPath = (
    graphics: Phaser.GameObjects.Graphics,
    points: readonly { x: number; y: number }[],
    color: number,
    width: number,
): void =>
{
    graphics.lineStyle(width, color, 1);
    graphics.beginPath();
    graphics.moveTo(points[0]!.x, points[0]!.y);

    for (let index = 1; index < points.length; index += 1)
    {
        graphics.lineTo(points[index]!.x, points[index]!.y);
    }

    graphics.strokePath();
};

export const playElementStrikeBeam = (
    scene: Phaser.Scene,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    context: ElementHitContext = {},
): void =>
{
    const kind = resolveElementHitKind(context);
    const beam = scene.add.graphics();

    beam.setDepth(VFX_DEPTH + 2);

    switch (kind)
    {
        case 'overload':
        {
            const points = buildLightningPoints(fromX, fromY, toX, toY, 5);

            drawLightningPath(beam, points, 0x7af0ff, 4);
            drawLightningPath(beam, points, ELEMENT_COLORS.overload, 2);
            tweenAndDestroy(scene, beam, 140);
            break;
        }
        case 'fire':
        {
            beam.lineStyle(5, ELEMENT_COLORS.fire, 0.85);
            beam.lineBetween(fromX, fromY, toX, toY);
            beam.lineStyle(2, 0xffe066, 0.95);
            beam.lineBetween(fromX, fromY, toX, toY);
            tweenAndDestroy(scene, beam, 180);

            for (let index = 0; index < 3; index += 1)
            {
                const t = (index + 1) / 4;
                const ember = scene.add.circle(
                    lerp(fromX, toX, t),
                    lerp(fromY, toY, t),
                    4,
                    index % 2 === 0 ? ELEMENT_COLORS.fire : 0xffe066,
                    0.8,
                );

                ember.setDepth(VFX_DEPTH + 1);
                scene.tweens.add({
                    targets: ember,
                    alpha: 0,
                    scaleX: 1.8,
                    scaleY: 1.8,
                    duration: 220,
                    onComplete: () => ember.destroy(),
                });
            }

            break;
        }
        case 'poison':
        {
            beam.lineStyle(3, ELEMENT_COLORS.poison, 0.75);
            beam.lineBetween(fromX, fromY, toX, toY);

            for (let index = 1; index <= 4; index += 1)
            {
                const t = index / 5;
                const dripX = lerp(fromX, toX, t);
                const dripY = lerp(fromY, toY, t);
                const drip = scene.add.circle(dripX, dripY, 3, ELEMENT_COLORS.poison, 0.8);

                drip.setDepth(VFX_DEPTH + 1);
                scene.tweens.add({
                    targets: drip,
                    y: dripY + 10,
                    alpha: 0,
                    duration: 260,
                    onComplete: () => drip.destroy(),
                });
            }

            tweenAndDestroy(scene, beam, 220);
            break;
        }
        case 'bleed':
        {
            const midX = (fromX + toX) / 2 + (toY - fromY) * 0.08;
            const midY = (fromY + toY) / 2 - (toX - fromX) * 0.08;

            beam.lineStyle(4, ELEMENT_COLORS.bleed, 0.9);
            beam.beginPath();
            beam.moveTo(fromX, fromY);
            beam.lineTo(midX, midY);
            beam.lineTo(toX, toY);
            beam.strokePath();
            tweenAndDestroy(scene, beam, 170);
            break;
        }
        default:
        {
            beam.lineStyle(2, 0x7af0ff, 0.95);
            beam.lineBetween(fromX, fromY, toX, toY);
            beam.lineStyle(1, 0xffffff, 0.85);
            beam.lineBetween(fromX, fromY, toX, toY);
            tweenAndDestroy(scene, beam, 120);
            break;
        }
    }
};

export const playPoisonApplyEffect = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
): void =>
{
    playPoisonHitEffect(scene, parent, x, y);

    const cloud = scene.add.circle(x, y + 8, 10, ELEMENT_COLORS.poison, 0.35);

    parent.add(cloud);
    cloud.setDepth(VFX_DEPTH - 1);

    scene.tweens.add({
        targets: cloud,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        duration: 480,
        ease: 'Sine.easeOut',
        onComplete: () => cloud.destroy(),
    });
};

export const playElementStrikeFromSources = (
    scene: Phaser.Scene,
    boardView: { getCardVisualTarget(slot: SlotPosition): { wrapper: Phaser.GameObjects.Container; width: number; height: number } | null },
    enemyContainer: Phaser.GameObjects.Container,
    context: ElementHitContext,
): void =>
{
    if (!context.sourceSlot)
    {
        return;
    }

    const cardTarget = boardView.getCardVisualTarget(context.sourceSlot);

    if (!cardTarget)
    {
        return;
    }

    const from = getWorldCenter(cardTarget.wrapper, cardTarget.width / 2, cardTarget.height / 2);
    const enemyBounds = enemyContainer.getBounds();

    playElementStrikeBeam(scene, from.x, from.y, enemyBounds.centerX, enemyBounds.centerY, context);
};
