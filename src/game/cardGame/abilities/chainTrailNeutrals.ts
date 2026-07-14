/** Skills that sit between trail starters and their targets without ending or counting toward the trail. */
export const TRAIL_NEUTRAL_BEHAVIORS = new Set([
    'joker',
    'boost',
    'fire',
    'poison',
    'loop-reset',
    'hazard',
    'echo',
]);

export const isTrailNeutralBehavior = (behaviorId: string): boolean =>
    TRAIL_NEUTRAL_BEHAVIORS.has(behaviorId);

/** Whether an attack appears between two chain indices (ignoring trail-neutral steps). */
export const hasAttackBetween = (
    chain: readonly { behaviorId: string }[],
    fromIndex: number,
    toIndex: number,
): boolean =>
{
    for (let i = fromIndex + 1; i < toIndex; i++)
    {
        const behaviorId = chain[i]!.behaviorId;

        if (isTrailNeutralBehavior(behaviorId))
        {
            continue;
        }

        if (behaviorId === 'attack')
        {
            return true;
        }
    }

    return false;
};
