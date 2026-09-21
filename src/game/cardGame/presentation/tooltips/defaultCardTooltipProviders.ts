import { cardLabel, poisonStatusName, poisonStatusNameLower } from '../../../copy/strings';
import { GAME_RULES, getChainStepDistance } from '../../config/cardRegistry';
import { describeBattleModifier } from '../../combat/battleModifiers';
import { ARROW_GLYPH } from '../../../cards/cardArrows';
import { isEnemyOwnedCard } from '../../domain/cardOwnership';
import type { CardTooltipContent, CardTooltipContext, CardTooltipProvider } from './types';

const titleFromDefinition = ({ definition }: CardTooltipContext): string =>
    definition.label;

const attackLines = (ctx: CardTooltipContext): string[] =>
{
    const { definition, card } = ctx;
    const lines = [ `${definition.power} damage.` ];

    if (definition.maxChainActivations && definition.maxChainActivations > 1)
    {
        lines.push(`Up to ${definition.maxChainActivations}× per attack.`);
    }

    const stepDistance = getChainStepDistance(definition);

    if (stepDistance > 1)
    {
        lines.push(`Jumps ${stepDistance} tiles.`);
    }

    if (definition.arrowPool === 'diagonal')
    {
        lines.push('Diagonal arrows.');
    }

    if (card.settled && !card.relocated)
    {
        lines.push(`Anchored: +${GAME_RULES.anchoredBonus.attackDamage} while unmoved.`);
    }

    return lines;
};

const defendLines = (ctx: CardTooltipContext): string[] =>
{
    const { definition, card } = ctx;
    const lines = [ `${definition.power} armor.` ];

    const stepDistance = getChainStepDistance(definition);

    if (stepDistance > 1)
    {
        lines.push(`Jumps ${stepDistance} tiles.`);
    }

    if (definition.arrowPool === 'diagonal')
    {
        lines.push('Diagonal arrows.');
    }

    if (card.settled && !card.relocated)
    {
        lines.push(`Anchored: +${GAME_RULES.anchoredBonus.defendArmor} while unmoved.`);
    }

    return lines;
};

const bleedLine = (): string =>
    `Bleed: +${GAME_RULES.chainAbilities.bleed.bonusPerExtraAttack} per attack after ${GAME_RULES.chainAbilities.bleed.attackThreshold}.`;

const fortifyLine = (): string =>
    `Fortify: +${GAME_RULES.chainAbilities.fortify.armorPerExtraDefend} armor per defend after ${GAME_RULES.chainAbilities.fortify.defendThreshold}.`;

const fireBonusLine = (): string =>
    `+${GAME_RULES.chainAbilities.fireAlternation.bonusDamagePerAlternatingStep} per Attack/Defend swap after this.`;

const radLines = (ctx: CardTooltipContext, extras: string[] = []): string[] =>
    [
        `Defends after this add ${ctx.definition.power} ${poisonStatusNameLower()} each.`,
        `${poisonStatusName()}: ${GAME_RULES.chainAbilities.poisonTrail.damagePerStack} dmg/stack each enemy turn, then −1.`,
        ...extras,
    ];

const provider = (id: string, getTooltip: (ctx: CardTooltipContext) => CardTooltipContent): CardTooltipProvider =>
    ({ id, getTooltip });

const battleModTooltipLines = ({ definition }: CardTooltipContext): string[] =>
    [
        definition.battleModifier
            ? `${describeBattleModifier(definition.battleModifier.stat, definition.battleModifier.delta)}.`
            : 'Applies a battle modifier.',
        'Until energy refills.',
    ];

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
    provider('corner-strike', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage.`,
            'Bends sideways first, then that card\'s arrow.',
        ],
    })),
    provider('corner-defense', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} armor.`,
            'Bends sideways first, then that card\'s arrow.',
        ],
    })),
    provider('skewer', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage.`,
            'Jumps 2 tiles; triggers the card jumped over.',
        ],
    })),
    provider('phase-relay', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage.`,
            'Wraps to the opposite edge.',
        ],
    })),
    provider('phase-bulwark', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} armor.`,
            'Wraps to the opposite edge.',
        ],
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
            `Pick a direction; jumps ${getChainStepDistance(ctx.definition)} tiles.`,
        ],
    })),
    provider('echo', () => ({
        title: cardLabel('echo'),
        lines: [ 'Repeats the previous card.' ],
    })),
    provider('loop-reset', (ctx) =>
    {
        const loopArrow = ctx.card.loopArrow ?? ctx.card.arrow;
        const continueArrow = ctx.card.arrow;

        return {
            title: cardLabel('loop-reset'),
            lines: [
                `1st: ↺${ARROW_GLYPH[loopArrow]} (replay). 2nd: ${ARROW_GLYPH[continueArrow]} (continue).`,
            ],
        };
    }),
    provider('poison', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: radLines(ctx),
    })),
    provider('rupture', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [ ...attackLines(ctx), bleedLine() ],
    })),
    provider('bulwark', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [ ...defendLines(ctx), fortifyLine() ],
    })),
    provider('surge', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage.`,
            `+${GAME_RULES.chainAbilities.overload.damagePerAbilityCard} per other skill already in the chain.`,
            'Diagonal arrows.',
        ],
    })),
    provider('fire', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage.`,
            fireBonusLine(),
        ],
    })),
    provider('cordite', () => ({
        title: cardLabel('cordite'),
        lines: [
            `+${GAME_RULES.chainAbilities.corditePayload.damagePerCordite} to Blast right after this.`,
        ],
    })),
    provider('warhead', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage +${GAME_RULES.chainAbilities.corditePayload.damagePerCordite} per Charge before it.`,
        ],
    })),
    provider('hazard', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: isEnemyOwnedCard(ctx.card)
            ? [
                `${ctx.definition.power} damage to you unless chained.`,
                'Chain through it to disarm.',
            ]
            : [ `${ctx.definition.power} damage.` ],
    })),
    provider('siphon', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: isEnemyOwnedCard(ctx.card)
            ? [
                `Heals enemy ${ctx.definition.power} unless chained.`,
                'Chain through it to disarm.',
            ]
            : [ `Heals enemy ${ctx.definition.power} if left off-chain.` ],
    })),
    provider('boost', () => ({
        title: cardLabel('boost'),
        lines: [
            `×${GAME_RULES.fieldBoost.nextStepMultiplier} the next card. Stacks.`,
        ],
    })),
    provider('burden', (ctx) =>
    {
        const handPenalty = ctx.definition.handEndPenalty ?? 0;

        return {
            title: titleFromDefinition(ctx),
            lines: [
                `Curse. Place or chain it — or take ${handPenalty} if left in hand.`,
            ],
        };
    }),
    provider('fuse', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage.`,
            `Place before turn ends or take ${ctx.definition.handEndPenalty ?? 0}.`,
        ],
    })),
    provider('courier', () => ({
        title: cardLabel('courier'),
        lines: [ 'Discards up to 2 leftmost hand cards.' ],
    })),
    provider('salvage', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage.`,
            `Heal ${ctx.definition.healOnKill ?? 0} on kill.`,
        ],
    })),
    provider('redline', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage and ${ctx.definition.power} armor.`,
        ],
    })),
    provider('shiv', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [ ...attackLines(ctx), bleedLine() ],
    })),
    provider('miasma', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: radLines(ctx, [ 'Diagonal arrows.' ]),
    })),
    provider('cinder', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage.`,
            fireBonusLine(),
            'Diagonal arrows.',
        ],
    })),
    provider('lacerate', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [ ...attackLines(ctx), bleedLine() ],
    })),
    provider('scorch', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage.`,
            'Bends sideways first, then that card\'s arrow.',
            fireBonusLine(),
        ],
    })),
    provider('bramble', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} armor.`,
            'Bends sideways first, then that card\'s arrow.',
            fortifyLine(),
        ],
    })),
    provider('thorns', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Reflect ${ctx.definition.power} when hit this round.`,
        ],
    })),
    provider('battle-mod', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: battleModTooltipLines(ctx),
    })),
    provider('glitch', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: battleModTooltipLines(ctx),
    })),
    provider('hardwire', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: battleModTooltipLines(ctx),
    })),
    provider('patch', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: battleModTooltipLines(ctx),
    })),
    provider('overclock', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: battleModTooltipLines(ctx),
    })),
    provider('switchback', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `${ctx.definition.power} damage (×2).`,
            'Then retargets the next enemy.',
        ],
    })),
    provider('default', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [ 'Follow the arrow.' ],
    })),
];
