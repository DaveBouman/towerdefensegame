import type { CardBoardView } from '../board/CardBoardView';
import type { CardHandView } from '../board/CardHandView';
import type { CardGameSession } from '../cardGame/domain/CardGameSession';
import type { SlotPosition } from '../cardGame/domain/types';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';

export const sameSlot = (a: SlotPosition, b: SlotPosition): boolean =>
    a.row === b.row && a.col === b.col;

export interface CardDropHandlerDeps
{
    session?: CardGameSession;
    boardView?: CardBoardView;
    emitAttackReadiness: () => void;
}

export const handleCardDropped = (
    deps: CardDropHandlerDeps,
    handIndex: number,
    worldX: number,
    worldY: number,
): boolean =>
{
    if (!deps.session || !deps.boardView || !deps.session.canEditBoard())
    {
        deps.boardView?.clearHighlight();
        return false;
    }

    deps.boardView.clearHighlight();

    const slot = deps.boardView.findSlotAt(worldX, worldY);

    if (!slot)
    {
        return false;
    }

    if (!deps.session.placeCardFromHand(handIndex, slot))
    {
        return false;
    }

    deps.boardView.syncFromBoard(deps.session.board);
    deps.emitAttackReadiness();

    return true;
};

export interface BoardCardDropHandlerDeps
{
    session?: CardGameSession;
    boardView?: CardBoardView;
    handView?: CardHandView;
    emitAttackReadiness: () => void;
}

export const handleBoardCardDropped = (
    deps: BoardCardDropHandlerDeps,
    fromSlot: SlotPosition,
    worldX: number,
    worldY: number,
): boolean =>
{
    if (!deps.session || !deps.boardView || !deps.handView || !deps.session.canEditBoard())
    {
        deps.boardView?.clearHighlight();
        return false;
    }

    deps.boardView.clearHighlight();

    if (deps.handView.containsPoint(worldX, worldY))
    {
        if (!deps.session.removeCardFromBoard(fromSlot))
        {
            return false;
        }

        deps.boardView.syncFromBoard(deps.session.board);
        deps.handView.syncHand(deps.session.getHand());
        deps.emitAttackReadiness();

        return true;
    }

    const targetSlot = deps.boardView.findSlotAt(worldX, worldY);

    if (!targetSlot || sameSlot(fromSlot, targetSlot))
    {
        return false;
    }

    if (deps.session.board.isEmpty(targetSlot))
    {
        if (!deps.session.moveCardOnBoard(fromSlot, targetSlot))
        {
            return false;
        }

        deps.boardView.syncFromBoard(deps.session.board);
        deps.emitAttackReadiness();

        return true;
    }

    if (!deps.session.swapCardsOnBoard(fromSlot, targetSlot))
    {
        return false;
    }

    deps.boardView.syncFromBoard(deps.session.board);
    deps.emitAttackReadiness();

    return true;
};

export interface RerollHandlerDeps
{
    session?: CardGameSession;
    handView?: CardHandView;
    setRerollModeActive: (active: boolean) => void;
    emitRerollState: (selectedCount?: number) => void;
    emitAttackReadiness: () => void;
    syncPileViews: () => void;
}

export const handleRerollBegin = (deps: RerollHandlerDeps): void =>
{
    if (!deps.session)
    {
        return;
    }

    if (!deps.session.canReroll())
    {
        if (deps.session.isBusy())
        {
            EventBus.emit(GAME_EVENTS.ATTACK_REJECTED, {
                reason: deps.session.isAttackInProgress() ? 'attack-in-progress' : 'enemy-turn',
            });
        }

        return;
    }

    deps.setRerollModeActive(true);
    deps.handView?.setRerollMode(true);
    deps.emitRerollState();
};

export const handleRerollCancel = (deps: RerollHandlerDeps): void =>
{
    deps.setRerollModeActive(false);
    deps.handView?.setRerollMode(false);
    deps.emitRerollState();
};

export const handleRerollConfirm = (deps: RerollHandlerDeps): void =>
{
    if (!deps.session?.canReroll() || !deps.handView)
    {
        return;
    }

    const indices = deps.handView.getSelectedHandIndices();

    if (indices.length === 0)
    {
        return;
    }

    if (deps.session.rerollHandCards(indices))
    {
        deps.setRerollModeActive(false);
        deps.handView.setRerollMode(false);
        deps.handView.syncHand(deps.session.getHand());
        deps.syncPileViews();
        deps.emitAttackReadiness();
    }

    deps.emitRerollState();
};
