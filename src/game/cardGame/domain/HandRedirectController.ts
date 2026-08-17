import { getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { BoardModel } from './BoardModel';
import type { DeckHand } from './DeckHand';
import type { CardInstance } from './types';
import type { CardDirection } from './cardDirections';
import { randomDirectionForPool, randomOrthogonalPair } from './cardDirections';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';

export interface HandRedirectHost
{
    readonly board: BoardModel;
    readonly deckHand: DeckHand;
    getEnergy (): number;
}

/** Scrambles hand arrows for the energy round (redirect-hand enemy passive). */
export class HandRedirectController
{
    /** Original arrows for cards scrambled by redirect-hand this energy round. */
    private readonly handRedirectOriginals = new Map<string, {
        arrow: CardDirection;
        loopArrow?: CardDirection;
    }>();
    /** When true, scramble the next renewed hand (enemy acted as energy hit 0). */
    private pendingHandRedirect = false;
    /** Hand arrows stay twisted until the current energy round ends. */
    private handRedirectActiveThisRound = false;

    constructor (private readonly host: HandRedirectHost) {}

    isActiveThisRound (): boolean
    {
        return this.handRedirectActiveThisRound;
    }

    /**
     * Scrambles arrows on cards currently in hand for the rest of this energy round.
     * If energy is already spent, queues the scramble for the next renewed hand.
     */
    applyHandRedirect (): number
    {
        if (this.host.getEnergy() <= 0)
        {
            this.pendingHandRedirect = true;

            return 0;
        }

        this.handRedirectActiveThisRound = true;

        return this.scrambleHandArrows();
    }

    /** True while hand arrows are twisted (or queued for the next hand). */
    hasHandRedirect (): boolean
    {
        return this.handRedirectActiveThisRound
            || this.handRedirectOriginals.size > 0
            || this.pendingHandRedirect;
    }

    scrambleHandArrows (): number
    {
        let changed = 0;

        for (const card of this.host.deckHand.getHand())
        {
            const definition = getCardDefinitionOrThrow(card.definitionId);

            if (definition.arrowPool === 'joker')
            {
                continue;
            }

            if (!this.handRedirectOriginals.has(card.instanceId))
            {
                this.handRedirectOriginals.set(card.instanceId, {
                    arrow: card.arrow,
                    loopArrow: card.loopArrow,
                });
            }

            if (definition.behaviorId === 'loop-reset')
            {
                const pair = randomOrthogonalPair();
                card.arrow = pair.arrow;
                card.loopArrow = pair.loopArrow;
            }
            else
            {
                card.arrow = randomDirectionForPool(definition.arrowPool);
            }

            changed += 1;
        }

        if (changed > 0)
        {
            CardGameEventBus.emit(CARD_GAME_EVENTS.HAND_CHANGED, {
                hand: [ ...this.host.deckHand.getHand() ],
            });
        }

        return changed;
    }

    /** Restores any arrows twisted this round (hand, board, or piles). */
    clearHandRedirect (): void
    {
        if (this.handRedirectOriginals.size === 0)
        {
            return;
        }

        const restore = (card: CardInstance): void =>
        {
            const original = this.handRedirectOriginals.get(card.instanceId);

            if (!original)
            {
                return;
            }

            card.arrow = original.arrow;

            if (original.loopArrow !== undefined)
            {
                card.loopArrow = original.loopArrow;
            }
            else
            {
                delete card.loopArrow;
            }
        };

        for (const card of this.host.deckHand.getHand())
        {
            restore(card);
        }

        for (const card of this.host.deckHand.getDeckCards())
        {
            restore(card);
        }

        for (const card of this.host.deckHand.getDiscardCards())
        {
            restore(card);
        }

        for (const slot of this.host.board.slotsInOrder())
        {
            const card = this.host.board.getCardAt(slot);

            if (card)
            {
                restore(card);
            }
        }

        this.handRedirectOriginals.clear();
        this.handRedirectActiveThisRound = false;
    }

    /** After renewHand at round start: apply a redirect that was queued at energy 0. */
    activatePendingAfterRenew (): void
    {
        if (!this.pendingHandRedirect)
        {
            return;
        }

        this.pendingHandRedirect = false;
        this.handRedirectActiveThisRound = true;
        this.scrambleHandArrows();
    }
}
