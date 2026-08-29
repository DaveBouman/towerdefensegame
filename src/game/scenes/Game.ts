import { getGameCursors, subscribeGameCursors } from '../ui/gameCursors';
import { readChainPathLitEnabled } from '../ui/chainPathSettings';
import { applyBoardLayout, computeBoardLayout, type BoardLayout } from '../board/boardLayout';
import { BattlefieldBackgroundView } from '../board/BattlefieldBackgroundView';
import { MapBackgroundView } from '../board/MapBackgroundView';
import { ArmorView } from '../board/ArmorView';
import { CardBoardView } from '../board/CardBoardView';
import { CardHandView } from '../board/CardHandView';
import { CardPileView } from '../board/CardPileView';
import { EnemySquadView } from '../board/EnemySquadView';
import { BattleModifierStatusView } from '../board/BattleModifierStatusView';
import { PlayerHealthView } from '../board/PlayerHealthView';
import { CardGameSession } from '../cardGame/domain/CardGameSession';
import { GAME_RULES, getCardDefinitionOrThrow } from '../cardGame/config/cardRegistry';
import type { SlotPosition } from '../cardGame/domain/types';
import { preloadGameIcons } from '../cardGame/presentation/icons/preloadEnemyPassiveIcons';
import { preloadEnemyPortraits } from '../cardGame/presentation/icons/preloadEnemyPortraits';
import { preloadSteamPortraits } from '../cardGame/presentation/icons/preloadSteamPortraits';
import { CardGamePresenter } from '../cardGame/presentation/CardGamePresenter';
import { CardGameEventBus } from '../cardGame/events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../cardGame/events/cardGameEvents';
import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { reseed } from '../random/rng';
import { beginSteamFaceBattle } from '../desktop/steamAvatars';
import { getRunPuzzle } from '../run/runPuzzles';
import { getAscensionEnemyHealthMultiplier } from '../run/ascension';
import { getRouteEnemyHealthMultiplier } from '../run/routeModifiers';
import type { PuzzleModeConfig } from '../cardGame/domain/CardGameSession';
import {
    bindGameAudioListeners,
    resetBattleAudioState,
} from '../audio/bindGameAudio';
import { bindGameBgmListeners } from '../audio/bindGameBgm';
import {
    bindGameAudioScene,
    markSfxLoaded,
    preloadSfx,
    unbindGameAudioScene,
} from '../audio/gameAudio';
import {
    bindGameBgmScene,
    markBgmLoaded,
    preloadBgm,
    unbindGameBgmScene,
} from '../audio/gameBgm';
import {
    handleAttack,
    handleEndTurn,
    type BattleAttackFlowDeps,
} from './battleAttackFlow';
import {
    handleBoardCardDropped,
    handleCardDropped,
    handleRerollBegin,
    handleRerollCancel,
    handleRerollConfirm,
    type RerollHandlerDeps,
} from './battleInputHandlers';
import {
    emitAttackReadiness,
    emitRerollState,
    handleCombatantsChanged,
    handlePilesChanged,
    syncBattleModifierLayout,
    syncBoardFromSession,
    syncPileClickHandlers,
    syncPileViews,
    type BattleUiSyncDeps,
} from './battleUiSync';
import { destroyBattleViews } from './gameBattleViews';
import { BlendModes, Scene } from 'phaser';

export class Game extends Scene
{
    private session?: CardGameSession;
    private presenter?: CardGamePresenter;
    private boardView?: CardBoardView;
    private handView?: CardHandView;
    private enemySquad?: EnemySquadView;
    private playerView?: PlayerHealthView;
    private battleModifierView?: BattleModifierStatusView;
    private armorView?: ArmorView;
    private deckView?: CardPileView;
    private graveyardView?: CardPileView;
    private exhaustView?: CardPileView;
    private rerollModeActive = false;
    private layout?: BoardLayout;
    private battleActive = false;
    private battleResolved = false;
    private activePuzzleId: string | null = null;
    private lowHpVignette?: Phaser.GameObjects.Rectangle;
    private battlefieldBackground?: BattlefieldBackgroundView;
    private mapBackground?: MapBackgroundView;
    private runPhase = 'map';
    private unbindAudio?: () => void;
    private unbindBgm?: () => void;
    private unbindCursors?: () => void;
    private pileInspectionBlocked = false;
    private phaseShiftHandler?: (payload: { label: string; message: string }) => void;

    constructor ()
    {
        super('Game');
    }

    preload (): void
    {
        preloadSfx(this);
        preloadBgm(this);
    }

    create (): void
    {
        this.input.setDefaultCursor(getGameCursors().default);
        this.unbindCursors = subscribeGameCursors((urls) =>
        {
            this.input.setDefaultCursor(urls.default);
        });
        bindGameAudioScene(this);
        bindGameBgmScene(this);
        markSfxLoaded();
        markBgmLoaded();
        this.unbindAudio = bindGameAudioListeners();
        this.unbindBgm = bindGameBgmListeners();

        void Promise.all([
            preloadGameIcons(this),
            preloadEnemyPortraits(this),
            preloadSteamPortraits(this),
        ]).then(() =>
        {
            this.registerListeners();
            EventBus.emit(GAME_EVENTS.SCENE_READY, this);
        });
    }

    private registerListeners (): void
    {
        EventBus.on(GAME_EVENTS.START_BATTLE, this.onStartBattle, this);
        EventBus.on(GAME_EVENTS.START_PUZZLE, this.onStartPuzzle, this);
        EventBus.on(GAME_EVENTS.ATTACK, this.onAttack, this);
        EventBus.on(GAME_EVENTS.END_TURN, this.onEndTurn, this);
        EventBus.on(GAME_EVENTS.REROLL_BEGIN, this.onRerollBegin, this);
        EventBus.on(GAME_EVENTS.REROLL_CONFIRM, this.onRerollConfirm, this);
        EventBus.on(GAME_EVENTS.REROLL_CANCEL, this.onRerollCancel, this);
        EventBus.on(GAME_EVENTS.CHAIN_PATH_LIT, this.onChainPathLit, this);
        EventBus.on(GAME_EVENTS.UI_OVERLAY_ACTIVE, this.onUiOverlayActive, this);
        EventBus.on(GAME_EVENTS.RUN_PHASE, this.onRunPhase, this);
        CardGameEventBus.on(CARD_GAME_EVENTS.PILES_CHANGED, this.onPilesChanged, this);
        CardGameEventBus.on(CARD_GAME_EVENTS.REROLLS_CHANGED, this.onRerollsChanged, this);
        CardGameEventBus.on(CARD_GAME_EVENTS.COMBATANTS_CHANGED, this.onCombatantsChanged, this);
        this.scale.on('resize', this.onResize, this);
    }

    private onRunPhase = ({ phase }: { phase: string }): void =>
    {
        this.runPhase = phase;
        this.syncRunBackdrop();
    };

    private syncRunBackdrop (): void
    {
        if (this.runPhase === 'map' || this.runPhase === 'menu')
        {
            this.battlefieldBackground?.destroy();
            this.battlefieldBackground = undefined;

            if (!this.mapBackground)
            {
                this.mapBackground = new MapBackgroundView(this);
            }

            const { width, height } = this.scale;

            this.mapBackground.resize(width, height);
            this.mapBackground.container.setVisible(true);

            return;
        }

        this.mapBackground?.container.setVisible(false);
    };

    private onUiOverlayActive = (
        { blockPileInspection }: { blockPileInspection?: boolean },
    ): void =>
    {
        this.pileInspectionBlocked = blockPileInspection ?? false;
        this.syncPileClickHandlers();
    };

    private battleUiSyncDeps (): BattleUiSyncDeps
    {
        return {
            session: this.session,
            presenter: this.presenter,
            boardView: this.boardView,
            handView: this.handView,
            enemySquad: this.enemySquad,
            playerView: this.playerView,
            battleModifierView: this.battleModifierView,
            deckView: this.deckView,
            graveyardView: this.graveyardView,
            exhaustView: this.exhaustView,
            layout: this.layout,
            rerollModeActive: this.rerollModeActive,
        };
    }

    private battleAttackFlowDeps (): BattleAttackFlowDeps
    {
        return {
            session: this.session,
            presenter: this.presenter,
            boardView: this.boardView,
            handView: this.handView,
            enemySquad: this.enemySquad,
            playerView: this.playerView,
            armorView: this.armorView,
            graveyardView: this.graveyardView,
            exhaustView: this.exhaustView,
            getRerollModeActive: () => this.rerollModeActive,
            cancelReroll: () => this.onRerollCancel(),
            emitAttackReadiness: () => this.emitAttackReadiness(),
            syncPileViews: () => this.syncPileViews(),
            syncBoardFromSession: () => this.syncBoardFromSession(),
            syncLowHpVignette: () => this.syncLowHpVignette(),
            getActivePuzzleId: () => this.activePuzzleId,
            delayCall: (ms, callback) =>
            {
                this.time.delayedCall(ms, callback);
            },
            endBattle: () => this.endBattle(),
            winBattle: () => this.winBattle(),
            loseBattle: () => this.loseBattle(),
        };
    }

    private rerollHandlerDeps (): RerollHandlerDeps
    {
        return {
            session: this.session,
            handView: this.handView,
            setRerollModeActive: (active) =>
            {
                this.rerollModeActive = active;
            },
            emitRerollState: (selectedCount) => this.emitRerollState(selectedCount),
            emitAttackReadiness: () => this.emitAttackReadiness(),
            syncPileViews: () => this.syncPileViews(),
        };
    }

    private syncPileClickHandlers (): void
    {
        syncPileClickHandlers({
            pileInspectionBlocked: this.pileInspectionBlocked,
            deckView: this.deckView,
            graveyardView: this.graveyardView,
            exhaustView: this.exhaustView,
            openPileView: (kind) => this.openPileView(kind),
        });
    }

    private syncBattleModifierLayout (): void
    {
        syncBattleModifierLayout(this.battleUiSyncDeps());
    };

    private onStartBattle = (
        {
            enemyId,
            enemyIds,
            startHealth,
            deck,
            seed,
            bodyMods,
            runAttackCount,
            rerollsRemaining,
            runGold,
            ascensionLevel = 0,
            routeKind,
            puzzleMode = null,
            enemyHealthMultiplier: enemyHealthOverride,
        }:
        {
            enemyId?: string;
            enemyIds?: readonly string[];
            startHealth: number;
            deck: import('../run/runDeck').RunDeckCard[];
            seed: number;
            bodyMods: string[];
            runAttackCount: number;
            rerollsRemaining: number;
            runGold?: number;
            ascensionLevel?: number;
            routeKind?: import('../run/runMap').RouteKind;
            puzzleMode?: PuzzleModeConfig | null;
            enemyHealthMultiplier?: number;
        },
    ): void =>
    {
        if (this.battleActive)
        {
            this.endBattle();
        }

        const battleEnemyIds = enemyIds && enemyIds.length > 0
            ? enemyIds
            : enemyId
                ? [ enemyId ]
                : [ GAME_RULES.defaultEnemyId ];

        const enemyHealthMultiplier = enemyHealthOverride
            ?? (
                getAscensionEnemyHealthMultiplier(ascensionLevel)
                * getRouteEnemyHealthMultiplier(routeKind)
            );

        this.startBattle(
            battleEnemyIds,
            startHealth,
            deck,
            seed,
            bodyMods,
            puzzleMode,
            runAttackCount,
            rerollsRemaining,
            runGold ?? 0,
            enemyHealthMultiplier,
        );

        if (puzzleMode && puzzleMode.damageTarget >= 999)
        {
            this.activePuzzleId = null;
        }
    };

    private onStartPuzzle = (
        { puzzleId, startHealth, seed, bodyMods, runAttackCount }:
        { puzzleId: string; startHealth: number; seed: number; bodyMods: string[]; runAttackCount: number },
    ): void =>
    {
        if (this.battleActive)
        {
            this.endBattle();
        }

        this.startPuzzle(puzzleId, startHealth, seed, bodyMods, runAttackCount);
    };

    private startPuzzle (
        puzzleId: string,
        startHealth: number,
        seed: number,
        bodyMods: string[],
        runAttackCount: number,
    ): void
    {
        const puzzle = getRunPuzzle(puzzleId);
        const puzzleMode: PuzzleModeConfig = {
            handCards: puzzle.cards,
            damageTarget: puzzle.damageTarget,
        };

        this.activePuzzleId = puzzleId;
        this.startBattle('training-dummy', startHealth, [], seed, bodyMods, puzzleMode, runAttackCount, 0);

        EventBus.emit(GAME_EVENTS.PUZZLE_STATE, {
            puzzleId,
            title: puzzle.title,
            hint: puzzle.hint,
            damageTarget: puzzle.damageTarget,
            cardCount: puzzle.cards.length,
            isPuzzle: true,
        });
    }

    private startBattle (
        enemyIds: string | readonly string[],
        startHealth: number,
        deck: import('../run/runDeck').RunDeckCard[],
        seed: number,
        bodyMods: string[],
        puzzleMode: PuzzleModeConfig | null = null,
        runAttackCount = 0,
        rerollsRemaining = GAME_RULES.rerollsPerFloor,
        runGold = 0,
        enemyHealthMultiplier = 1,
    ): void
    {
        resetBattleAudioState();

        // Install this battle's deterministic RNG stream before any card is dealt.
        reseed(seed);
        beginSteamFaceBattle(seed);

        if (!puzzleMode)
        {
            this.activePuzzleId = null;
        }

        const { width, height } = this.scale;
        this.layout = computeBoardLayout(width, height);
        const layout = this.layout;

        this.battlefieldBackground?.destroy();
        this.battlefieldBackground = new BattlefieldBackgroundView(this);
        this.battlefieldBackground.resize(width, height, layout);

        this.rerollModeActive = false;
        this.battleResolved = false;
        this.session = new CardGameSession(
            enemyIds,
            startHealth,
            deck,
            bodyMods,
            puzzleMode,
            runAttackCount,
            puzzleMode ? 0 : rerollsRemaining,
            runGold,
            enemyHealthMultiplier,
        );

        this.phaseShiftHandler = (payload) =>
        {
            EventBus.emit(GAME_EVENTS.PHASE_SHIFT, payload);
        };
        CardGameEventBus.on(CARD_GAME_EVENTS.PHASE_SHIFT, this.phaseShiftHandler);

        this.handView = new CardHandView(this, layout, [ ...this.session.getHand() ], {
            onDragMove: (worldX, worldY) =>
            {
                this.boardView?.highlightHandPlacement(worldX, worldY);
            },
            onDragEnd: (handIndex, worldX, worldY) =>
            {
                return this.onCardDropped(handIndex, worldX, worldY);
            },
            onPlaced: () =>
            {
                this.handView?.syncHand(this.session!.getHand());
            },
        }, () => !(this.boardView?.isDragging() ?? false) && !this.rerollModeActive, (selectedCount) =>
        {
            this.emitRerollState(selectedCount);
        });

        this.boardView = new CardBoardView(this, layout, this.session.board, {
            canDrag: () => !(this.handView?.isDragging() ?? false) && !this.rerollModeActive,
            onDragMove: (fromSlot, worldX, worldY) =>
            {
                this.boardView?.highlightBoardDrag(fromSlot, worldX, worldY);
            },
            onDragEnd: (fromSlot, worldX, worldY) =>
            {
                return this.onBoardCardDropped(fromSlot, worldX, worldY);
            },
        }, {
            canSelect: () => this.session?.canEditBoard() ?? false,
            onSelect: (slot) =>
            {
                if (!this.session?.setChainStartSlot(slot))
                {
                    return;
                }

                this.boardView?.setChainStartSlot(slot);
                this.emitAttackReadiness();
            },
        });

        this.playerView = new PlayerHealthView(this, layout, this.session.getPlayer());
        this.playerView.setCombatTraits(this.session.getPlayerCombatTraits());
        this.enemySquad = new EnemySquadView(
            this,
            layout,
            this.session.getCombatants(),
            (instanceId) =>
            {
                if (!this.session || this.session.isBusy())
                {
                    return;
                }

                this.session.setAttackTarget(instanceId);
                this.emitAttackReadiness();
            },
        );
        this.enemySquad.syncFromSession(this.session);
        this.battleModifierView = new BattleModifierStatusView(
            this,
            layout,
            this.session.getCombatants().length,
        );
        this.syncBattleModifierLayout();
        this.battleModifierView.setModifiers(this.session.getBattleModifiers());
        this.armorView = new ArmorView(this, layout, 0);
        this.deckView = new CardPileView(this, layout, layout.deckX, layout.deckY, 'Deck', 'deck');
        this.graveyardView = new CardPileView(this, layout, layout.graveyardX, layout.graveyardY, 'Discard', 'graveyard');
        this.exhaustView = undefined;
        this.syncPileClickHandlers();
        this.syncPileViews();

        if (!this.session.isPuzzleMode())
        {
            this.session.placeFieldBoost();
        }
        this.syncBoardFromSession();

        this.presenter = new CardGamePresenter(
            this,
            this.session,
            this.boardView,
            this.handView,
            this.enemySquad,
            this.playerView,
            this.armorView,
            this.battleModifierView,
        );
        this.presenter.bind();

        if (!this.session.isPuzzleMode())
        {
            this.enemySquad.showAllIntents(this.session);
        }

        this.battleActive = true;
        this.syncLowHpVignette();
        this.emitAttackReadiness();
        this.emitRerollState();
    }

    private ensureLowHpVignette (): void
    {
        if (this.lowHpVignette?.active)
        {
            return;
        }

        const camera = this.cameras.main;

        this.lowHpVignette = this.add.rectangle(
            camera.centerX,
            camera.centerY,
            camera.width,
            camera.height,
            0x8b0000,
            0,
        )
            .setScrollFactor(0)
            .setDepth(9000)
            .setBlendMode(BlendModes.MULTIPLY);
    }

    private syncLowHpVignette (): void
    {
        if (!this.session || !this.battleActive || this.session.isPuzzleMode())
        {
            this.lowHpVignette?.setAlpha(0);

            return;
        }

        this.ensureLowHpVignette();

        const player = this.session.getPlayer();
        const ratio = player.maxHealth > 0 ? player.health / player.maxHealth : 1;

        if (ratio <= 0.25 && ratio > 0)
        {
            this.lowHpVignette!.setAlpha(0.1 + (0.25 - ratio) * 0.3);
        }
        else
        {
            this.lowHpVignette!.setAlpha(0);
        }
    }

    private onResize = (gameSize: Phaser.Structs.Size): void =>
    {
        if (!this.layout || !this.boardView || !this.handView || !this.enemySquad
            || !this.playerView || !this.armorView || !this.deckView || !this.graveyardView)
        {
            return;
        }

        this.layout = computeBoardLayout(gameSize.width, gameSize.height);
        this.battlefieldBackground?.resize(gameSize.width, gameSize.height, this.layout);
        applyBoardLayout(this.layout, {
            board: this.boardView,
            hand: this.handView.container,
            enemy: this.enemySquad.firstView?.container ?? this.playerView.container,
            player: this.playerView.container,
            armor: this.armorView.container,
            deck: this.deckView.container,
            graveyard: this.graveyardView.container,
        });
        this.enemySquad.applyLayout(this.layout);
        this.syncBattleModifierLayout();
        this.battleModifierView?.reposition(this.layout, this.session?.getCombatants().length ?? 1);
        this.mapBackground?.resize(gameSize.width, gameSize.height);
    };

    private endBattle (): void
    {
        destroyBattleViews({
            session: this.session,
            presenter: this.presenter,
            boardView: this.boardView,
            handView: this.handView,
            enemySquad: this.enemySquad,
            playerView: this.playerView,
            battleModifierView: this.battleModifierView,
            armorView: this.armorView,
            deckView: this.deckView,
            graveyardView: this.graveyardView,
            exhaustView: this.exhaustView,
            battlefieldBackground: this.battlefieldBackground,
            lowHpVignette: this.lowHpVignette,
            phaseShiftHandler: this.phaseShiftHandler,
        });
        this.session = undefined;
        this.presenter = undefined;
        this.boardView = undefined;
        this.handView = undefined;
        this.enemySquad = undefined;
        this.playerView = undefined;
        this.battleModifierView = undefined;
        this.armorView = undefined;
        this.deckView = undefined;
        this.graveyardView = undefined;
        this.exhaustView = undefined;
        this.battlefieldBackground = undefined;
        this.lowHpVignette = undefined;
        this.phaseShiftHandler = undefined;
        this.battleActive = false;
        this.activePuzzleId = null;
        this.rerollModeActive = false;
    }

    private winBattle (): void
    {
        if (this.battleResolved || !this.session)
        {
            return;
        }

        this.battleResolved = true;
        const playerHealth = this.session.getPlayer().health;
        const runAttackCount = this.session.getRunAttackCount();
        const { goldStolen, stolenCardIds } = this.session.getRunBattleDeltas();
        const battleDamage = this.session.getBattleDamageTotals();

        this.time.delayedCall(900, () =>
        {
            this.endBattle();
            EventBus.emit(GAME_EVENTS.BATTLE_WON, {
                playerHealth,
                runAttackCount,
                goldStolen,
                stolenCardIds,
                battleDamageDealt: battleDamage.dealt,
                battleDamageTaken: battleDamage.taken,
            });
        });
    }

    private loseBattle (): void
    {
        if (this.battleResolved || !this.session)
        {
            return;
        }

        this.battleResolved = true;
        const runAttackCount = this.session.getRunAttackCount();
        const { goldStolen, stolenCardIds } = this.session.getRunBattleDeltas();

        this.time.delayedCall(900, () =>
        {
            this.endBattle();
            EventBus.emit(GAME_EVENTS.BATTLE_LOST, {
                runAttackCount,
                goldStolen,
                stolenCardIds,
            });
        });
    }

    shutdown (): void
    {
        this.unbindAudio?.();
        this.unbindAudio = undefined;
        this.unbindBgm?.();
        this.unbindBgm = undefined;
        this.unbindCursors?.();
        this.unbindCursors = undefined;
        unbindGameAudioScene();
        unbindGameBgmScene();

        this.scale.off('resize', this.onResize, this);
        EventBus.off(GAME_EVENTS.START_BATTLE, this.onStartBattle, this);
        EventBus.off(GAME_EVENTS.START_PUZZLE, this.onStartPuzzle, this);
        EventBus.off(GAME_EVENTS.ATTACK, this.onAttack, this);
        EventBus.off(GAME_EVENTS.END_TURN, this.onEndTurn, this);
        EventBus.off(GAME_EVENTS.REROLL_BEGIN, this.onRerollBegin, this);
        EventBus.off(GAME_EVENTS.REROLL_CONFIRM, this.onRerollConfirm, this);
        EventBus.off(GAME_EVENTS.REROLL_CANCEL, this.onRerollCancel, this);
        EventBus.off(GAME_EVENTS.CHAIN_PATH_LIT, this.onChainPathLit, this);
        EventBus.off(GAME_EVENTS.UI_OVERLAY_ACTIVE, this.onUiOverlayActive, this);
        EventBus.off(GAME_EVENTS.RUN_PHASE, this.onRunPhase, this);
        CardGameEventBus.off(CARD_GAME_EVENTS.PILES_CHANGED, this.onPilesChanged, this);
        CardGameEventBus.off(CARD_GAME_EVENTS.REROLLS_CHANGED, this.onRerollsChanged, this);
        CardGameEventBus.off(CARD_GAME_EVENTS.COMBATANTS_CHANGED, this.onCombatantsChanged, this);
        this.mapBackground?.destroy();
        this.mapBackground = undefined;
        this.endBattle();
    }

    private onPilesChanged = (
        { deckSize, discardSize, exhaustSize }: { deckSize: number; discardSize: number; exhaustSize: number },
    ): void =>
    {
        handlePilesChanged(this.battleUiSyncDeps(), { deckSize, discardSize, exhaustSize });
    };

    private onCombatantsChanged = ({
        added,
        removed,
        reason,
    }: {
        added: string[];
        removed: string[];
        reason: 'spawn' | 'shatter' | 'flee';
    }): void =>
    {
        handleCombatantsChanged({
            ...this.battleUiSyncDeps(),
            scene: this,
            added,
            removed,
            reason,
        });
    };

    private syncPileViews (): void
    {
        syncPileViews(this.battleUiSyncDeps());
    }

    private syncBoardFromSession (): void
    {
        syncBoardFromSession(this.battleUiSyncDeps());
    }

    private openPileView (kind: 'deck' | 'graveyard' | 'exhaust'): void
    {
        if (!this.session)
        {
            return;
        }

        const source = kind === 'deck'
            ? this.session.getDeckCards()
            : kind === 'exhaust'
                ? this.session.getExhaustedCards()
                : this.session.getDiscardCards();

        // Graveyard / exhaust: newest on top. Deck: order is scrambled in the overlay (alphabetical).
        const ordered = kind === 'deck' ? [ ...source ] : [ ...source ].reverse();
        const cards = ordered.map((card) =>
        {
            const definition = getCardDefinitionOrThrow(card.definitionId);

            return {
                definitionId: card.definitionId,
                label: definition.label,
                power: definition.power,
                behaviorId: definition.behaviorId,
                arrow: card.arrow,
                loopArrow: card.loopArrow,
            };
        });

        const titles = {
            deck: 'Draw Pile',
            graveyard: 'Discard Pile',
            exhaust: 'Exhaust Pile',
        } as const;

        EventBus.emit(GAME_EVENTS.PILE_VIEW_OPEN, {
            kind,
            title: titles[kind],
            cards,
        });
    }

    private onAttack = (): void =>
    {
        handleAttack(this.battleAttackFlowDeps());
    };

    private onChainPathLit = (): void =>
    {
        if (!readChainPathLitEnabled())
        {
            this.boardView?.clearChainPath();
        }

        this.emitAttackReadiness();
    };

    private onEndTurn = (): void =>
    {
        handleEndTurn(this.battleAttackFlowDeps());
    };

    private onRerollsChanged = (): void =>
    {
        this.emitRerollState();
    };

    private onRerollBegin = (): void =>
    {
        handleRerollBegin(this.rerollHandlerDeps());
    };

    private onRerollCancel = (): void =>
    {
        handleRerollCancel(this.rerollHandlerDeps());
    };

    private onRerollConfirm = (): void =>
    {
        handleRerollConfirm(this.rerollHandlerDeps());
    };

    private emitRerollState (selectedCount?: number): void
    {
        emitRerollState(this.battleUiSyncDeps(), selectedCount);
    }

    private emitAttackReadiness (): void
    {
        emitAttackReadiness(this.battleUiSyncDeps());
    }

    private onCardDropped (handIndex: number, worldX: number, worldY: number): boolean
    {
        return handleCardDropped(
            {
                session: this.session,
                boardView: this.boardView,
                emitAttackReadiness: () => this.emitAttackReadiness(),
            },
            handIndex,
            worldX,
            worldY,
        );
    }

    private onBoardCardDropped (fromSlot: SlotPosition, worldX: number, worldY: number): boolean
    {
        return handleBoardCardDropped(
            {
                session: this.session,
                boardView: this.boardView,
                handView: this.handView,
                emitAttackReadiness: () => this.emitAttackReadiness(),
            },
            fromSlot,
            worldX,
            worldY,
        );
    }
}
