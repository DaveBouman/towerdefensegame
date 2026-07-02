import { GAME_RULES, getChainStepDistance } from '../../config/cardRegistry';
import { ARROW_GLYPH } from '../../../cards/cardArrows';
import { isEnemyOwnedCard } from '../../domain/cardOwnership';
import type { CardTooltipContent, CardTooltipContext, CardTooltipProvider } from './types';

const titleFromDefinition = ({ definition }: CardTooltipContext): string =>
    definition.label;

const attackLines = ({ definition }: CardTooltipContext): string[] =>
{
    const lines = [ `Deals ${definition.power} damage when activated in the chain.` ];

    if (definition.maxChainActivations && definition.maxChainActivations > 1)
    {
        lines.push(`Can activate up to ${definition.maxChainActivations} times per attack.`);
    }

    const stepDistance = getChainStepDistance(definition);

    if (stepDistance > 1)
    {
        lines.push(`Chain advances ${stepDistance} tiles along the arrow.`);
    }

    if (definition.arrowPool === 'diagonal')
    {
        lines.push('Uses diagonal arrows.');
    }

    return lines;
};

const defendLines = ({ definition }: CardTooltipContext): string[] =>
{
    const lines = [ `Grants ${definition.power} armor when activated in the chain.` ];

    const stepDistance = getChainStepDistance(definition);

    if (stepDistance > 1)
    {
        lines.push(`Chain advances ${stepDistance} tiles along the arrow.`);
    }

    if (definition.arrowPool === 'diagonal')
    {
        lines.push('Uses diagonal arrows.');
    }

    return lines;
};

const provider = (id: string, getTooltip: (ctx: CardTooltipContext) => CardTooltipContent): CardTooltipProvider =>
    ({ id, getTooltip });

export const defaultCardTooltipProviders: readonly CardTooltipProvider[] = [
    provider('attack', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: attackLines(ctx),
    })),
    provider('defend', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: defendLines(ctx),
    })),
    provider('attack-special', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: attackLines(ctx),
    })),
    provider('attack-leap', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: attackLines(ctx),
    })),
    provider('defend-special', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: defendLines(ctx),
    })),
    provider('defend-leap', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: defendLines(ctx),
    })),
    provider('joker', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            'Pauses the chain until you pick a direction.',
            `Chain jumps ${getChainStepDistance(ctx.definition)} tiles in that direction.`,
        ],
    })),
    provider('loop-reset', (ctx) =>
    {
        const loopArrow = ctx.card.loopArrow ?? ctx.card.arrow;
        const continueArrow = ctx.card.arrow;
        const loopGlyph = ARROW_GLYPH[loopArrow];
        const continueGlyph = ARROW_GLYPH[continueArrow];

        return {
            title: 'Loop',
            lines: [
                'Two exits — the chain uses each once per attack.',
                `First visit: follow ↺${loopGlyph} (loop arrow). Jump that way and re-activate every card you already passed before this Loop.`,
                `Second visit: follow ${continueGlyph} (continue arrow). Chain moves forward normally.`,
                'Cards placed after the Loop on the board are not reopened.',
            ],
        };
    }),
    provider('poison', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Defend cards after this lose armor and deal ${ctx.definition.power} poison damage each.`,
            'Stops on defends that follow an attack; works alongside Fire and other specials.',
            'Fire and Poison between this card and a defend do not cancel the trail.',
        ],
    })),
    provider('fire', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Deals ${ctx.definition.power} damage when activated in the chain.`,
            `+${GAME_RULES.chainAbilities.fireAlternation.bonusDamagePerAlternatingStep} bonus damage per alternating attack/defend step after this (needs 2+).`,
            'Runs in parallel with Poison — both trails stay active until their own rule ends.',
        ],
    })),
    provider('hazard', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: isEnemyOwnedCard(ctx.card)
            ? [
                `Enemy trap — deals ${ctx.definition.power} damage to you if not activated in your chain.`,
                'Disarm it by including it in your attack chain.',
                'If it explodes, that tile is scorched and you cannot place cards there next turn.',
            ]
            : [
                `Deals ${ctx.definition.power} damage when activated in the chain.`,
            ],
    })),
    provider('boost', () => ({
        title: 'Boost',
        lines: [
            `Doubles the next card's effect (×${GAME_RULES.fieldBoost.nextStepMultiplier}) — attack, defend, fire, poison, and other specials.`,
            'Jokers pass the boost through to the following card.',
            'Field card — spawns on a random empty tile anywhere on the board after the enemy turn.',
        ],
    })),
    provider('default', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [ 'Follow the arrow to continue the chain.' ],
    })),
];
