/** Categories Latch Array can pin to the grid after an energy-round wipe. */
export type LatchKind = 'attack' | 'defend' | 'skill';

export type LatchSlots = Partial<Record<LatchKind, string>>;

const NON_LATCH_BEHAVIORS = new Set([
    'hazard',
    'siphon',
    'boost',
    'curse',
    'fuse',
]);

const LATCH_KINDS: readonly LatchKind[] = [ 'attack', 'defend', 'skill' ];

/** Maps a card behavior to the Latch Array slot it fills, if any. */
export const getLatchKind = (behaviorId: string): LatchKind | null =>
{
    if (behaviorId === 'attack')
    {
        return 'attack';
    }

    if (behaviorId === 'defend')
    {
        return 'defend';
    }

    if (NON_LATCH_BEHAVIORS.has(behaviorId))
    {
        return null;
    }

    return 'skill';
};

/** Pins the first Attack, Defend, and Skill placed this energy round. */
export const noteLatchPlacement = (
    slots: LatchSlots,
    behaviorId: string,
    instanceId: string,
): void =>
{
    const kind = getLatchKind(behaviorId);

    if (!kind || slots[kind])
    {
        return;
    }

    slots[kind] = instanceId;
};

/** Clears a latch slot if that pinned card was picked up or replaced. */
export const noteLatchRemoval = (slots: LatchSlots, instanceId: string): void =>
{
    for (const kind of LATCH_KINDS)
    {
        if (slots[kind] === instanceId)
        {
            delete slots[kind];
        }
    }
};

export const getLatchKeepInstanceIds = (slots: LatchSlots): ReadonlySet<string> =>
    new Set(LATCH_KINDS.map((kind) => slots[kind]).filter((id): id is string => Boolean(id)));

export const clearLatchSlots = (slots: LatchSlots): void =>
{
    for (const kind of LATCH_KINDS)
    {
        delete slots[kind];
    }
};
