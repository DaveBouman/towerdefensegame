export interface DamageTierStyle {
    color: string;
    fontSize: number;
    shakeIntensity: number;
    hitstopMs: number;
}

const DAMAGE_TIERS: readonly { min: number; style: DamageTierStyle }[] = [
    {
        min: 40,
        style: { color: '#ff2d2d', fontSize: 38, shakeIntensity: 0.012, hitstopMs: 70 },
    },
    {
        min: 20,
        style: { color: '#ff9f43', fontSize: 32, shakeIntensity: 0.008, hitstopMs: 48 },
    },
    {
        min: 10,
        style: { color: '#ffe066', fontSize: 28, shakeIntensity: 0.005, hitstopMs: 28 },
    },
    {
        min: 0,
        style: { color: '#ff7675', fontSize: 24, shakeIntensity: 0.003, hitstopMs: 0 },
    },
];

export const getDamageTierStyle = (damage: number): DamageTierStyle =>
{
    for (const tier of DAMAGE_TIERS)
    {
        if (damage >= tier.min)
        {
            return tier.style;
        }
    }

    return DAMAGE_TIERS[DAMAGE_TIERS.length - 1]!.style;
};

const ELEMENT_HIT_COLORS: Record<string, number> = {
    fire: 0xff6b35,
    cinder: 0xff6b35,
    poison: 0x58d68d,
    miasma: 0x58d68d,
    bleed: 0xff3b6b,
    rupture: 0xff3b6b,
    attack: 0xff7675,
};

export const getElementHitColor = (visualId?: string, behaviorId?: string): number =>
{
    const key = visualId ?? behaviorId ?? 'attack';

    return ELEMENT_HIT_COLORS[key] ?? ELEMENT_HIT_COLORS.attack!;
};

export const shakeCamera = (scene: Phaser.Scene, intensity: number): void =>
{
    if (intensity <= 0)
    {
        return;
    }

    const camera = scene.cameras.main;

    camera.shake(Math.min(280, 120 + intensity * 8000), intensity);
};

export const getChainStepMs = (behaviorId: string, baseMs: number): number =>
{
    switch (behaviorId)
    {
        case 'attack':
        case 'fire':
        case 'bleed':
            return Math.round(baseMs * 0.82);
        case 'defend':
            return Math.round(baseMs * 1.18);
        case 'poison':
        case 'battle-mod':
            return Math.round(baseMs * 1.05);
        case 'echo':
        case 'joker':
            return Math.round(baseMs * 0.92);
        default:
            return baseMs;
    }
};

/** Later chain steps snap a bit faster — gentle acceleration, not a blur. */
export const getChainPaceMultiplier = (stepIndex: number): number =>
    Math.max(0.62, 1 - Math.max(0, stepIndex) * 0.05);

/** Short gap between cards — not another full step wait. */
export const getChainGapMs = (baseMs: number): number =>
    Math.min(72, Math.max(24, Math.round(baseMs * 0.12)));

export interface ChainMomentInput {
    killed?: boolean;
    damage?: number;
    abilityDetonation?: boolean;
}

/** Extra hold on kills, chunky hits, and on-step ability detonations. */
export const getBigMomentHoldMs = (moment: ChainMomentInput): number =>
{
    if (moment.killed)
    {
        return 160;
    }

    if (moment.abilityDetonation)
    {
        return 110;
    }

    const damage = moment.damage ?? 0;

    if (damage >= 20)
    {
        return 80;
    }

    if (damage >= 10)
    {
        return 36;
    }

    return 0;
};

export const playElementHitBurst = (
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    color: number,
): void =>
{
    const burst = scene.add.circle(x, y, 8, color, 0.55);

    parent.add(burst);
    burst.setDepth(900);

    scene.tweens.add({
        targets: burst,
        scaleX: 2.8,
        scaleY: 2.8,
        alpha: 0,
        duration: 220,
        ease: 'Cubic.easeOut',
        onComplete: () => burst.destroy(),
    });
};

export const getIntentThreatLevel = (action: { steps: readonly { kind: string; amount?: number }[] }): number =>
{
    let threat = 0;

    for (const step of action.steps)
    {
        if (step.kind === 'attack' || step.kind === 'place-hazard')
        {
            threat += step.amount ?? 0;
        }

        if (step.kind === 'place-siphon')
        {
            threat += 6;
        }
    }

    return threat;
};

export const isHighThreatIntent = (threat: number): boolean => threat >= 14;
