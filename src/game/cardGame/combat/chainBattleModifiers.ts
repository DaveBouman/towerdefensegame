import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ActivationStep } from '../domain/types';
import { isEchoDefinition } from './AttackPipeline';
import { getEchoReplayTarget } from './echoReplay';

/** Battle-mod cards to apply from a resolved chain, including echo replays. */
export const collectBattleModifierApplications = (
    chain: readonly ActivationStep[],
): string[] =>
{
    const applications: string[] = [];

    for (let index = 0; index < chain.length; index++)
    {
        const step = chain[index]!;

        if (step.behaviorId === 'battle-mod')
        {
            applications.push(step.definitionId);
        }

        const definition = getCardDefinitionOrThrow(step.definitionId);

        if (!isEchoDefinition(definition))
        {
            continue;
        }

        const replay = getEchoReplayTarget(chain, index);

        if (replay?.resolved.behaviorId === 'battle-mod')
        {
            applications.push(replay.step.definitionId);
        }
    }

    return applications;
};
