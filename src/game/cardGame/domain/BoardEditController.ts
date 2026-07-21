import {
    getCardDefinitionOrThrow,
    getCardDiscardFromHandCount,
    isCardExhaustOnPlay,
    isCardUnplayable,
    type CardDefinition,
} from '../config/cardRegistry';
import { isEnemyOwnedCard, isFieldOwnedCard } from './cardOwnership';
import type { BoardModel } from './BoardModel';
import type { DeckHand } from './DeckHand';
import type { CardInstance, SlotPosition } from './types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';

export interface BoardEditHost
{
    readonly board: BoardModel;
    readonly deckHand: DeckHand;
    isBusy (): boolean;
    isPuzzleFinished (): boolean;
    isSlotBlockedForPlayer (slot: SlotPosition): boolean;
    onCardExhausted (definitionId: string): void;
}

/** Player board edits: place / remove / move / swap while combat is idle. */
export class BoardEditController
{
    constructor (private readonly host: BoardEditHost) {}

    canEditBoard (): boolean
    {
        if (this.host.isPuzzleFinished())
        {
            return false;
        }

        return !this.host.isBusy();
    }

    placeCardFromHand (handIndex: number, slot: SlotPosition): boolean
    {
        if (this.host.isBusy())
        {
            return false;
        }

        const card = this.host.deckHand.getHandCard(handIndex);

        if (!card)
        {
            return false;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);

        if (isCardUnplayable(definition) || card.exhausted)
        {
            return false;
        }

        const existing = this.host.board.getCardAt(slot);

        if (existing && (isEnemyOwnedCard(existing) || isFieldOwnedCard(existing)))
        {
            return false;
        }

        if (!existing)
        {
            if (this.host.isSlotBlockedForPlayer(slot))
            {
                return false;
            }

            if (!this.host.board.placeCard(slot, card))
            {
                return false;
            }

            this.host.deckHand.removeHandCardAt(handIndex);
            this.markExhaustedIfNeeded(card, definition);
            CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card });
            this.host.deckHand.discardFromHandOnPlay(getCardDiscardFromHandCount(definition));

            return true;
        }

        this.host.board.removeCard(slot);
        this.host.board.placeCard(slot, card);
        this.host.deckHand.setHandCardAt(handIndex, existing);
        this.markExhaustedIfNeeded(card, definition);
        CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card });
        this.host.deckHand.discardFromHandOnPlay(getCardDiscardFromHandCount(definition));

        return true;
    }

    removeCardFromBoard (slot: SlotPosition): boolean
    {
        if (this.host.isBusy())
        {
            return false;
        }

        const card = this.host.board.removeCard(slot);

        if (!card || isEnemyOwnedCard(card) || isFieldOwnedCard(card))
        {
            if (card)
            {
                this.host.board.placeCard(slot, card);
            }

            return false;
        }

        this.host.deckHand.returnCardToHand(card);

        return true;
    }

    moveCardOnBoard (from: SlotPosition, to: SlotPosition): boolean
    {
        if (this.host.isBusy())
        {
            return false;
        }

        const card = this.host.board.getCardAt(from);

        if (!card || isEnemyOwnedCard(card) || isFieldOwnedCard(card))
        {
            return false;
        }

        const target = this.host.board.getCardAt(to);

        if (target && (isEnemyOwnedCard(target) || isFieldOwnedCard(target)))
        {
            return false;
        }

        if (!target && this.host.isSlotBlockedForPlayer(to))
        {
            return false;
        }

        return this.host.board.moveCard(from, to);
    }

    swapCardsOnBoard (a: SlotPosition, b: SlotPosition): boolean
    {
        if (this.host.isBusy())
        {
            return false;
        }

        const cardA = this.host.board.getCardAt(a);
        const cardB = this.host.board.getCardAt(b);

        if (!cardA || isEnemyOwnedCard(cardA) || isFieldOwnedCard(cardA)
            || (cardB && (isEnemyOwnedCard(cardB) || isFieldOwnedCard(cardB))))
        {
            return false;
        }

        return this.host.board.swapCards(a, b);
    }

    private markExhaustedIfNeeded (card: CardInstance, definition: CardDefinition): void
    {
        if (!isCardExhaustOnPlay(definition))
        {
            return;
        }

        card.exhausted = true;
        this.host.onCardExhausted(definition.id);
    }
}
