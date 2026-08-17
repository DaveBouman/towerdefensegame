import type { BoardLayout } from '../board/boardLayout';
import { boardRowLabel } from '../board/boardCoordinates';
import type { BattleModifierStatusView } from '../board/BattleModifierStatusView';
import type { CardBoardView } from '../board/CardBoardView';
import type { CardHandView } from '../board/CardHandView';
import type { CardPileView } from '../board/CardPileView';
import type { EnemySquadView } from '../board/EnemySquadView';
import type { PlayerHealthView } from '../board/PlayerHealthView';
import type { CardGameSession } from '../cardGame/domain/CardGameSession';
import type { CardGamePresenter } from '../cardGame/presentation/CardGamePresenter';
import { playFloatingText } from '../cardGame/presentation/visualEffects/visualEffectTweens';
import { GAME_RULES } from '../cardGame/config/cardRegistry';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { unlockEnemies } from '../run/enemyBestiary';

/** Shared view/session handles for battle UI sync helpers. */
export interface BattleUiSyncDeps
{
    session?: CardGameSession;
    presenter?: CardGamePresenter;
    boardView?: CardBoardView;
    handView?: CardHandView;
    enemySquad?: EnemySquadView;
    playerView?: PlayerHealthView;
    battleModifierView?: BattleModifierStatusView;
    deckView?: CardPileView;
    graveyardView?: CardPileView;
    layout?: BoardLayout;
    rerollModeActive: boolean;
}

export interface BattlePileClickSyncDeps
{
    pileInspectionBlocked: boolean;
    deckView?: CardPileView;
    graveyardView?: CardPileView;
    openPileView: (kind: 'deck' | 'graveyard') => void;
}

export const syncPileClickHandlers = (deps: BattlePileClickSyncDeps): void =>
{
    if (deps.pileInspectionBlocked)
    {
        deps.deckView?.setClickHandler(null);
        deps.graveyardView?.setClickHandler(null);

        return;
    }

    deps.deckView?.setClickHandler(() => deps.openPileView('deck'));
    deps.graveyardView?.setClickHandler(() => deps.openPileView('graveyard'));
};

export const syncBattleModifierLayout = (
    deps: Pick<BattleUiSyncDeps, 'battleModifierView' | 'layout' | 'playerView' | 'enemySquad'>,
): void =>
{
    if (!deps.battleModifierView || !deps.layout || !deps.playerView || !deps.enemySquad)
    {
        return;
    }

    deps.battleModifierView.setAnchors({
        getPlayerBottomY: () => deps.playerView!.getStatusChromeBottomWorldY(),
        getEnemyBottomY: () => deps.enemySquad!.getMaxStatusChromeBottomWorldY(),
    });
};

export const syncPileViews = (
    deps: Pick<BattleUiSyncDeps, 'session' | 'deckView' | 'graveyardView'>,
): void =>
{
    if (!deps.session)
    {
        return;
    }

    const { deckSize, discardSize } = deps.session.getPileCounts();

    deps.deckView?.setStack(deckSize, deps.session.getDeckTopCard() ?? null);
    deps.graveyardView?.setStack(discardSize, deps.session.getDiscardTopCard() ?? null);
};

export const syncBoardFromSession = (
    deps: Pick<BattleUiSyncDeps, 'session' | 'boardView' | 'presenter'>,
): void =>
{
    if (!deps.session || !deps.boardView)
    {
        return;
    }

    // Drop cached glow targets before wrappers are destroyed/rebuilt.
    deps.presenter?.dropTransientVisualRefs();
    deps.boardView.syncFromBoard(deps.session.board);
    deps.boardView.setBlockedSlots(
        deps.session.getPlacementBlockedSlots(),
        deps.session.getBombDisabledSlots(),
    );
    deps.boardView.setDampenedSlots(deps.session.getDampenedSlots());
    deps.boardView.setNullifiedSlots(deps.session.getNullifiedSlots());
};

export const handlePilesChanged = (
    deps: Pick<BattleUiSyncDeps, 'session' | 'deckView' | 'graveyardView'>,
    { deckSize, discardSize }: { deckSize: number; discardSize: number },
): void =>
{
    if (!deps.session)
    {
        return;
    }

    deps.deckView?.setStack(deckSize, deps.session.getDeckTopCard() ?? null);
    deps.graveyardView?.setStack(discardSize, deps.session.getDiscardTopCard() ?? null);
};

export const emitRerollState = (
    deps: Pick<BattleUiSyncDeps, 'session' | 'handView' | 'rerollModeActive'>,
    selectedCount?: number,
): void =>
{
    if (!deps.session)
    {
        return;
    }

    EventBus.emit(GAME_EVENTS.REROLL_STATE, {
        rerollsRemaining: deps.session.getRerollsRemaining(),
        maxRerollsPerFloor: GAME_RULES.rerollsPerFloor,
        canReroll: deps.session.canReroll(),
        rerollModeActive: deps.rerollModeActive,
        selectedCount: selectedCount ?? deps.handView?.getRerollSelectionCount() ?? 0,
    });
};

export const emitTurnState = (deps: Pick<BattleUiSyncDeps, 'session'>): void =>
{
    if (!deps.session)
    {
        return;
    }

    EventBus.emit(GAME_EVENTS.TURN_STATE, {
        energy: deps.session.getEnergy(),
        maxEnergy: deps.session.getMaxEnergy(),
        // Energy refills automatically when a full round of attacks is spent.
        canEndTurn: false,
    });
};

export const emitAttackReadiness = (deps: BattleUiSyncDeps): void =>
{
    if (!deps.session)
    {
        return;
    }

    deps.enemySquad?.syncFromSession(deps.session);
    deps.enemySquad?.syncTargetPrompt(deps.session);
    syncBattleModifierLayout(deps);
    deps.battleModifierView?.setModifiers(deps.session.getBattleModifiers());
    deps.playerView?.setThorns(deps.session.getPlayerThorns());

    if (!deps.session.isBusy()
        && !deps.session.isEnemyDefeated())
    {
        deps.enemySquad?.showAllIntents(deps.session);
    }

    const chainStartPickable = deps.session.canEditBoard()
        && !deps.rerollModeActive
        && !deps.session.isBusy();
    const chainStart = deps.session.getChainStartSlot();

    deps.boardView?.setChainStartPickable(chainStartPickable);
    EventBus.emit(GAME_EVENTS.CHAIN_START_STATE, {
        pickable: chainStartPickable,
        row: chainStart.row,
        rowLabel: boardRowLabel(chainStart.row),
    });

    EventBus.emit(GAME_EVENTS.CARD_ATTACK_READY, deps.session.getAttackReadiness());
    emitTurnState(deps);
    emitRerollState(deps);
};

export interface CombatantsChangedDeps extends BattleUiSyncDeps
{
    scene: Phaser.Scene;
    added: string[];
    removed: string[];
    reason: 'spawn' | 'shatter' | 'flee';
}

export const handleCombatantsChanged = (deps: CombatantsChangedDeps): void =>
{
    if (!deps.session || !deps.enemySquad)
    {
        return;
    }

    const spawned = deps.added
        .map((instanceId) => deps.session!.getCombatant(instanceId))
        .filter((combatant): combatant is NonNullable<typeof combatant> => Boolean(combatant));

    deps.enemySquad.applyRosterChange(deps.session, spawned, deps.removed);
    syncBattleModifierLayout(deps);
    emitAttackReadiness(deps);
    unlockEnemies(spawned.map((combatant) => combatant.definitionId));

    const anchor = deps.enemySquad.firstView?.container;

    if (!anchor)
    {
        return;
    }

    playFloatingText(
        deps.scene,
        anchor,
        anchor.width / 2,
        -8,
        deps.reason === 'shatter' ? 'SHATTER' : deps.reason === 'flee' ? 'FLED' : 'SPAWN',
        deps.reason === 'shatter' ? '#ff9a8a' : '#7af0ff',
    );
};
