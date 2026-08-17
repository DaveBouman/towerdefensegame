export interface DamageTierStyle {
    color: string;
    fontSize: number;
    shakeIntensity: number;
    hitstopMs: number;
}

const DAMAGE_TIERS: readonly { min: number; style: DamageTierStyle }[] = [
    {
        min: 40,
        style: { color: '#ff2d2d', fontSize: 38, shakeIntensity: 0.024, hitstopMs: 70 },
    },
    {
        min: 20,
        style: { color: '#ff9f43', fontSize: 32, shakeIntensity: 0.016, hitstopMs: 48 },
    },
    {
        min: 10,
        style: { color: '#ffe066', fontSize: 28, shakeIntensity: 0.010, hitstopMs: 28 },
    },
    {
        min: 0,
        style: { color: '#ff7675', fontSize: 24, shakeIntensity: 0.005, hitstopMs: 0 },
    },
];

/** Maps combat juice intensity to Phaser camera shake duration + strength. */
export const getCameraShakeParams = (
    intensity: number,
): { duration: number; intensity: number } =>
{
    if (intensity <= 0)
    {
        return { duration: 0, intensity: 0 };
    }

    const clamped = Math.min(0.035, Math.max(0.004, intensity));

    return {
        duration: Math.min(360, Math.round(80 + clamped * 6500)),
        intensity: clamped,
    };
};

export const shakeCamera = (scene: Phaser.Scene, intensity: number): void =>
{
    const { duration, intensity: shakeStrength } = getCameraShakeParams(intensity);

    if (duration <= 0)
    {
        return;
    }

    scene.cameras.main.shake(duration, shakeStrength);
};

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

export const KILL_CAMERA_SHAKE = 0.022;

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
