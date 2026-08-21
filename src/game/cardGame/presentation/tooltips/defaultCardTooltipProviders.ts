import { cardLabel, poisonStatusName, poisonStatusNameLower } from '../../../copy/strings';
import { GAME_RULES, getChainStepDistance } from '../../config/cardRegistry';
import { describeBattleModifier, describeBattleModifierDuration } from '../../combat/battleModifiers';
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

const radTrailLines = (ctx: CardTooltipContext, extras: string[] = []): string[] =>
    [
        `Defend cards after this lose armor and add ${ctx.definition.power} ${poisonStatusNameLower()} stack(s) each to the enemy.`,
        `${poisonStatusName()} fumes deal ${GAME_RULES.chainAbilities.poisonTrail.damagePerStack} damage per stack at the start of each enemy turn, then weaken by 1.`,
        ...extras,
    ];

const provider = (id: string, getTooltip: (ctx: CardTooltipContext) => CardTooltipContent): CardTooltipProvider =>
    ({ id, getTooltip });

const battleModTooltipLines = ({ definition }: CardTooltipContext): string[] =>
{
    const lines = [
        definition.battleModifier
            ? `Applies ${describeBattleModifier(
                definition.battleModifier.stat,
                definition.battleModifier.delta,
            )} when activated in the chain.`
            : 'Applies a battle modifier when activated in the chain.',
        describeBattleModifierDuration(),
        'Stacks with enemy intents and other modifier cards.',
    ];

    if (definition.battleModifier?.stat === 'player-damage-taken'
        || definition.battleModifier?.stat === 'enemy-attack')
    {
        lines.push('Fractional damage rounds down in your favor.');
    }

    if (definition.battleModifier?.stat === 'player-armor'
        || definition.battleModifier?.stat === 'player-damage-dealt')
    {
        lines.push('Fractional bonuses round up in your favor.');
    }

    return lines;
};

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
            `Deals ${ctx.definition.power} damage when activated in the chain.`,
            'Diagonal bend: enters the card to the left or right first (horizontal leg of the arrow).',
            'That neighbor\'s arrow continues the chain — point it down/up to finish the corner.',
        ],
    })),
    provider('corner-defense', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Grants ${ctx.definition.power} armor when activated in the chain.`,
            'Diagonal bend: enters the card to the left or right first (horizontal leg of the arrow).',
            'That neighbor\'s arrow continues the chain — point it down/up to finish the corner.',
        ],
    })),
    provider('skewer', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Deals ${ctx.definition.power} damage when activated in the chain.`,
            'Leaps 2 tiles. Activates the card you jump over (effects only — its arrow is ignored).',
            'Then continues to the landing tile along this card\'s arrow.',
        ],
    })),
    provider('phase-relay', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Deals ${ctx.definition.power} damage when activated in the chain.`,
            'Phase wrap: when this card\'s arrow would exit the board, the chain continues from the opposite edge (top↔bottom, left↔right).',
            'Only this card wraps — normal cards still stop at the grid edge.',
        ],
    })),
    provider('phase-bulwark', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Grants ${ctx.definition.power} armor when activated in the chain.`,
            'Phase wrap: when this card\'s arrow would exit the board, the chain continues from the opposite edge (top↔bottom, left↔right).',
            'Only this card wraps — normal cards still stop at the grid edge.',
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
            'Pauses the chain until you pick a direction.',
            `Chain jumps ${getChainStepDistance(ctx.definition)} tiles in that direction.`,
        ],
    })),
    provider('echo', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            'Re-activates the previous chain card when this step resolves.',
            'Repeats its damage, armor, battle modifiers, and thorns — Echo on Patch stacks to -20% damage taken.',
            'Does nothing when it is the first card in the chain.',
        ],
    })),
    provider('loop-reset', (ctx) =>
    {
        const loopArrow = ctx.card.loopArrow ?? ctx.card.arrow;
        const continueArrow = ctx.card.arrow;
        const loopGlyph = ARROW_GLYPH[loopArrow];
        const continueGlyph = ARROW_GLYPH[continueArrow];

        return {
            title: cardLabel('loop-reset'),
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
        lines: radTrailLines(ctx, [
            `Stops on defends that follow an attack; Fire and ${poisonStatusName()} between do not cancel the trail.`,
        ]),
    })),
    provider('rupture', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            ...attackLines(ctx),
            `Bleed: +${GAME_RULES.chainAbilities.bleed.bonusPerExtraAttack} damage for each attack in the chain beyond ${GAME_RULES.chainAbilities.bleed.attackThreshold}.`,
        ],
    })),
    provider('bulwark', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            ...defendLines(ctx),
            `Fortify: +${GAME_RULES.chainAbilities.fortify.armorPerExtraDefend} armor for each defend in the chain beyond ${GAME_RULES.chainAbilities.fortify.defendThreshold}.`,
        ],
    })),
    provider('surge', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Deals ${ctx.definition.power} damage when activated in the chain.`,
            `Overload: when this activates, +${GAME_RULES.chainAbilities.overload.damagePerAbilityCard} damage per other skill card already in the chain (doubled if a Reroute already activated).`,
            'Uses diagonal arrows. Place it after your setup skills so the payoff is clear.',
        ],
    })),
    provider('fire', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Deals ${ctx.definition.power} damage when activated in the chain.`,
            `+${GAME_RULES.chainAbilities.fireAlternation.bonusDamagePerAlternatingStep} bonus damage per alternating attack/defend step after this (needs 2+).`,
            `Runs in parallel with ${poisonStatusName()} — both trails stay active until their own rule ends.`,
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
    provider('siphon', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: isEnemyOwnedCard(ctx.card)
            ? [
                `Enemy leech node — heals the enemy for ${ctx.definition.power} if not activated in your chain.`,
                'Disarm it by including it in your attack chain.',
                'Does not explode or scorch the tile.',
            ]
            : [
                `Heals the enemy for ${ctx.definition.power} if left off-chain.`,
            ],
    })),
    provider('boost', () => ({
        title: cardLabel('boost'),
        lines: [
            `Multiplies the next card's effect by ×${GAME_RULES.fieldBoost.nextStepMultiplier} (attack, defend, fire, ${poisonStatusNameLower()}, skills, battle mods, thorns).`,
            'Boosts stack multiplicatively: Boost → Boost → Attack = ×4.',
            'Reroutes pass the boost stack through to the following card.',
            'Field card — spawns on a random empty tile after the enemy turn.',
        ],
    })),
    provider('burden', (ctx) =>
    {
        const handPenalty = ctx.definition.handEndPenalty ?? 0;
        const offChainTax = handPenalty * 2;

        return {
            title: titleFromDefinition(ctx),
            lines: [
                'Curse clog: place it to clear your hand — inert on the chain, wastes a tile.',
                `Route through it to dump safely. Leave it off-chain when you Attack: take ${offChainTax} damage (2× hand penalty).`,
                'Cannot be selected for a hand reroll.',
                `Still in hand when an attack ends: take ${handPenalty} damage, then it is removed.`,
            ],
        };
    }),
    provider('fuse', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Weak attack — deals ${ctx.definition.power} damage if placed and chained.`,
            `Still in hand at end of turn: you take ${ctx.definition.handEndPenalty ?? 0} damage, then it is removed.`,
            'Place it on the board before ending your turn to defuse it.',
        ],
    })),
    provider('courier', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            'When played, discards up to 2 cards from the left of your hand into the graveyard.',
            'Includes curse cards (Burden).',
            'If your hand has fewer than 2 cards, discards as many as remain.',
            'Neutral on the chain — no direct attack or defend effect.',
        ],
    })),
    provider('salvage', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Deals ${ctx.definition.power} damage when activated in the chain.`,
            `Heal ${ctx.definition.healOnKill ?? 0} HP if this card's damage kills an enemy.`,
        ],
    })),
    provider('redline', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Deals ${ctx.definition.power} damage and grants ${ctx.definition.power} armor when activated in the chain.`,
        ],
    })),
    provider('shiv', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            ...attackLines(ctx),
            `Bleed: +${GAME_RULES.chainAbilities.bleed.bonusPerExtraAttack} damage for each attack in the chain beyond ${GAME_RULES.chainAbilities.bleed.attackThreshold}.`,
        ],
    })),
    provider('miasma', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: radTrailLines(ctx, [ 'Uses diagonal arrows.' ]),
    })),
    provider('cinder', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Deals ${ctx.definition.power} damage when activated in the chain.`,
            `+${GAME_RULES.chainAbilities.fireAlternation.bonusDamagePerAlternatingStep} bonus damage per alternating attack/defend step after this (needs 2+).`,
            'Uses diagonal arrows.',
        ],
    })),
    provider('lacerate', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            ...attackLines(ctx),
            `Bleed: +${GAME_RULES.chainAbilities.bleed.bonusPerExtraAttack} damage for each attack in the chain beyond ${GAME_RULES.chainAbilities.bleed.attackThreshold}.`,
        ],
    })),
    provider('scorch', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Deals ${ctx.definition.power} damage when activated in the chain.`,
            'Diagonal bend: enters the left/right neighbor first; that card\'s arrow finishes the corner.',
            `+${GAME_RULES.chainAbilities.fireAlternation.bonusDamagePerAlternatingStep} bonus damage per alternating attack/defend step after this (needs 2+).`,
        ],
    })),
    provider('bramble', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Grants ${ctx.definition.power} armor when activated in the chain.`,
            'Diagonal bend: enters the left/right neighbor first; that card\'s arrow finishes the corner.',
            `Fortify: +${GAME_RULES.chainAbilities.fortify.armorPerExtraDefend} armor for each defend in the chain beyond ${GAME_RULES.chainAbilities.fortify.defendThreshold}.`,
        ],
    })),
    provider('thorns', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [
            `Adds ${ctx.definition.power} thorn${ctx.definition.power === 1 ? '' : 's'} when activated in the chain.`,
            'Each time an enemy attack hits you this energy round, reflect that many damage at the attacker.',
            'Lasts until energy refills. Field Boost multiplies the thorns granted (Boost → Thorns = ×2).',
            'Does not consume on reflect — every enemy attack in the round takes the full pool.',
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
            `Deals ${ctx.definition.power} damage when activated in the chain.`,
            `This card's damage is doubled (2×) after streaks and boosts.`,
            'After it hits, your lock target jumps to the next living enemy.',
            'No effect on target selection when only one enemy remains.',
        ],
    })),
    provider('default', (ctx) => ({
        title: titleFromDefinition(ctx),
        lines: [ 'Follow the arrow to continue the chain.' ],
    })),
];
