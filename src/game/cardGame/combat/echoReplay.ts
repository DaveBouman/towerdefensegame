import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ActivationStep } from '../domain/types';
import { isEchoDefinition, resolveChainSteps } from './AttackPipeline';

export interface EchoReplayTarget {
    step: ActivationStep;
    resolved: ActivationStep;
}

/** Previous chain step to replay when an echo card activates at `echoIndex`. */
export const getEchoReplayTarget = (
    chain: readonly ActivationStep[],
    echoIndex: number,
): EchoReplayTarget | null =>
{
    if (echoIndex <= 0)
    {
        return null;
    }

    const echoStep = chain[echoIndex];

    if (!echoStep || !isEchoDefinition(getCardDefinitionOrThrow(echoStep.definitionId)))
    {
        return null;
    }

    const resolved = resolveChainSteps([ ...chain ]);

    return {
        step: chain[echoIndex - 1]!,
        resolved: resolved[echoIndex - 1]!,
    };
};
