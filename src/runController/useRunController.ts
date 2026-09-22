import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventBus } from '../game/EventBus';
import { GAME_EVENTS } from '../game/events/gameEvents';
import { GAME_RULES } from '../game/cardGame/config/cardRegistry';
import { buildDefaultRunDeck } from '../game/cardGame/domain/buildPlayerDeck';
import {
    applyDirectionPicksToDeck,
    toDefinitionIds,
    type RunDeckCard,
} from '../game/run/runDeck';
import {
    createRandomSeed,
    deriveSeed,
    normalizeSeed,
    seedScope,
} from '../game/random/rng';
import { emitRunSfx } from '../game/audio/emitRunSfx';
import { emitRunBgm } from '../game/audio/emitRunBgm';
import { resolveRunBgmTrack } from '../game/audio/bgmManifest';
import type { RunMapNodeKind } from '../game/run/nodeKinds';
import { isBattleKind } from '../game/run/nodeKinds';
import type { AppliedEventResult } from '../game/run/runEvents';
import { unlockCards, ensureStarterCollectionUnlocks } from '../game/run/cardCollection';
import { unlockBodyMods } from '../game/run/bodyModBestiary';
import { unlockEnemies } from '../game/run/enemyBestiary';
import { upgradeFirstCardInDeck } from '../game/run/cardUpgrades';
import { readRunAscensionLevel, recordAscensionClear } from '../game/run/ascension';
import { resetAllSavedData } from '../game/meta/resetAllSavedData';
import { createEmptyRunStats, type RunStats } from '../game/run/runStats';
import { scoreDeckArchetypes } from '../game/run/deckArchetypes';
import { getCardSynergyHint } from '../game/run/rewards';
import { getRunMaxHealth } from '../game/run/runResources';
import { rollShopOffers } from '../game/run/shop';
import { createShopPurchaseHandlers } from './shopHandlers';
import { planFinishEvent } from './finishEventFlow';
import {
    getBattleEnemyIds,
    getFloorForColumn,
    reachableNodeIds,
    RUN_CONFIG,
    type RunMap,
    type RunMapNode,
} from '../game/run/runMap';
import { resolveSignalVisit } from '../game/run/signalEncounter';
import { useTutorial } from '../ui/tutorial/Tutorial';
import { TUTORIAL_WIZARD_PUZZLE_ID } from '../game/run/tutorialWizard';
import {
    buildMapForSeed,
    rollRewardForNode,
} from './rewardHelpers';
import { useBattleBridge } from './useBattleBridge';
import { useShowcaseCapture } from './useShowcaseCapture';
import type {
    CombatRecapLine,
    PendingCardDirectionFlow,
    PendingPuzzleReward,
    PendingRewardFlow,
    PuzzleResultState,
    RunPhase,
    SkirmishResultState,
    VisitState,
} from './types';
import { MAX_HEALTH } from './types';
import { getSkirmishEncounter } from '../game/run/skirmishEncounters';
import {
    bodyModsFromHomeLoot,
    buildLoopKit,
    getLoopEncounter,
    LOOP_MAP_STEPS,
    rollLoopLootOffers,
    rollStationCardOffers,
    stationAtStep,
    type LoopLootDef,
    type LoopStationCardOffer,
} from '../game/run/loopRun';

export const useRunController = () =>
{
    const [ seed, setSeed ] = useState<string>(createRandomSeed);
    const [ map, setMap ] = useState<RunMap>(() => buildMapForSeed(seed));
    const [ path, setPath ] = useState<string[]>([]);
    const [ playerHealth, setPlayerHealth ] = useState(MAX_HEALTH);
    const [ deck, setDeck ] = useState<RunDeckCard[]>(() => buildDefaultRunDeck());
    const [ gold, setGold ] = useState(0);
    const [ bodyMods, setBodyMods ] = useState<string[]>([]);
    const [ runAttackCount, setRunAttackCount ] = useState(0);
    const [ signalsVisited, setSignalsVisited ] = useState(0);
    const [ currentFloor, setCurrentFloor ] = useState(1);
    const [ floorRerollsRemaining, setFloorRerollsRemaining ] = useState(GAME_RULES.rerollsPerFloor);
    const [ phase, setPhase ] = useState<RunPhase>('menu');
    const [ departingNodeId, setDepartingNodeId ] = useState<string | null>(null);
    const [ runToast, setRunToast ] = useState<string | null>(null);
    const [ battleIntroKind, setBattleIntroKind ] = useState<RunMapNodeKind | null>(null);
    const [ activeBattleKind, setActiveBattleKind ] = useState<RunMapNodeKind | null>(null);
    const [ ascensionLevel, setAscensionLevel ] = useState(readRunAscensionLevel);
    const [ ascensionUnlockedToast, setAscensionUnlockedToast ] = useState<number | null>(null);
    const [ runStats, setRunStats ] = useState<RunStats>(() => createEmptyRunStats(readRunAscensionLevel()));
    const lieutenantRerollsRefilledRef = useRef(false);
    const [ combatRecap, setCombatRecap ] = useState<{ damageDealt: number; armorGained: number; damageTaken: number } | null>(null);
    const [ clutchVictory, setClutchVictory ] = useState(false);
    const [ pendingRewardFlow, setPendingRewardFlow ] = useState<PendingRewardFlow | null>(null);
    const [ visit, setVisit ] = useState<VisitState | null>(null);
    const [ puzzleResult, setPuzzleResult ] = useState<PuzzleResultState | null>(null);
    const [ skirmishResult, setSkirmishResult ] = useState<SkirmishResultState | null>(null);
    const [ pendingSkirmishId, setPendingSkirmishId ] = useState<string | null>(null);
    const [ homeLootIds, setHomeLootIds ] = useState<string[]>([]);
    const [ loopLootOffers, setLoopLootOffers ] = useState<LoopLootDef[] | null>(null);
    const [ loopLootDungeon, setLoopLootDungeon ] = useState(false);
    const [ loopCardOffers, setLoopCardOffers ] = useState<LoopStationCardOffer[] | null>(null);
    const [ loopWalkerStep, setLoopWalkerStep ] = useState(0);
    const [ loopClearedSteps, setLoopClearedSteps ] = useState<number[]>([]);
    const [ loopMapDungeon, setLoopMapDungeon ] = useState(false);
    const [ pendingPuzzleReward, setPendingPuzzleReward ] = useState<PendingPuzzleReward | null>(null);
    const [ pendingCardDirectionFlow, setPendingCardDirectionFlow ] = useState<PendingCardDirectionFlow | null>(null);
    const [ pauseMenuOpen, setPauseMenuOpen ] = useState(false);
    const tutorial = useTutorial();

    const selectedNodeRef = useRef<RunMapNode | null>(null);
    const eventVisitRef = useRef<VisitState | null>(null);
    const skirmishEncounterIdRef = useRef<string | null>(null);
    const loopActiveRef = useRef(false);
    const loopDungeonRef = useRef(false);
    const pendingStationStepRef = useRef<number | null>(null);
    const loopCardPendingAllClearRef = useRef(false);
    const sceneReadyRef = useRef(false);
    const seedRef = useRef(seed);
    const bodyModsRef = useRef(bodyMods);
    const playerHealthRef = useRef(playerHealth);
    const goldRef = useRef(gold);
    const deckRef = useRef(deck);
    const pathRef = useRef(path);
    const phaseRef = useRef(phase);
    const currentFloorRef = useRef(currentFloor);
    const floorRerollsRef = useRef(floorRerollsRemaining);
    const ascensionLevelRef = useRef(ascensionLevel);
    const tutorialRef = useRef(tutorial);
    const pendingStartRef = useRef<{
        enemyId?: string;
        enemyIds?: string[];
        startHealth: number;
        deck: RunDeckCard[];
        seed: number;
        bodyMods: string[];
        runAttackCount: number;
        rerollsRemaining: number;
        nodeKind?: RunMapNodeKind;
        ascensionLevel?: number;
        routeKind?: import('../game/run/runMap').RouteKind;
        runGold?: number;
        roadTiles?: readonly import('../game/cardGame/domain/types').SlotPosition[];
        loopPrep?: boolean;
    } | null>(null);
    const pendingBattleRef = useRef<{ node: RunMapNode; battleEnemyIds: string[]; rerollsRemaining: number } | null>(null);
    const pendingPuzzleRef = useRef<{
        puzzleId: string;
        startHealth: number;
        seed: number;
        bodyMods: string[];
        runAttackCount: number;
    } | null>(null);

    useEffect(() => { seedRef.current = seed; }, [ seed ]);
    useEffect(() => { bodyModsRef.current = bodyMods; }, [ bodyMods ]);
    useEffect(() => { playerHealthRef.current = playerHealth; }, [ playerHealth ]);
    useEffect(() => { goldRef.current = gold; }, [ gold ]);
    useEffect(() => { deckRef.current = deck; }, [ deck ]);
    useEffect(() => { pathRef.current = path; }, [ path ]);
    useEffect(() => { phaseRef.current = phase; }, [ phase ]);
    useEffect(() => { currentFloorRef.current = currentFloor; }, [ currentFloor ]);
    useEffect(() => { floorRerollsRef.current = floorRerollsRemaining; }, [ floorRerollsRemaining ]);
    useEffect(() => { tutorialRef.current = tutorial; }, [ tutorial ]);
    useEffect(() => { ascensionLevelRef.current = ascensionLevel; }, [ ascensionLevel ]);

    useEffect(() =>
    {
        ensureStarterCollectionUnlocks();
    }, []);

    useEffect(() =>
    {
        if (phase === 'menu' || phase === 'victory' || phase === 'defeat')
        {
            setPauseMenuOpen(false);
        }
    }, [ phase ]);

    useEffect(() =>
    {
        EventBus.emit(GAME_EVENTS.UI_OVERLAY_ACTIVE, {
            blockPileInspection: pauseMenuOpen || tutorial.showMapTip || tutorial.showRewardTip,
        });
    }, [ pauseMenuOpen, tutorial.showMapTip, tutorial.showRewardTip ]);

    useEffect(() =>
    {
        if (!sceneReadyRef.current)
        {
            return;
        }

        EventBus.emit(GAME_EVENTS.RUN_PHASE, { phase });
    }, [ phase ]);

    useEffect(() =>
    {
        if (phase === 'reward' || phase === 'puzzle-reward')
        {
            emitRunSfx('reward', { volume: 1 });
        }
    }, [ phase ]);

    useEffect(() =>
    {
        if (battleIntroKind)
        {
            emitRunSfx('boss-intro', {
                volume: battleIntroKind === 'boss' ? 1 : 0.9,
            });
        }
    }, [ battleIntroKind ]);

    useEffect(() =>
    {
        emitRunBgm(resolveRunBgmTrack({
            phase,
            battleIntroKind,
            activeBattleKind,
            battleMusicIndex: path.length,
        }));
    }, [ phase, battleIntroKind, activeBattleKind, path.length ]);

    const runMaxHealth = useMemo(() => getRunMaxHealth(bodyMods), [ bodyMods ]);

    const completeWardenVictory = useCallback((): void =>
    {
        const level = ascensionLevelRef.current;
        const unlocked = recordAscensionClear(level);

        if (unlocked > level)
        {
            setAscensionUnlockedToast(unlocked);
        }

        setAscensionLevel(unlocked);
        setPhase('victory');
    }, []);

    const enterNodeFloor = useCallback((node: RunMapNode): number =>
    {
        if (node.row > RUN_CONFIG.semiBossRow && !lieutenantRerollsRefilledRef.current)
        {
            lieutenantRerollsRefilledRef.current = true;
            floorRerollsRef.current = GAME_RULES.rerollsPerFloor;
            setFloorRerollsRemaining(GAME_RULES.rerollsPerFloor);
        }

        return floorRerollsRef.current;
    }, []);

    const onTutorialWizardComplete = useCallback((): void =>
    {
        tutorial.onWizardComplete();
    }, [ tutorial ]);

    const restartTutorialWizard = useCallback((): void =>
    {
        const payload = {
            puzzleId: TUTORIAL_WIZARD_PUZZLE_ID,
            startHealth: playerHealthRef.current,
            seed: deriveSeed(seedRef.current, 'tutorial-wizard-retry'),
            bodyMods: [] as string[],
            runAttackCount: 0,
        };

        EventBus.emit(GAME_EVENTS.START_PUZZLE, payload);
    }, []);

    const onLoopBattleWon = useCallback((dungeon: boolean): void =>
    {
        const step = pendingStationStepRef.current;
        pendingStationStepRef.current = null;

        setLoopClearedSteps((prev) =>
        {
            const next = step !== null && !prev.includes(step) ? [ ...prev, step ] : prev;
            const encounter = getLoopEncounter(dungeon);
            const allClear = encounter.stations.every((station) => next.includes(station.stepIndex));

            loopCardPendingAllClearRef.current = allClear;
            setLoopLootDungeon(dungeon);
            seedScope(seedRef.current, `loop-card:${dungeon ? 'dungeon' : 'surface'}:${next.length}`);
            setLoopCardOffers(rollStationCardOffers());
            setPhase('loop-card-reward');

            return next;
        });
    }, []);

    const onLoopBattleLost = useCallback((): void =>
    {
        pendingStationStepRef.current = null;
        EventBus.emit(GAME_EVENTS.LOOP_RESUME_PREP);
        setRunToast('You fell — board unlocked. Rearrange, then try the station again.');
        setPhase('loop-map');
    }, []);

    const takeStationCard = useCallback((offer: LoopStationCardOffer): void =>
    {
        if (!offer.arrow)
        {
            return;
        }

        const card = { definitionId: offer.definitionId, arrow: offer.arrow };
        setDeck((prev) => [ ...prev, card ]);
        EventBus.emit(GAME_EVENTS.LOOP_GAIN_CARD, card);
        setLoopCardOffers(null);

        const allClear = loopCardPendingAllClearRef.current;
        loopCardPendingAllClearRef.current = false;
        const dungeon = loopLootDungeon;

        if (allClear)
        {
            EventBus.emit(GAME_EVENTS.LOOP_FINISH);
            seedScope(seedRef.current, `loop-loot:${dungeon ? 'dungeon' : 'surface'}`);
            setLoopLootOffers(rollLoopLootOffers(dungeon));
            setPhase('loop-loot');
            setRunToast(`Gained ${offer.label} (${offer.arrow}) — loop clear, pick loot.`);
            return;
        }

        EventBus.emit(GAME_EVENTS.LOOP_RESUME_PREP);
        setPhase('loop-map');
        setRunToast(`Gained ${offer.label} (${offer.arrow}) — rearrange, then keep walking.`);
    }, [ loopLootDungeon ]);
    useBattleBridge(
        {
            seed: seedRef,
            bodyMods: bodyModsRef,
            playerHealth: playerHealthRef,
            gold: goldRef,
            deck: deckRef,
            path: pathRef,
            phase: phaseRef,
            currentFloor: currentFloorRef,
            floorRerolls: floorRerollsRef,
            ascensionLevel: ascensionLevelRef,
            tutorial: tutorialRef,
            sceneReady: sceneReadyRef,
            selectedNode: selectedNodeRef,
            eventVisit: eventVisitRef,
            pendingStart: pendingStartRef,
            pendingPuzzle: pendingPuzzleRef,
            skirmishEncounterId: skirmishEncounterIdRef,
            loopActive: loopActiveRef,
            loopDungeon: loopDungeonRef,
        },
        {
            setRunAttackCount,
            setActiveBattleKind,
            setCombatRecap,
            setPlayerHealth,
            setGold,
            setDeck,
            setBodyMods,
            setPath,
            setRunToast,
            setClutchVictory,
            setRunStats,
            setPendingRewardFlow,
            setPendingPuzzleReward,
            setPuzzleResult,
            setSkirmishResult,
            setPhase,
            setFloorRerollsRemaining,
            completeWardenVictory,
            onTutorialWizardComplete,
            restartTutorialWizard,
            onLoopBattleWon,
            onLoopBattleLost,
        },
    );

    useShowcaseCapture({
        setPhase,
        setMap,
        setPath,
        setPlayerHealth,
        setGold,
        setDeck,
        setBodyMods,
        setVisit,
        setPendingRewardFlow,
        setBattleIntroKind,
        sceneReadyRef,
        pendingStartRef,
        pendingPuzzleRef,
        bodyMods,
        runAttackCount,
    });

    const startBattleForNode = useCallback((
        node: RunMapNode,
        battleEnemyIds: string[],
        rerollsRemaining: number,
    ): void =>
    {
        selectedNodeRef.current = node;
        setActiveBattleKind(node.kind);
        unlockEnemies(battleEnemyIds);
        const payload = {
            enemyId: battleEnemyIds[0],
            enemyIds: battleEnemyIds.length > 1 ? battleEnemyIds : undefined,
            startHealth: playerHealth,
            deck: [ ...deck ],
            seed: deriveSeed(seed, `battle:${node.id}`),
            bodyMods: [ ...bodyMods ],
            runAttackCount,
            rerollsRemaining,
            nodeKind: node.kind,
            runGold: goldRef.current,
            ascensionLevel,
            routeKind: node.routeKind,
        };
        setPhase('battle');

        if (sceneReadyRef.current)
        {
            EventBus.emit(GAME_EVENTS.START_BATTLE, payload);
        }
        else
        {
            pendingStartRef.current = payload;
        }
    }, [ playerHealth, deck, seed, bodyMods, runAttackCount, tutorial, ascensionLevel ]);

    const finishBattleIntro = useCallback((): void =>
    {
        const pending = pendingBattleRef.current;

        setBattleIntroKind(null);

        if (pending)
        {
            startBattleForNode(pending.node, pending.battleEnemyIds, pending.rerollsRemaining);
            pendingBattleRef.current = null;
        }
    }, [ startBattleForNode ]);

    const pickNode = useCallback((node: RunMapNode): void =>
    {
        emitRunSfx('ui-select', { volume: 0.78 });
        setDepartingNodeId(node.id);
        const rerollsRemaining = enterNodeFloor(node);
        let battleEnemyIds = getBattleEnemyIds(node);

        const finishTravel = (callback: () => void, delayMs: number): void =>
        {
            window.setTimeout(() =>
            {
                setDepartingNodeId(null);
                callback();
            }, delayMs);
        };

        if (node.kind === 'event')
        {
            seedScope(seed, `signal:${node.id}`);
            const outcome = resolveSignalVisit(signalsVisited, node.row);
            setSignalsVisited((prev) => prev + 1);

            if (outcome.kind === 'ambush')
            {
                node.enemyId = outcome.enemyId;
                node.enemyIds = outcome.enemyIds;
                node.reward = outcome.reward;
                battleEnemyIds = getBattleEnemyIds(node);
            }
            else
            {
                finishTravel(() =>
                {
                    setVisit({ node, eventId: outcome.eventId });
                    setPhase('visit');
                }, 280);

                return;
            }
        }

        const isSignalAmbush = node.kind === 'event' && battleEnemyIds.length > 0;

        if (!isBattleKind(node.kind) && !isSignalAmbush)
        {
            finishTravel(() =>
            {
                if (node.kind === 'shop')
                {
                    seedScope(seed, `shop:${node.id}`);
                    setVisit({
                        node,
                        eventId: null,
                        shopOffers: rollShopOffers(bodyMods, toDefinitionIds(deck), getFloorForColumn(node.row)),
                    });
                }
                else if (node.kind === 'rest')
                {
                    setVisit({ node, eventId: null });
                }

                setPhase('visit');
            }, 280);

            return;
        }

        if (battleEnemyIds.length === 0)
        {
            setDepartingNodeId(null);

            return;
        }

        finishTravel(() =>
        {
            emitRunSfx('map-travel', { volume: 0.82 });

            if (node.kind === 'semi-boss' || node.kind === 'boss')
            {
                pendingBattleRef.current = { node, battleEnemyIds, rerollsRemaining };
                setBattleIntroKind(node.kind);

                return;
            }

            startBattleForNode(node, battleEnemyIds, rerollsRemaining);
        }, 380);
    }, [ deck, seed, bodyMods, signalsVisited, enterNodeFloor, startBattleForNode ]);

    const shopHandlers = useMemo(
        () => createShopPurchaseHandlers(() => ({
            gold,
            deck,
            bodyMods,
            playerHealth,
            runMaxHealth,
            setGold,
            setDeck,
            setBodyMods,
            setPlayerHealth,
        })),
        [ gold, deck, bodyMods, playerHealth, runMaxHealth ],
    );

    const {
        confirmShopCardPurchase,
        buyShopBodyMod,
        buyShopHeal,
        buyShopRemove,
        buyShopReroute,
        buyShopUpgrade,
    } = shopHandlers;

    const restHeal = useCallback((healAmount: number): void =>
    {
        setPlayerHealth((prev) => Math.min(runMaxHealth, prev + healAmount));
        emitRunSfx('heal', { volume: Math.min(1, 0.75 + healAmount / 25) });
    }, [ runMaxHealth ]);

    const restUpgrade = useCallback((definitionId: string): void =>
    {
        const nextDeck = upgradeFirstCardInDeck(deck, definitionId);

        if (nextDeck)
        {
            setDeck(nextDeck);
        }
    }, [ deck ]);

    const finishVisit = useCallback((): void =>
    {
        setVisit((current) =>
        {
            if (current?.node)
            {
                setPath((prev) => (prev.includes(current.node.id) ? prev : [ ...prev, current.node.id ]));
            }

            return null;
        });
        setPhase('map');
    }, []);

    const startPuzzleFromEvent = useCallback((puzzleId: string): void =>
    {
        const currentVisit = visit;

        if (!currentVisit)
        {
            return;
        }

        eventVisitRef.current = currentVisit;
        setVisit(null);

        const payload = {
            puzzleId,
            startHealth: playerHealth,
            seed: deriveSeed(seed, `puzzle:${currentVisit.node.id}:${puzzleId}`),
            bodyMods: [ ...bodyMods ],
            runAttackCount,
        };
        setPhase('puzzle');

        if (sceneReadyRef.current)
        {
            EventBus.emit(GAME_EVENTS.START_PUZZLE, payload);
        }
        else
        {
            pendingPuzzleRef.current = payload;
        }
    }, [ visit, playerHealth, seed, bodyMods, runAttackCount ]);

    const finishPuzzleResult = useCallback((): void =>
    {
        const node = eventVisitRef.current?.node;

        if (!node)
        {
            setPuzzleResult(null);
            setPhase('puzzle-select');
            return;
        }

        setPath((prev) => (prev.includes(node.id) ? prev : [ ...prev, node.id ]));
        eventVisitRef.current = null;
        setPuzzleResult(null);
        setPhase('map');
    }, []);

    const startPuzzleFromSelect = useCallback((puzzleId: string): void =>
    {
        eventVisitRef.current = null;
        setPuzzleResult(null);
        setSkirmishResult(null);
        setPendingSkirmishId(null);
        skirmishEncounterIdRef.current = null;

        const payload = {
            puzzleId,
            startHealth: MAX_HEALTH,
            seed: deriveSeed(seed, `gallery:${puzzleId}`),
            bodyMods: [] as string[],
            runAttackCount: 0,
        };
        setPlayerHealth(MAX_HEALTH);
        setPhase('puzzle');

        if (sceneReadyRef.current)
        {
            EventBus.emit(GAME_EVENTS.START_PUZZLE, payload);
        }
        else
        {
            pendingPuzzleRef.current = payload;
        }
    }, [ seed ]);

    const confirmSkirmishKit = useCallback((definitionIds: string[]): void =>
    {
        if (!pendingSkirmishId)
        {
            return;
        }

        const encounter = getSkirmishEncounter(pendingSkirmishId);
        const kitDeck: RunDeckCard[] = definitionIds.map((definitionId) => ({ definitionId }));

        selectedNodeRef.current = null;
        skirmishEncounterIdRef.current = encounter.id;
        setDeck(kitDeck);
        setPlayerHealth(MAX_HEALTH);
        setBodyMods([]);
        setRunAttackCount(0);
        unlockEnemies([ encounter.enemyId ]);

        const payload = {
            enemyId: encounter.enemyId,
            startHealth: MAX_HEALTH,
            deck: kitDeck,
            seed: deriveSeed(seed, `skirmish:${encounter.id}`),
            bodyMods: [] as string[],
            runAttackCount: 0,
            rerollsRemaining: 0,
            nodeKind: 'enemy' as const,
            runGold: 0,
            ascensionLevel: 0,
        };

        setPendingSkirmishId(null);
        setActiveBattleKind('enemy');
        setPhase('battle');

        if (sceneReadyRef.current)
        {
            EventBus.emit(GAME_EVENTS.START_BATTLE, payload);
        }
        else
        {
            pendingStartRef.current = payload;
        }
    }, [ pendingSkirmishId, seed ]);

    const finishSkirmishResult = useCallback((): void =>
    {
        setSkirmishResult(null);
        setPuzzleResult(null);
        setPhase('puzzle-select');
    }, []);

    const cancelSkirmishKit = useCallback((): void =>
    {
        setPendingSkirmishId(null);
        setPhase('puzzle-select');
    }, []);

    const startLoopWalk = useCallback((dungeon: boolean): void =>
    {
        const encounter = getLoopEncounter(dungeon);
        const kit = buildLoopKit(encounter, homeLootIds);
        const mods = bodyModsFromHomeLoot(homeLootIds);

        loopDungeonRef.current = dungeon;
        loopActiveRef.current = false;
        pendingStationStepRef.current = null;
        selectedNodeRef.current = null;
        skirmishEncounterIdRef.current = null;
        setLoopMapDungeon(dungeon);
        setLoopWalkerStep(0);
        setLoopClearedSteps([]);
        setDeck(kit);
        setBodyMods(mods);
        setPlayerHealth(MAX_HEALTH);
        setRunAttackCount(0);
        setActiveBattleKind('enemy');
        setPhase('loop-map');

        const payload = {
            enemyId: 'training-dummy',
            startHealth: MAX_HEALTH,
            deck: kit,
            seed: deriveSeed(seed, `loop-prep:${encounter.id}:${homeLootIds.length}`),
            bodyMods: mods,
            runAttackCount: 0,
            rerollsRemaining: GAME_RULES.rerollsPerFloor,
            nodeKind: 'enemy' as const,
            runGold: 0,
            ascensionLevel: 0,
            loopPrep: true,
        };

        if (sceneReadyRef.current)
        {
            EventBus.emit(GAME_EVENTS.START_BATTLE, payload);
        }
        else
        {
            pendingStartRef.current = payload;
        }
    }, [ homeLootIds, seed ]);

    const advanceLoopStep = useCallback((): void =>
    {
        setLoopWalkerStep((prev) => (prev + 1) % LOOP_MAP_STEPS);
    }, []);

    const fightLoopStation = useCallback((): void =>
    {
        const encounter = getLoopEncounter(loopMapDungeon);
        const station = stationAtStep(encounter, loopWalkerStep);

        if (!station || loopClearedSteps.includes(loopWalkerStep))
        {
            return;
        }

        unlockEnemies([ station.enemyId ]);
        pendingStationStepRef.current = loopWalkerStep;
        loopActiveRef.current = true;
        loopDungeonRef.current = loopMapDungeon;
        setActiveBattleKind('enemy');
        setPhase('battle');
        EventBus.emit(GAME_EVENTS.LOOP_ENGAGE, { enemyId: station.enemyId });
        setRunToast('Enemy intent shows hit timing — rearrange, then Attack to lock.');
    }, [ loopClearedSteps, loopMapDungeon, loopWalkerStep ]);

    const retreatLoopToHome = useCallback((): void =>
    {
        loopActiveRef.current = false;
        pendingStationStepRef.current = null;
        EventBus.emit(GAME_EVENTS.LOOP_FINISH);
        setActiveBattleKind(null);
        setPhase('loop-hub');
    }, []);

    const takeLoopLootHome = useCallback((lootId: string): void =>
    {
        EventBus.emit(GAME_EVENTS.LOOP_FINISH);
        setActiveBattleKind(null);
        setHomeLootIds((prev) => [ ...prev, lootId ]);
        setLoopLootOffers(null);
        setPhase('loop-hub');
    }, []);

    const openPracticeRoads = useCallback((): void =>
    {
        setPhase('puzzle-select');
    }, []);

    const finishEvent = useCallback((result: AppliedEventResult): void =>
    {
        const plan = planFinishEvent(deckRef.current, result);

        setPlayerHealth(plan.playerHealth);
        setGold(plan.gold);
        unlockCards(plan.unlockCardIds);
        setBodyMods(plan.bodyMods);
        unlockBodyMods(plan.unlockBodyModIds);
        setDeck(plan.deck);

        if (plan.needingDirection.length > 0)
        {
            setPendingCardDirectionFlow({
                definitionIds: plan.needingDirection,
                mergedDeck: plan.deck,
                onApplied: finishVisit,
            });
            return;
        }

        finishVisit();
    }, [ finishVisit ]);

    const completePendingCardDirections = useCallback((picks: RunDeckCard[]): void =>
    {
        setPendingCardDirectionFlow((flow) =>
        {
            if (!flow?.mergedDeck)
            {
                return null;
            }

            setDeck(applyDirectionPicksToDeck(flow.mergedDeck, picks));
            flow.onApplied();

            return null;
        });
    }, []);

    const finishPuzzleReward = useCallback((chosen: RunDeckCard[]): void =>
    {
        if (chosen.length > 0)
        {
            setDeck((prev) => [ ...prev, ...chosen ]);
            unlockCards(toDefinitionIds(chosen));
        }

        const node = eventVisitRef.current?.node;

        if (node)
        {
            setPath((prev) => (prev.includes(node.id) ? prev : [ ...prev, node.id ]));
        }

        eventVisitRef.current = null;
        setPendingPuzzleReward(null);
        setPhase('map');
    }, []);

    const advanceRewardFlow = useCallback((
        cardsAdded: number,
        bodyModAdded: boolean,
    ): void =>
    {
        let wardenCleared = false;

        setPendingRewardFlow((prev) =>
        {
            if (!prev)
            {
                return null;
            }

            const nextIndex = prev.stepIndex + 1;

            if (nextIndex >= prev.steps.length)
            {
                if (prev.nodeKind === 'boss')
                {
                    wardenCleared = true;
                }
                else
                {
                    setPhase('map');
                }

                return null;
            }

            const nextStep = prev.steps[nextIndex]!;

            setPhase(nextStep.kind === 'body-mod' ? 'body-mod-reward' : 'reward');

            return {
                ...prev,
                stepIndex: nextIndex,
            };
        });

        if (wardenCleared)
        {
            completeWardenVictory();
        }

        if (cardsAdded > 0)
        {
            setRunStats((stats) => ({
                ...stats,
                cardsAdded: stats.cardsAdded + cardsAdded,
            }));
        }

        if (bodyModAdded)
        {
            setRunStats((stats) => ({
                ...stats,
                bodyModsCollected: stats.bodyModsCollected + 1,
            }));
        }
    }, [ completeWardenVictory ]);

    const finishReward = useCallback((chosen: RunDeckCard[]): void =>
    {
        if (chosen.length > 0)
        {
            setDeck((prev) => [ ...prev, ...chosen ]);
            unlockCards(toDefinitionIds(chosen));
        }

        advanceRewardFlow(chosen.length, false);
    }, [ advanceRewardFlow ]);

    const finishBodyModReward = useCallback((bodyModId: string | null): void =>
    {
        if (bodyModId)
        {
            setBodyMods((prev) => (prev.includes(bodyModId) ? prev : [ ...prev, bodyModId ]));
            unlockBodyMods([ bodyModId ]);
        }

        advanceRewardFlow(0, bodyModId !== null);
    }, [ advanceRewardFlow ]);

    const rerollReward = useCallback((): void =>
    {
        setPendingRewardFlow((prev) =>
        {
            if (!prev)
            {
                return prev;
            }

            const step = prev.steps[prev.stepIndex];

            if (!step || step.kind !== 'card')
            {
                return prev;
            }

            const rerollIndex = step.rerollIndex + 1;
            const nextSteps = [ ...prev.steps ];
            nextSteps[prev.stepIndex] = {
                ...step,
                rerollIndex,
                options: rollRewardForNode(
                    seedRef.current,
                    prev.nodeId,
                    step.reward,
                    rerollIndex,
                    toDefinitionIds(deckRef.current),
                    getFloorForColumn(selectedNodeRef.current?.row ?? 0),
                ),
            };

            return {
                ...prev,
                steps: nextSteps,
            };
        });
    }, []);

    const resetRun = useCallback((nextSeed: string, nextPhase: RunPhase = 'map'): void =>
    {
        selectedNodeRef.current = null;
        setSeed(nextSeed);
        setMap(buildMapForSeed(nextSeed));
        setPath([]);
        setPlayerHealth(MAX_HEALTH);
        setDeck(buildDefaultRunDeck());
        setGold(0);
        setBodyMods([]);
        setRunAttackCount(0);
        setSignalsVisited(0);
        setCurrentFloor(1);
        setFloorRerollsRemaining(GAME_RULES.rerollsPerFloor);
        currentFloorRef.current = 1;
        floorRerollsRef.current = GAME_RULES.rerollsPerFloor;
        lieutenantRerollsRefilledRef.current = false;
        setAscensionLevel(readRunAscensionLevel());
        setRunStats(createEmptyRunStats(readRunAscensionLevel()));
        setCombatRecap(null);
        setPendingRewardFlow(null);
        setVisit(null);
        setPuzzleResult(null);
        setSkirmishResult(null);
        setPendingSkirmishId(null);
        setHomeLootIds([]);
        setLoopLootOffers(null);
        setLoopLootDungeon(false);
        setLoopWalkerStep(0);
        setLoopClearedSteps([]);
        setLoopMapDungeon(false);
        setPendingPuzzleReward(null);
        setPendingCardDirectionFlow(null);
        eventVisitRef.current = null;
        skirmishEncounterIdRef.current = null;
        loopActiveRef.current = false;
        loopDungeonRef.current = false;
        pendingStationStepRef.current = null;
        setDepartingNodeId(null);
        setRunToast(null);
        setBattleIntroKind(null);
        setActiveBattleKind(null);
        setClutchVictory(false);
        setAscensionUnlockedToast(null);
        pendingBattleRef.current = null;
        setPhase(nextPhase);
    }, []);

    const startNewRun = useCallback((nextSeed?: string): void =>
    {
        setPauseMenuOpen(false);
        // Button onClick may pass a MouseEvent; only treat real strings as seeds.
        const seed = typeof nextSeed === 'string' && nextSeed.trim().length > 0
            ? normalizeSeed(nextSeed)
            : createRandomSeed();
        resetRun(seed, 'loop-hub');
    }, [ resetRun ]);

    const startLegacyRun = useCallback((nextSeed?: string): void =>
    {
        setPauseMenuOpen(false);
        const seedValue = typeof nextSeed === 'string' && nextSeed.trim().length > 0
            ? normalizeSeed(nextSeed)
            : createRandomSeed();
        resetRun(seedValue, 'map');
    }, [ resetRun ]);

    const startRunFromMenu = useCallback((nextSeed: string): void =>
    {
        const normalized = normalizeSeed(nextSeed);

        if (!tutorial.needsTutorialWizard)
        {
            resetRun(normalized, 'loop-hub');
            return;
        }

        resetRun(normalized, 'puzzle');

        const payload = {
            puzzleId: TUTORIAL_WIZARD_PUZZLE_ID,
            startHealth: MAX_HEALTH,
            seed: deriveSeed(normalized, 'tutorial-wizard'),
            bodyMods: [] as string[],
            runAttackCount: 0,
        };

        if (sceneReadyRef.current)
        {
            EventBus.emit(GAME_EVENTS.START_PUZZLE, payload);
        }
        else
        {
            pendingPuzzleRef.current = payload;
        }
    }, [ resetRun, tutorial.needsTutorialWizard ]);

    const returnToMenu = useCallback((): void =>
    {
        setPauseMenuOpen(false);
        resetRun(createRandomSeed(), 'menu');
    }, [ resetRun ]);

    const resetAllProgress = useCallback((): void =>
    {
        resetAllSavedData();
        setAscensionLevel(readRunAscensionLevel());
        tutorial.replayTutorial();
        setPauseMenuOpen(false);
        resetRun(createRandomSeed(), 'menu');
    }, [ resetRun, tutorial ]);

    const closePauseMenu = useCallback((): void =>
    {
        setPauseMenuOpen(false);
    }, []);

    const togglePauseMenu = useCallback((): void =>
    {
        setPauseMenuOpen((open) => !open);
    }, []);

    const currentNodeId = path.length > 0 ? path[path.length - 1]! : null;
    const availableIds = useMemo(
        () => reachableNodeIds(map, currentNodeId),
        [ map, currentNodeId ],
    );

    const currentRewardStep = pendingRewardFlow?.steps[pendingRewardFlow.stepIndex];
    const deckArchetypeScores = useMemo(() => scoreDeckArchetypes(toDefinitionIds(deck)), [ deck ]);
    const rewardSynergyHints = useMemo(() =>
    {
        if (!currentRewardStep || currentRewardStep.kind !== 'card')
        {
            return undefined;
        }

        const hints: Record<string, string> = {};

        for (const optionId of currentRewardStep.options)
        {
            const hint = getCardSynergyHint(optionId, toDefinitionIds(deck));

            if (hint)
            {
                hints[optionId] = hint;
            }
        }

        return hints;
    }, [ currentRewardStep, deck ]);

    const combatRecapLines: CombatRecapLine[] = combatRecap
        ? [
            { label: 'Damage dealt', value: String(combatRecap.damageDealt), tone: 'good' },
            ...(combatRecap.armorGained > 0
                ? [ { label: 'Armor gained', value: `+${combatRecap.armorGained}`, tone: 'good' as const } ]
                : []),
            ...(combatRecap.damageTaken > 0
                ? [ { label: 'Damage taken', value: String(combatRecap.damageTaken), tone: 'bad' as const } ]
                : []),
        ]
        : [];

    const lowHealth = runMaxHealth > 0 && playerHealth / runMaxHealth <= 0.25;
    const appPhaseClass = `app--phase-${phase}`;

    return {
        phase,
        pauseMenuOpen,
        bodyMods,
        runAttackCount,
        seed,
        tutorial,
        map,
        path,
        playerHealth,
        runMaxHealth,
        gold,
        deck,
        currentFloor,
        floorRerollsRemaining,
        ascensionLevel,
        departingNodeId,
        availableIds,
        runToast,
        setRunToast,
        battleIntroKind,
        finishBattleIntro,
        pickNode,
        pendingRewardFlow,
        currentRewardStep,
        deckArchetypeScores,
        rewardSynergyHints,
        finishReward,
        finishBodyModReward,
        rerollReward,
        pendingPuzzleReward,
        pendingCardDirectionFlow,
        completePendingCardDirections,
        finishPuzzleReward,
        visit,
        finishEvent,
        startPuzzleFromEvent,
        startPuzzleFromSelect,
        confirmSkirmishKit,
        cancelSkirmishKit,
        finishSkirmishResult,
        pendingSkirmishId,
        skirmishResult,
        homeLootIds,
        loopLootOffers,
        loopLootDungeon,
        loopCardOffers,
        loopWalkerStep,
        loopClearedSteps,
        loopMapDungeon,
        startLoopWalk,
        advanceLoopStep,
        fightLoopStation,
        retreatLoopToHome,
        takeLoopLootHome,
        takeStationCard,
        openPracticeRoads,
        startLegacyRun,
        restHeal,
        restUpgrade,
        finishVisit,
        confirmShopCardPurchase,
        buyShopBodyMod,
        buyShopHeal,
        buyShopRemove,
        buyShopReroute,
        buyShopUpgrade,
        puzzleResult,
        finishPuzzleResult,
        clutchVictory,
        runStats,
        ascensionUnlockedToast,
        startRunFromMenu,
        closePauseMenu,
        startNewRun,
        returnToMenu,
        resetAllProgress,
        togglePauseMenu,
        combatRecapLines,
        lowHealth,
        appPhaseClass,
    };
};

export type RunController = ReturnType<typeof useRunController>;
