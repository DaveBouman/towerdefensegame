import { getCardDefinition } from '../cardGame/config/cardRegistry';
import { cardLabel } from '../copy/strings';
import { getBodyModDefinition, rollBodyModReward } from './bodyMods';
import { RUN_ECONOMY } from './config/runEconomy';
import { toDefinitionIds, type RunDeckCard } from './runDeck';
import { rollCardReward } from './rewards';
import {
    ICON_MATCH_PAIR_COUNT,
    WHEEL_SPIN_COST,
} from './runEventDefinitions';
import type {
    AppliedEventMessage,
    AppliedEventResult,
    RunEventEffect,
    WheelSegment,
} from './runEventTypes';

const fallback = RUN_ECONOMY.events.fallback;
const iconMatch = RUN_ECONOMY.events.iconMatch;

const resolveRandomCard = (deckDefinitionIds: readonly string[]): string =>
    rollCardReward(1, 'standard', { deckDefinitionIds, floor: 2 })[0] ?? 'attack';

const resolveRandomBodyMod = (ownedBodyMods: readonly string[]): string | null =>
    rollBodyModReward(ownedBodyMods);

const expandEffect = (
    effect: RunEventEffect,
    ownedBodyMods: readonly string[],
    deckDefinitionIds: readonly string[],
): RunEventEffect[] =>
{
    if (effect.kind === 'add-random-card')
    {
        return [ { kind: 'add-card', cardId: resolveRandomCard(deckDefinitionIds) } ];
    }

    if (effect.kind === 'add-random-body-mod')
    {
        const bodyModId = resolveRandomBodyMod(ownedBodyMods);

        return bodyModId
            ? [ { kind: 'body-mod', bodyModId } ]
            : [ { kind: 'gold', amount: fallback.randomBodyModGold } ];
    }

    return [ effect ];
};

const cardDisplayName = (cardId: string): string =>
    getCardDefinition(cardId)?.label ?? cardLabel(cardId);

/** Concrete card ids previewed on a choice (skips random rolls). */
export const getChoiceCardPreviews = (
    effects: readonly RunEventEffect[],
): { cardId: string; count: number }[] =>
{
    const previews: { cardId: string; count: number }[] = [];

    for (const effect of effects)
    {
        if (effect.kind === 'add-card')
        {
            previews.push({ cardId: effect.cardId, count: 1 });
        }

        if (effect.kind === 'add-curse')
        {
            previews.push({ cardId: effect.cardId, count: effect.count });
        }
    }

    return previews;
};

const describeEffect = (effect: RunEventEffect): AppliedEventMessage =>
{
    switch (effect.kind)
    {
        case 'heal':
            return { text: `Restored ${effect.amount} HP.`, tone: 'good' };
        case 'damage':
            return { text: `Took ${effect.amount} damage.`, tone: 'bad' };
        case 'gold':
            return {
                text: effect.amount >= 0
                    ? `Gained ${effect.amount} creds.`
                    : `Lost ${Math.abs(effect.amount)} creds.`,
                tone: effect.amount > 0 ? 'good' : 'bad',
            };
        case 'lose-gold':
            return { text: '', tone: 'bad' };
        case 'add-card':
            return {
                text: `Added ${cardDisplayName(effect.cardId)} to your deck.`,
                tone: 'good',
                cardId: effect.cardId,
                cardCount: 1,
            };
        case 'add-curse':
            return {
                text: effect.count > 1
                    ? `Added ${effect.count}× ${cardDisplayName(effect.cardId)} to your deck.`
                    : `Added ${cardDisplayName(effect.cardId)} to your deck.`,
                tone: 'bad',
                cardId: effect.cardId,
                cardCount: effect.count,
            };
        case 'body-mod':
            return {
                text: `Installed ${getBodyModDefinition(effect.bodyModId)?.label ?? effect.bodyModId}.`,
                tone: 'good',
            };
        default:
            return { text: '', tone: 'neutral' };
    }
};

/** Applies event effects to run state and returns the updated snapshot. */
export const applyRunEventEffects = (
    effects: readonly RunEventEffect[],
    {
        playerHealth,
        maxHealth,
        gold,
        deck,
        bodyMods,
    }: {
        playerHealth: number;
        maxHealth: number;
        gold: number;
        deck: readonly RunDeckCard[];
        bodyMods: string[];
    },
): AppliedEventResult =>
{
    let health = playerHealth;
    let nextGold = gold;
    const nextDeck: RunDeckCard[] = deck.map((card) => ({ ...card }));
    const nextBodyMods = [ ...bodyMods ];
    const messages: AppliedEventMessage[] = [];

    for (const rawEffect of effects)
    {
        for (const effect of expandEffect(rawEffect, nextBodyMods, toDefinitionIds(nextDeck)))
        {
            switch (effect.kind)
            {
                case 'heal':
                    health = Math.min(maxHealth, health + effect.amount);
                    messages.push(describeEffect(effect));
                    break;
                case 'damage':
                    health = Math.max(0, health - effect.amount);
                    messages.push(describeEffect(effect));
                    break;
                case 'gold':
                    nextGold = Math.max(0, nextGold + effect.amount);
                    messages.push(describeEffect(effect));
                    break;
                case 'lose-gold':
                {
                    const paid = Math.min(nextGold, effect.amount);
                    nextGold -= paid;

                    if (paid > 0)
                    {
                        messages.push({
                            text: paid < effect.amount
                                ? `Paid ${paid} creds (all you had).`
                                : `Paid ${paid} creds.`,
                            tone: 'bad',
                        });
                    }
                    else
                    {
                        messages.push({ text: 'Could not afford the cred cost.', tone: 'neutral' });
                    }

                    break;
                }
                case 'add-card':
                    nextDeck.push({ definitionId: effect.cardId });
                    messages.push(describeEffect(effect));
                    break;
                case 'add-curse':
                    for (let i = 0; i < effect.count; i++)
                    {
                        nextDeck.push({ definitionId: effect.cardId });
                    }
                    messages.push(describeEffect(effect));
                    break;
                case 'body-mod':
                    if (!nextBodyMods.includes(effect.bodyModId))
                    {
                        nextBodyMods.push(effect.bodyModId);
                        messages.push(describeEffect(effect));
                    }
                    else
                    {
                        nextGold += fallback.duplicateBodyMod.gold;
                        messages.push({
                            text: `Already running that mod — took ${fallback.duplicateBodyMod.gold} creds instead.`,
                            tone: 'neutral',
                        });
                        messages.push({
                            text: `Took ${fallback.duplicateBodyMod.damage} damage from the chrome backlash.`,
                            tone: 'bad',
                        });
                        health = Math.max(0, health - fallback.duplicateBodyMod.damage);
                    }
                    break;
                default:
                    break;
            }
        }
    }

    return {
        playerHealth: health,
        gold: nextGold,
        deck: nextDeck,
        bodyMods: nextBodyMods,
        messages: messages.filter((message) => message.text.length > 0),
    };
};

export const resolveIconMatchResult = (
    pairsMatched: number,
    state: {
        playerHealth: number;
        maxHealth: number;
        gold: number;
        deck: readonly RunDeckCard[];
        bodyMods: string[];
    },
): AppliedEventResult =>
{
    const summary: AppliedEventMessage = {
        text: `Matched ${pairsMatched} of ${ICON_MATCH_PAIR_COUNT} pairs.`,
        tone: pairsMatched >= 3 ? 'good' : pairsMatched > 0 ? 'neutral' : 'bad',
    };

    if (pairsMatched === 0)
    {
        const result = applyRunEventEffects(
            [ { kind: 'damage', amount: iconMatch.zeroPairsDamage } ],
            state,
        );

        return {
            ...result,
            messages: [ summary, ...result.messages ],
        };
    }

    const effects: RunEventEffect[] = [
        { kind: 'gold', amount: pairsMatched * iconMatch.goldPerPair },
        { kind: 'lose-gold', amount: pairsMatched * iconMatch.taxPerPair },
    ];

    if (pairsMatched >= 3)
    {
        effects.push(
            { kind: 'add-random-card' },
            { kind: 'lose-gold', amount: iconMatch.midTier.goldCost },
            { kind: 'damage', amount: iconMatch.midTier.damage },
        );
    }

    if (pairsMatched >= 6)
    {
        effects.push({ kind: 'gold', amount: iconMatch.highTier.goldBonus });
    }

    const result = applyRunEventEffects(effects, state);

    return {
        ...result,
        messages: [ summary, ...result.messages ],
    };
};

export const getWheelSpinEffects = (segment: WheelSegment): RunEventEffect[] => [
    { kind: 'lose-gold', amount: WHEEL_SPIN_COST },
    ...segment.effects,
];
