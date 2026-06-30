import { getCardDefinitionOrThrow } from '../../config/cardRegistry';
import type { CardInstance } from '../../domain/types';
import { defaultCardTooltipProviders } from './defaultCardTooltipProviders';
import type { CardTooltipContent, CardTooltipContext, CardTooltipOverride, CardTooltipProvider } from './types';

const providers = new Map<string, CardTooltipProvider>(
    defaultCardTooltipProviders.map((provider) => [ provider.id, provider ]),
);

export const registerCardTooltipProvider = (provider: CardTooltipProvider): void =>
{
    providers.set(provider.id, provider);
};

export const getCardTooltipProvider = (id: string): CardTooltipProvider | undefined =>
    providers.get(id);

const mergeOverride = (
    content: CardTooltipContent,
    override?: CardTooltipOverride,
): CardTooltipContent =>
{
    if (!override)
    {
        return content;
    }

    return {
        title: override.title ?? content.title,
        lines: override.lines ?? content.lines,
    };
};

const resolveProviderId = (definitionId: string, behaviorId: string, tooltipProviderId?: string): string =>
{
    if (tooltipProviderId && providers.has(tooltipProviderId))
    {
        return tooltipProviderId;
    }

    if (providers.has(definitionId))
    {
        return definitionId;
    }

    if (providers.has(behaviorId))
    {
        return behaviorId;
    }

    return 'default';
};

/** Resolves tooltip copy for a card instance using registered providers. */
export const resolveCardTooltip = (card: CardInstance): CardTooltipContent =>
{
    const definition = getCardDefinitionOrThrow(card.definitionId);
    const ctx: CardTooltipContext = { card, definition };
    const providerId = resolveProviderId(
        definition.id,
        definition.behaviorId,
        definition.tooltipProviderId,
    );
    const provider = getCardTooltipProvider(providerId) ?? getCardTooltipProvider('default')!;
    const content = provider.getTooltip(ctx);

    return mergeOverride(content, definition.tooltip);
};
