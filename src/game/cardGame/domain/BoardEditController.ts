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
import { markCardRelocated, markCardSettled } from '../combat/anchoredBonus';

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
    private boardLocked = false;
    /** null = unlimited; 0 = no edits; >0 = remaining moves between Loop Attacks. */
    private editBudget: number | null = null;

    constructor (private readonly host: BoardEditHost) {}

    setBoardLocked (locked: boolean): void
    {
        this.boardLocked = locked;

        if (locked)
        {
            this.editBudget = 0;
        }
        else if (this.editBudget === 0)
        {
            // Unlock after a lock → unlimited until a budget is set (between-Attack pause).
            this.editBudget = null;
        }
    }

    isBoardLocked (): boolean
    {
        return this.boardLocked;
    }

    /** null = unlimited edits (prep / burst draft). */
    setEditBudget (budget: number | null): void
    {
        this.editBudget = budget === null ? null : Math.max(0, Math.round(budget));
    }

    getEditBudget (): number | null
    {
        return this.editBudget;
    }

    canEditBoard (): boolean
    {
        if (this.boardLocked || this.host.isPuzzleFinished())
        {
            return false;
        }

        if (this.editBudget === 0)
        {
            return false;
        }

        return !this.host.isBusy();
    }

    private consumeEditBudget (): void
    {
        if (this.editBudget === null || this.editBudget <= 0)
        {
            return;
        }

        this.editBudget -= 1;
        CardGameEventBus.emit(CARD_GAME_EVENTS.BOARD_EDIT_BUDGET, {
            remaining: this.editBudget,
        });
    }

    placeCardFromHand (handIndex: number, slot: SlotPosition): boolean
    {
        if (!this.canEditBoard())
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
            markCardSettled(card);
            this.markExhaustedIfNeeded(card, definition);
            CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card, replaced: false });
            this.host.deckHand.discardFromHandOnPlay(getCardDiscardFromHandCount(definition));
            this.consumeEditBudget();

            return true;
        }

        if (existing.exhausted)
        {
            this.host.board.removeCard(slot);
            this.host.deckHand.exhaustToPile([ existing ]);
            this.host.board.placeCard(slot, card);
            this.host.deckHand.removeHandCardAt(handIndex);
            markCardSettled(card);
            this.markExhaustedIfNeeded(card, definition);
            CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card, replaced: true });
            this.host.deckHand.discardFromHandOnPlay(getCardDiscardFromHandCount(definition));
            this.consumeEditBudget();

            return true;
        }

        this.host.board.removeCard(slot);
        this.host.board.placeCard(slot, card);
        this.host.deckHand.setHandCardAt(handIndex, existing);
        markCardRelocated(existing);
        markCardSettled(card);
        this.markExhaustedIfNeeded(card, definition);
        CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card, replaced: true });
        this.host.deckHand.discardFromHandOnPlay(getCardDiscardFromHandCount(definition));
        this.consumeEditBudget();

        return true;
    }

    removeCardFromBoard (slot: SlotPosition): boolean
    {
        if (!this.canEditBoard())
        {
            return false;
        }

        const card = this.host.board.getCardAt(slot);

        if (!card || card.exhausted || isEnemyOwnedCard(card) || isFieldOwnedCard(card))
        {
            return false;
        }

        markCardRelocated(card);
        this.host.board.removeCard(slot);
        this.host.deckHand.returnCardToHand(card);
        this.consumeEditBudget();

        return true;
    }

    moveCardOnBoard (from: SlotPosition, to: SlotPosition): boolean
    {
        if (!this.canEditBoard())
        {
            return false;
        }

        const card = this.host.board.getCardAt(from);

        if (!card || card.exhausted || isEnemyOwnedCard(card) || isFieldOwnedCard(card))
        {
            return false;
        }

        const target = this.host.board.getCardAt(to);

        if (target && (isEnemyOwnedCard(target) || isFieldOwnedCard(target) || target.exhausted))
        {
            return false;
        }

        if (!target && this.host.isSlotBlockedForPlayer(to))
        {
            return false;
        }

        const moved = this.host.board.moveCard(from, to);

        if (moved)
        {
            markCardRelocated(card);
            this.consumeEditBudget();
        }

        return moved;
    }

    swapCardsOnBoard (a: SlotPosition, b: SlotPosition): boolean
    {
        if (!this.canEditBoard())
        {
            return false;
        }

        const cardA = this.host.board.getCardAt(a);
        const cardB = this.host.board.getCardAt(b);

        if (!cardA || isEnemyOwnedCard(cardA) || isFieldOwnedCard(cardA) || cardA.exhausted
            || (cardB && (isEnemyOwnedCard(cardB) || isFieldOwnedCard(cardB) || cardB.exhausted)))
        {
            return false;
        }

        const swapped = this.host.board.swapCards(a, b);

        if (swapped)
        {
            markCardRelocated(cardA);

            if (cardB)
            {
                markCardRelocated(cardB);
            }

            this.consumeEditBudget();
        }

        return swapped;
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
