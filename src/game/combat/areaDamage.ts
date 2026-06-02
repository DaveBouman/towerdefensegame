export const applyAreaDamage = <T>(
    targets: readonly T[],
    apply: (target: T) => void,
): void =>
{
    for (const target of targets)
    {
        apply(target);
    }
};

