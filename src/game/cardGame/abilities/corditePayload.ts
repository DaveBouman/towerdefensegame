import type { ActivationStep } from '../domain/types';

/**
 * Contiguous Charge (cordite) steps immediately before `payloadIndex`:
 * Charge × N → Blast.
 */
export const countCorditeBeforePayload = (
    chain: readonly ActivationStep[],
    payloadIndex: number,
): number =>
{
    let count = 0;
    let i = payloadIndex - 1;

    while (i >= 0 && chain[i]!.behaviorId === 'cordite')
    {
        count += 1;
        i -= 1;
    }

    return count;
};

export const computeCorditePayloadBonus = (
    corditeCount: number,
    damagePerCordite: number,
): number =>
    corditeCount > 0 ? corditeCount * damagePerCordite : 0;
