import {
    GAME_RULES,
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
    /** When false, move budget is ignored (puzzles / training sim). */
    isBoardMoveBudgetEnabled (): boolean;
    isSlotBlockedForPlayer (slot: SlotPosition): boolean;
    onCardExhausted (definitionId: string): void;
}

/** Player board edits: place freely; move / remove / swap use a per-round budget. */
export class BoardEditController
{
    private movesUsedThisRound = 0;

    constructor (private readonly host: BoardEditHost) {}

    canEditBoard (): boolean
    {
        if (this.host.isPuzzleFinished())
        {
            return false;
        }

        return !this.host.isBusy();
    }

    getBoardMovesUsed (): number
    {
        return this.movesUsedThisRound;
    }

    getBoardMovesRemaining (): number
    {
        if (!this.host.isBoardMoveBudgetEnabled())
        {
            return Number.POSITIVE_INFINITY;
        }

        const max = GAME_RULES.boardMovesPerEnergyRound;

        if (max <= 0)
        {
            return Number.POSITIVE_INFINITY;
        }

        return Math.max(0, max - this.movesUsedThisRound);
    }

    getBoardMovesMax (): number
    {
        if (!this.host.isBoardMoveBudgetEnabled())
        {
            return 0;
        }

        return Math.max(0, GAME_RULES.boardMovesPerEnergyRound);
    }

    /** Call when a new energy round begins (after board wipe). */
    resetBoardMoves (): void
    {
        this.movesUsedThisRound = 0;
    }

    /** @deprecated Use getBoardMovesRemaining — kept for HUD transition aliases. */
    getBoardPlacementsRemaining (): number
    {
        return this.getBoardMovesRemaining();
    }

    /** @deprecated Use getBoardMovesMax */
    getBoardPlacementsMax (): number
    {
        return this.getBoardMovesMax();
    }

    /** @deprecated Use getBoardMovesUsed */
    getBoardPlacementsUsed (): number
    {
        return this.getBoardMovesUsed();
    }

    /** @deprecated Use resetBoardMoves */
    resetBoardPlacements (): void
    {
        this.resetBoardMoves();
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

        // Empty tile: place freely (no move budget).
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

            return true;
        }

        // Replacing / covering an existing player card counts as a move.
        if (this.getBoardMovesRemaining() <= 0)
        {
            return false;
        }

        if (existing.exhausted)
        {
            this.host.board.removeCard(slot);
            this.host.deckHand.exhaustToPile([ existing ]);
            this.host.board.placeCard(slot, card);
            this.host.deckHand.removeHandCardAt(handIndex);
            markCardSettled(card);
            this.markExhaustedIfNeeded(card, definition);
            this.movesUsedThisRound += 1;
            CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card, replaced: true });
            this.host.deckHand.discardFromHandOnPlay(getCardDiscardFromHandCount(definition));

            return true;
        }

        this.host.board.removeCard(slot);
        this.host.board.placeCard(slot, card);
        this.host.deckHand.setHandCardAt(handIndex, existing);
        markCardRelocated(existing);
        markCardSettled(card);
        this.markExhaustedIfNeeded(card, definition);
        this.movesUsedThisRound += 1;
        CardGameEventBus.emit(CARD_GAME_EVENTS.CARD_PLACED, { slot, card, replaced: true });
        this.host.deckHand.discardFromHandOnPlay(getCardDiscardFromHandCount(definition));

        return true;
    }

    removeCardFromBoard (slot: SlotPosition): boolean
    {
        if (this.host.isBusy())
        {
            return false;
        }

        if (this.getBoardMovesRemaining() <= 0)
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
        this.movesUsedThisRound += 1;

        return true;
    }

    moveCardOnBoard (from: SlotPosition, to: SlotPosition): boolean
    {
        if (this.host.isBusy())
        {
            return false;
        }

        if (this.getBoardMovesRemaining() <= 0)
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
            this.movesUsedThisRound += 1;
        }

        return moved;
    }

    swapCardsOnBoard (a: SlotPosition, b: SlotPosition): boolean
    {
        if (this.host.isBusy())
        {
            return false;
        }

        if (this.getBoardMovesRemaining() <= 0)
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

            this.movesUsedThisRound += 1;
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
