export interface DamageTierStyle {
    color: string;
    fontSize: number;
    shakeIntensity: number;
    hitstopMs: number;
}

const DAMAGE_TIERS: readonly { min: number; style: DamageTierStyle }[] = [
    {
        min: 40,
        style: { color: '#ff2d2d', fontSize: 40, shakeIntensity: 0.028, hitstopMs: 88 },
    },
    {
        min: 20,
        style: { color: '#ff9f43', fontSize: 34, shakeIntensity: 0.018, hitstopMs: 56 },
    },
    {
        min: 10,
        style: { color: '#ffe066', fontSize: 28, shakeIntensity: 0.011, hitstopMs: 32 },
    },
    {
        min: 0,
        style: { color: '#ff7675', fontSize: 22, shakeIntensity: 0.004, hitstopMs: 0 },
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

    const clamped = Math.min(0.04, Math.max(0.0035, intensity));

    return {
        duration: Math.min(400, Math.round(70 + clamped * 7200)),
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

/** Kill punch — stronger than a big hit so wipe moments land. */
export const KILL_CAMERA_SHAKE = 0.03;

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
        return 200;
    }

    if (moment.abilityDetonation)
    {
        return 120;
    }

    const damage = moment.damage ?? 0;

    if (damage >= 20)
    {
        return 95;
    }

    if (damage >= 10)
    {
        return 42;
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
