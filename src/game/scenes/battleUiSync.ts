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
import { planChainPathPreview } from '../cardGame/combat/AttackPipeline';
import { collectComboTrails } from '../cardGame/combat/comboTrailRegistry';
import { findAllStreakBarRuns } from '../cardGame/combat/streakBarRuns';
import { buildChainTickBeats } from '../cardGame/combat/chainTickBeats';
import { getMidChainEnemyAttackPlan } from '../cardGame/combat/chainTiming';
import { playFloatingText } from '../cardGame/presentation/visualEffects/visualEffectTweens';
import { GAME_RULES } from '../cardGame/config/cardRegistry';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { unlockEnemies } from '../run/enemyBestiary';
import { readChainPathLitEnabled } from '../ui/chainPathSettings';

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
    exhaustView?: CardPileView;
    layout?: BoardLayout;
    rerollModeActive: boolean;
}

/** Last combo storm labels — used to flash when a board edit breaks a storm. */
let lastStormLabels: string[] = [];

export const getLastStormLabels = (): readonly string[] => lastStormLabels;

export const noteStormLabels = (labels: readonly string[]): void =>
{
    lastStormLabels = [ ...labels ];
};

interface AttackReadinessEmitCache
{
    pathBoardKey: string;
    chainStartKey: string;
    attackReadyKey: string;
    turnKey: string;
    rerollKey: string;
}

let emitCache: AttackReadinessEmitCache = {
    pathBoardKey: '',
    chainStartKey: '',
    attackReadyKey: '',
    turnKey: '',
    rerollKey: '',
};

/** Reset when a fight tears down so the next battle does not skip a first emit. */
export const resetAttackReadinessEmitCache = (): void =>
{
    emitCache = {
        pathBoardKey: '',
        chainStartKey: '',
        attackReadyKey: '',
        turnKey: '',
        rerollKey: '',
    };
};

const fingerprintBoardForPathPreview = (session: CardGameSession): string =>
{
    const start = session.getChainStartSlot();
    const parts: string[] = [
        `s${start.row},${start.col}`,
        session.isBusy() ? 'b1' : 'b0',
        readChainPathLitEnabled() ? 'p1' : 'p0',
    ];

    for (let row = 0; row < session.board.rows; row += 1)
    {
        for (let col = 0; col < session.board.cols; col += 1)
        {
            const card = session.board.getCardAt({ row, col });

            if (!card)
            {
                parts.push('.');
                continue;
            }

            parts.push([
                card.instanceId,
                card.arrow ?? '',
                card.relocated ? '1' : '0',
                card.spent ? '1' : '0',
                card.exhausted ? '1' : '0',
            ].join(':'));
        }
    }

    return parts.join('|');
};

export interface BattlePileClickSyncDeps
{
    pileInspectionBlocked: boolean;
    deckView?: CardPileView;
    graveyardView?: CardPileView;
    exhaustView?: CardPileView;
    openPileView: (kind: 'deck' | 'graveyard' | 'exhaust') => void;
}

export const syncPileClickHandlers = (deps: BattlePileClickSyncDeps): void =>
{
    if (deps.pileInspectionBlocked)
    {
        deps.deckView?.setClickHandler(null);
        deps.graveyardView?.setClickHandler(null);
        deps.graveyardView?.setExhaustClickHandler(null);
        deps.exhaustView?.setClickHandler(null);

        return;
    }

    deps.deckView?.setClickHandler(() => deps.openPileView('deck'));
    deps.graveyardView?.setClickHandler(() => deps.openPileView('graveyard'));
    deps.graveyardView?.setExhaustClickHandler(() => deps.openPileView('exhaust'));
    deps.exhaustView?.setClickHandler(() => deps.openPileView('exhaust'));
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
    deps: Pick<BattleUiSyncDeps, 'session' | 'deckView' | 'graveyardView' | 'exhaustView'>,
): void =>
{
    if (!deps.session)
    {
        return;
    }

    const { deckSize, discardSize, exhaustSize } = deps.session.getPileCounts();

    deps.deckView?.setStack(deckSize, deps.session.getDeckTopCard() ?? null);
    deps.graveyardView?.setStack(discardSize, deps.session.getDiscardTopCard() ?? null);
    deps.graveyardView?.setExhaustCount(exhaustSize);
    deps.exhaustView?.setStack(exhaustSize, deps.session.getExhaustTopCard() ?? null);
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
    deps: Pick<BattleUiSyncDeps, 'session' | 'deckView' | 'graveyardView' | 'exhaustView'>,
    { deckSize, discardSize, exhaustSize }: { deckSize: number; discardSize: number; exhaustSize: number },
): void =>
{
    if (!deps.session)
    {
        return;
    }

    deps.deckView?.setStack(deckSize, deps.session.getDeckTopCard() ?? null);
    deps.graveyardView?.setStack(discardSize, deps.session.getDiscardTopCard() ?? null);
    deps.graveyardView?.setExhaustCount(exhaustSize);
    deps.exhaustView?.setStack(exhaustSize, deps.session.getExhaustTopCard() ?? null);
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

export const emitTurnState = (deps: Pick<BattleUiSyncDeps, 'session' | 'boardView'>): void =>
{
    if (!deps.session)
    {
        return;
    }

    const editBudget = deps.session.getBoardEditBudget();
    const planned = deps.session.planAttack();
    const momentum = deps.session.getComboMomentum();
    const momentumMult = deps.session.getComboMomentumMult();
    const loopIndex = deps.session.getLoopsThisBurst();
    const burstLimit = deps.session.getLoopBurstLimit();

    let stormLabels: string[] = [];
    let forecastDamage = 0;
    let forecastBonus = 0;

    if (planned)
    {
        const trailSteps = planned.chain.map((step) => ({
            slot: step.slot,
            behaviorId: step.behaviorId,
            definitionId: step.definitionId,
        }));
        const { hits } = collectComboTrails(trailSteps, planned.chain, 2);

        stormLabels = hits.map((hit) => hit.label);
        forecastBonus = Math.ceil(planned.abilityEnemyDamage * momentumMult);
        forecastDamage = Math.ceil(
            (planned.totalDamage + planned.abilityEnemyDamage + planned.offChainDamage)
                * momentumMult,
        );
    }

    const broken = lastStormLabels.filter((label) => !stormLabels.includes(label));

    if (broken.length > 0 && deps.boardView)
    {
        deps.boardView.flashStormBreak();
    }

    noteStormLabels(stormLabels);

    EventBus.emit(GAME_EVENTS.TURN_STATE, {
        energy: deps.session.getEnergy(),
        maxEnergy: deps.session.getMaxEnergy(),
        // Energy refills automatically when a full round of attacks is spent.
        canEndTurn: false,
        // null budget = unlimited (prep / burst draft); omit so HUD skips the hint.
        ...(editBudget === null ? {} : { boardMovesRemaining: editBudget }),
        ...(deps.session.shouldPersistBoardLayout()
            ? {
                comboMomentum: momentum,
                comboMomentumMult: momentumMult,
                loopIndex,
                burstLimit,
                forecastDamage,
                forecastBonus,
                stormLabels,
            }
            : {}),
    });
};

export const emitAttackReadiness = (
    deps: BattleUiSyncDeps,
    options: { soft?: boolean } = {},
): void =>
{
    if (!deps.session)
    {
        return;
    }

    const soft = options.soft === true;

    if (!soft)
    {
        deps.enemySquad?.syncFromSession(deps.session);
        syncBattleModifierLayout(deps);
        deps.battleModifierView?.setModifiers(deps.session.getBattleModifiers());
        deps.playerView?.setThorns(deps.session.getPlayerThorns());
    }

    deps.enemySquad?.syncTargetPrompt(deps.session);

    if (!soft
        && !deps.session.isBusy()
        && !deps.session.isEnemyDefeated())
    {
        deps.enemySquad?.showAllIntents(deps.session);
    }

    const chainStartPickable = deps.session.canEditBoard()
        && !deps.rerollModeActive
        && !deps.session.isBusy();

    // Snap start onto a packed card before reading readiness / path preview.
    const readiness = deps.session.getAttackReadiness();
    const chainStart = deps.session.getChainStartSlot();

    deps.boardView?.setChainStartPickable(chainStartPickable);
    deps.boardView?.setChainStartSlot(chainStart);

    if (deps.boardView && !deps.session.isBusy() && !deps.session.isEnemyDefeated())
    {
        const preview = planChainPathPreview(
            deps.session.board,
            chainStart,
        );
        const streakBars = findAllStreakBarRuns(
            deps.session.board,
            chainStart,
        );

        if (streakBars.length > 0)
        {
            deps.boardView.setStreakBars(streakBars);
        }
        else
        {
            deps.boardView.clearStreakBars();
        }

        // Always show path while the board is editable (Engage / between-Attack / prep).
        const showPath = deps.session.canEditBoard() || readChainPathLitEnabled();

        if (!showPath)
        {
            deps.boardView.clearChainPath();
        }
        else if (preview.slots.length >= 2)
        {
            deps.boardView.setChainPathPreview(preview.slots, preview.tentativeFromIndex);
        }
        else
        {
            deps.boardView.clearChainPath();
        }

        // Hit beat depends on placed cards — refresh whenever the board syncs.
        if (preview.slots.length > 0)
        {
            const midHit = getMidChainEnemyAttackPlan(deps.session);

            deps.boardView.setChainBeatLabels(
                buildChainTickBeats(
                    deps.session.board,
                    preview.slots,
                    midHit?.atTicks ?? null,
                ),
            );
        }
        else
        {
            deps.boardView.clearChainBeatLabels();
        }
    }

    EventBus.emit(GAME_EVENTS.CHAIN_START_STATE, {
        pickable: chainStartPickable,
        row: chainStart.row,
        rowLabel: boardRowLabel(chainStart.row),
    });

    EventBus.emit(GAME_EVENTS.CARD_ATTACK_READY, readiness);
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
