import type { CardDefinition } from '../../config/cardRegistry';
import type { CardInstance } from '../../domain/types';

export interface CardTooltipContent {
    title: string;
    lines: string[];
}

export interface CardTooltipContext {
    card: CardInstance;
    definition: CardDefinition;
}

/** Resolves hover tooltip copy for a card — register new providers to extend. */
export interface CardTooltipProvider {
    id: string;
    getTooltip (ctx: CardTooltipContext): CardTooltipContent;
}

export interface CardTooltipOverride {
    title?: string;
    lines?: string[];
}
