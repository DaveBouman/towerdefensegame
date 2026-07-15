import { GAME_RULES } from '../config/cardRegistry';
import { buildDeckFromDefinitionIds, buildPlayerDeck, shuffleInPlace } from './buildPlayerDeck';
import { createCardInstance } from './createCardInstance';
import type { CardInstance } from './types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';

export class DeckHand
{
    private readonly hand: CardInstance[] = [];
    private readonly deck: CardInstance[] = [];
    private readonly discard: CardInstance[] = [];
    private rerollsRemaining: number;
    private readonly maxRerollsPerFight: number;

    constructor (
        deckDefinitionIds?: readonly string[],
        rerollsRemaining = GAME_RULES.fightRerollsPerFight,
    )
    {
        this.deck.push(
            ...(deckDefinitionIds && deckDefinitionIds.length > 0
                ? buildDeckFromDefinitionIds(deckDefinitionIds)
                : buildPlayerDeck()),
        );
        this.rerollsRemaining = rerollsRemaining;
        this.maxRerollsPerFight = rerollsRemaining;
    }

    getHand (): readonly CardInstance[]
    {
        return this.hand;
    }

    getHandCard (handIndex: number): CardInstance | undefined
    {
        return this.hand[handIndex];
    }

    getHandLength (): number
    {
        return this.hand.length;
    }

    getDeckSize (): number
    {
        return this.deck.length;
    }

    getDiscardSize (): number
    {
        return this.discard.length;
    }

    getPileCounts (): { deckSize: number; discardSize: number }
    {
        return {
            deckSize: this.deck.length,
            discardSize: this.discard.length,
        };
    }

    getDeckDefinitionIds (): string[]
    {
        return this.deck.map((card) => card.definitionId);
    }

    getDiscardDefinitionIds (): string[]
    {
        return this.discard.map((card) => card.definitionId);
    }

    getDeckTopCard (): CardInstance | undefined
    {
        return this.deck.length > 0 ? this.deck[this.deck.length - 1] : undefined;
    }

    getDiscardTopCard (): CardInstance | undefined
    {
        return this.discard.length > 0 ? this.discard[this.discard.length - 1] : undefined;
    }

    getRerollsRemaining (): number
    {
        return this.rerollsRemaining;
    }

    /** Replaces deck/hand/discard with a fixed puzzle hand and zeroes rerolls. */
    initPuzzleHand (cards: CardInstance[]): void
    {
        this.deck.length = 0;
        this.discard.length = 0;
        this.hand.length = 0;
        this.hand.push(...cards);
        this.rerollsRemaining = 0;
        this.emitHandChanged();
        this.emitPilesChanged();
    }

    /** Tops the hand back up to the full hand size without discarding held cards. */
    refillHand (): void
    {
        const missing = GAME_RULES.handSize - this.hand.length;

        if (missing <= 0)
        {
            return;
        }

        this.hand.push(...this.drawCards(missing));
        this.emitHandChanged();
        this.emitPilesChanged();
    }

    addCardToHand (definitionId: string, ignoreHandLimit = false): boolean
    {
        if (!ignoreHandLimit && this.hand.length >= GAME_RULES.handSize)
        {
            return false;
        }

        this.hand.push(createCardInstance(definitionId));
        this.emitHandChanged();

        return true;
    }

    /** Discards selected hand cards and draws replacements. Uses one fight reroll. */
    rerollHandCards (handIndices: number[]): boolean
    {
        if (this.rerollsRemaining <= 0 || handIndices.length === 0)
        {
            return false;
        }

        const uniqueIndices = [ ...new Set(handIndices) ].sort((a, b) => a - b);

        for (const index of uniqueIndices)
        {
            if (index < 0 || index >= this.hand.length)
            {
                return false;
            }
        }

        const toDiscard = uniqueIndices.map((index) => this.hand[index]!);

        this.discard.push(...toDiscard);

        const drawn = this.drawCards(toDiscard.length);

        if (drawn.length < toDiscard.length)
        {
            return false;
        }

        uniqueIndices.forEach((handIndex, i) =>
        {
            this.hand[handIndex] = drawn[i]!;
        });

        this.rerollsRemaining -= 1;
        this.emitHandChanged();
        this.emitPilesChanged();
        this.emitRerollsChanged();

        return true;
    }

    /** Discards the current hand and draws a fresh one for the next player turn. */
    renewHand (): void
    {
        if (this.hand.length > 0)
        {
            const leavingHand = this.hand.splice(0);
            const recyclable = leavingHand.filter((card) => !card.exhausted);

            if (recyclable.length > 0)
            {
                this.discard.push(...recyclable);
            }
        }

        this.hand.push(...this.drawCards(GAME_RULES.handSize));
        this.emitHandChanged();
        this.emitPilesChanged();
    }

    removeHandCardAt (handIndex: number): CardInstance | undefined
    {
        return this.hand.splice(handIndex, 1)[0];
    }

    /** Removes hand cards without sending them to the discard pile (battle exhaust). */
    exhaustHandCardsAt (handIndices: readonly number[]): CardInstance[]
    {
        if (handIndices.length === 0)
        {
            return [];
        }

        const uniqueIndices = [ ...new Set(handIndices) ].sort((a, b) => b - a);
        const removed: CardInstance[] = [];

        for (const index of uniqueIndices)
        {
            if (index < 0 || index >= this.hand.length)
            {
                continue;
            }

            const card = this.hand.splice(index, 1)[0]!;

            card.exhausted = true;
            removed.push(card);
        }

        if (removed.length > 0)
        {
            this.emitHandChanged();
        }

        return removed;
    }

    setHandCardAt (handIndex: number, card: CardInstance): void
    {
        this.hand[handIndex] = card;
        this.emitHandChanged();
    }

    returnCardToHand (card: CardInstance): void
    {
        this.hand.push(card);
        this.emitHandChanged();
    }

    discardToPile (cards: readonly CardInstance[]): void
    {
        if (cards.length === 0)
        {
            return;
        }

        this.discard.push(...cards);
        this.emitPilesChanged();
    }

    /** Discards up to `count` cards from the left of hand into the graveyard. */
    discardFromHandOnPlay (count: number): void
    {
        if (count <= 0)
        {
            return;
        }

        const discarded = this.hand.splice(0, Math.min(count, this.hand.length));

        if (discarded.length === 0)
        {
            return;
        }

        this.discard.push(...discarded);
        this.emitHandChanged();
        this.emitPilesChanged();
    }

    emitPilesChanged (): void
    {
        CardGameEventBus.emit(CARD_GAME_EVENTS.PILES_CHANGED, this.getPileCounts());
    }

    emitRerollsChanged (): void
    {
        CardGameEventBus.emit(CARD_GAME_EVENTS.REROLLS_CHANGED, {
            rerollsRemaining: this.rerollsRemaining,
            maxRerollsPerFight: this.maxRerollsPerFight,
        });
    }

    private emitHandChanged (): void
    {
        CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, { hand: [ ...this.hand ] });
    }

    private reshuffleDiscardIntoDeck (): void
    {
        if (this.discard.length === 0)
        {
            return;
        }

        const recyclable = this.discard.splice(0).filter((card) => !card.exhausted);

        if (recyclable.length === 0)
        {
            return;
        }

        this.deck.push(...recyclable);
        shuffleInPlace(this.deck);
    }

    private drawCards (count: number): CardInstance[]
    {
        const drawn: CardInstance[] = [];

        for (let i = 0; i < count; i++)
        {
            if (this.deck.length === 0)
            {
                this.reshuffleDiscardIntoDeck();
            }

            const card = this.deck.pop();

            if (!card)
            {
                break;
            }

            drawn.push(card);
        }

        return drawn;
    }
}
