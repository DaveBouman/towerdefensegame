import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PhaserGame } from './PhaserGame';
import { GameHud } from './ui/components/GameHud';
import { PuzzleHud } from './ui/components/PuzzleHud';
import { PuzzleResultOverlay } from './ui/components/PuzzleResultOverlay';
import { RunMapOverlay } from './ui/components/RunMapOverlay';
import { RunEndOverlay } from './ui/components/RunEndOverlay';
import { CardRewardOverlay } from './ui/components/CardRewardOverlay';
import { BodyModRewardOverlay } from './ui/components/BodyModRewardOverlay';
import { CombatRecapStrip } from './ui/components/CombatRecapStrip';
import { FloorBriefingOverlay } from './ui/components/FloorBriefingOverlay';
import { NodeVisitOverlay } from './ui/components/NodeVisitOverlay';
import { ShopOverlay } from './ui/components/ShopOverlay';
import { RunEventOverlay } from './ui/components/RunEventOverlay';
import { RestOverlay } from './ui/components/RestOverlay';
import { PileViewOverlay } from './ui/components/PileViewOverlay';
import {
    TutorialIntroOverlay,
    TutorialCoachStrip,
    TutorialOffChainTipOverlay,
    TutorialRewardTipOverlay,
    useTutorial,
} from './ui/tutorial/Tutorial';
import { RunToast } from './ui/components/RunToast';
import { FloorBanner } from './ui/components/FloorBanner';
import { BattleIntroOverlay } from './ui/components/BattleIntroOverlay';
import { GameMenuButton } from './ui/components/GameMenuButton';
import { MainMenuOverlay } from './ui/components/MainMenuOverlay';
import { emitRunSfx } from './game/audio/emitRunSfx';
import { emitRunBgm } from './game/audio/emitRunBgm';
import { resolveRunBgmTrack } from './game/audio/bgmManifest';
import type { RunMapNodeKind } from './game/run/nodeKinds';
import { isBattleKind } from './game/run/nodeKinds';
import { applyRunEventEffects } from './game/run/runEvents';
import { resolveSignalVisit } from './game/run/signalEncounter';
import type { AppliedEventResult, AppliedEventMessage } from './game/run/runEvents';
import { getRunPuzzle, rollPuzzleCardReward } from './game/run/runPuzzles';
import { getRunMaxHealth, getVictoryGoldBonus } from './game/run/runResources';
import { rollShopOffers, type ShopOffer } from './game/run/shop';
import {
    ensureStarterCollectionUnlocks,
    unlockCards,
} from './game/run/cardCollection';
import { unlockEnemies } from './game/run/enemyBestiary';
import { unlockBodyMods } from './game/run/bodyModBestiary';
import { getBodyModDefinitionOrThrow } from './game/run/bodyMods';
import { upgradeFirstCardInDeck } from './game/run/cardUpgrades';
import { EventBus } from './game/EventBus';
import { GAME_EVENTS } from './game/events/gameEvents';
import { GAME_RULES } from './game/cardGame/config/cardRegistry';
import { getDefaultDeckDefinitionIds } from './game/cardGame/domain/buildPlayerDeck';
import {
    generateRunMap,
    reachableNodeIds,
    getBattleEnemyIds,
    getFloorForColumn,
    RUN_CONFIG,
    type RunMap,
    type RunMapNode,
} from './game/run/runMap';
import { rollCardReward, BATTLE_REWARD_RULES, PUZZLE_TRIAL_RULES, flattenRunReward, getCardSynergyHint, type CardReward, type RunReward } from './game/run/rewards';
import { rollBattleBodyModReward, type BodyModRewardPool } from './game/run/bodyMods';
import { readRunAscensionLevel, recordAscensionClear } from './game/run/ascension';
import { HOT_ROUTE_VICTORY_GOLD } from './game/run/routeModifiers';
import { getFloorBriefing } from './game/run/floorBriefings';
import { createEmptyRunStats, type RunStats } from './game/run/runStats';
import { scoreDeckArchetypes } from './game/run/deckArchetypes';
import type { RerollState } from './game/cardGame/domain/types';
import { BodyModsPanel } from './ui/components/BodyModsPanel';
import {
    createRandomSeed,
    deriveSeed,
    normalizeSeed,
    seedScope,
} from './game/random/rng';

type RunPhase = 'menu' | 'map' | 'battle' | 'reward' | 'body-mod-reward' | 'visit' | 'puzzle' | 'puzzle-result' | 'puzzle-reward' | 'victory' | 'defeat';

type RewardStep =
    | { kind: 'card'; reward: CardReward; options: string[]; rerollIndex: number }
    | { kind: 'body-mod'; pool: BodyModRewardPool; options: string[] };

interface PendingRewardFlow {
    nodeId: string;
    nodeKind: RunMapNodeKind;
    steps: RewardStep[];
    stepIndex: number;
}

const MAX_HEALTH = GAME_RULES.player.maxHealth;

interface VisitState {
    node: RunMapNode;
    eventId: string | null;
    shopOffers?: ShopOffer[];
}

interface PuzzleResultState {
    puzzleId: string;
    success: boolean;
    damageDealt: number;
    damageTarget: number;
    messages: AppliedEventMessage[];
}

interface PendingPuzzleReward {
    puzzleId: string;
    nodeId: string;
    options: string[];
    damageDealt: number;
    damageTarget: number;
    messages: AppliedEventMessage[];
}

/** Reseeds the map stream for a run seed and generates a fresh map. */
const buildMapForSeed = (seed: string): RunMap =>
{
    seedScope(seed, 'map');

    return generateRunMap();
};

/** Deterministic card choices for a node's reward at a given reroll index. */
const rollRewardForNode = (
    seed: string,
    nodeId: string,
    reward: CardReward,
    rerollIndex: number,
    deckDefinitionIds: readonly string[],
    floor: number,
): string[] =>
{
    seedScope(seed, `reward:${nodeId}:${rerollIndex}`);

    return rollCardReward(reward.choiceCount, reward.pool ?? 'standard', {
        deckDefinitionIds,
        floor,
    });
};

const buildRewardSteps = (
    seed: string,
    nodeId: string,
    reward: RunReward,
    deckDefinitionIds: readonly string[],
    floor: number,
    ownedBodyMods: readonly string[],
): RewardStep[] =>
{
    const steps: RewardStep[] = [];

    for (const step of flattenRunReward(reward))
    {
        if (step.kind === 'card')
        {
            steps.push({
                kind: 'card',
                reward: step,
                options: rollRewardForNode(seed, nodeId, step, 0, deckDefinitionIds, floor),
                rerollIndex: 0,
            });
            continue;
        }

        if (step.kind === 'body-mod')
        {
            seedScope(seed, `reward:${nodeId}:mod:${steps.length}`);
            const modId = rollBattleBodyModReward(step.pool ?? 'standard', ownedBodyMods);

            if (modId)
            {
                steps.push({
                    kind: 'body-mod',
                    pool: step.pool ?? 'standard',
                    options: [ modId ],
                });
            }
        }
    }

    return steps;
};

const applyBattleRunDeltas = (
    deck: string[],
    gold: number,
    deltas: { goldStolen?: number; stolenCardIds?: readonly string[] },
    victoryGoldBonus = 0,
): { deck: string[]; gold: number } =>
{
    let nextDeck = deck;

    if (deltas.stolenCardIds && deltas.stolenCardIds.length > 0)
    {
        nextDeck = [ ...deck ];

        for (const cardId of deltas.stolenCardIds)
        {
            const index = nextDeck.indexOf(cardId);

            if (index >= 0)
            {
                nextDeck.splice(index, 1);
            }
        }
    }

    return {
        deck: nextDeck,
        gold: gold + victoryGoldBonus - (deltas.goldStolen ?? 0),
    };
};

function App()
{
    const [ seed, setSeed ] = useState<string>(createRandomSeed);
    const [ map, setMap ] = useState<RunMap>(() => buildMapForSeed(seed));
    const [ path, setPath ] = useState<string[]>([]);
    const [ playerHealth, setPlayerHealth ] = useState(MAX_HEALTH);
    const [ deck, setDeck ] = useState<string[]>(() => getDefaultDeckDefinitionIds());
    const [ gold, setGold ] = useState(0);
    const [ bodyMods, setBodyMods ] = useState<string[]>([]);
    const [ runAttackCount, setRunAttackCount ] = useState(0);
    const [ signalsVisited, setSignalsVisited ] = useState(0);
    const [ currentFloor, setCurrentFloor ] = useState(1);
    const [ floorRerollsRemaining, setFloorRerollsRemaining ] = useState(GAME_RULES.rerollsPerFloor);
    const [ phase, setPhase ] = useState<RunPhase>('menu');
    const [ departingNodeId, setDepartingNodeId ] = useState<string | null>(null);
    const [ floorBanner, setFloorBanner ] = useState<number | null>(null);
    const [ runToast, setRunToast ] = useState<string | null>(null);
    const [ battleIntroKind, setBattleIntroKind ] = useState<RunMapNodeKind | null>(null);
    const [ activeBattleKind, setActiveBattleKind ] = useState<RunMapNodeKind | null>(null);
    const [ ascensionLevel, setAscensionLevel ] = useState(readRunAscensionLevel);
    const [ ascensionUnlockedToast, setAscensionUnlockedToast ] = useState<number | null>(null);
    const [ runStats, setRunStats ] = useState<RunStats>(() => createEmptyRunStats(readRunAscensionLevel()));
    const [ floorBriefing, setFloorBriefing ] = useState<number | null>(null);
    const [ combatRecap, setCombatRecap ] = useState<{ damageDealt: number; armorGained: number; damageTaken: number } | null>(null);
    const [ clutchVictory, setClutchVictory ] = useState(false);
    const [ pendingRewardFlow, setPendingRewardFlow ] = useState<PendingRewardFlow | null>(null);
    const [ visit, setVisit ] = useState<VisitState | null>(null);
    const [ puzzleResult, setPuzzleResult ] = useState<PuzzleResultState | null>(null);
    const [ pendingPuzzleReward, setPendingPuzzleReward ] = useState<PendingPuzzleReward | null>(null);
    const [ pauseMenuOpen, setPauseMenuOpen ] = useState(false);
    const tutorial = useTutorial();

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
            blockPileInspection: pauseMenuOpen
                || (phase === 'battle'
                    && (tutorial.showBattleCoach || tutorial.showOffChainTip)),
        });
    }, [ phase, pauseMenuOpen, tutorial.showBattleCoach, tutorial.showOffChainTip ]);

    useEffect(() =>
    {
        if (!sceneReadyRef.current)
        {
            return;
        }

        EventBus.emit(GAME_EVENTS.RUN_PHASE, { phase });
    }, [ phase ]);

    const runMaxHealth = useMemo(() => getRunMaxHealth(bodyMods), [ bodyMods ]);

    const selectedNodeRef = useRef<RunMapNode | null>(null);
    const eventVisitRef = useRef<VisitState | null>(null);
    const sceneReadyRef = useRef(false);
    const seedRef = useRef(seed);
    const bodyModsRef = useRef(bodyMods);
    const playerHealthRef = useRef(playerHealth);
    const goldRef = useRef(gold);
    const deckRef = useRef(deck);
    const phaseRef = useRef(phase);
    const currentFloorRef = useRef(currentFloor);
    const floorRerollsRef = useRef(floorRerollsRemaining);
    const ascensionLevelRef = useRef(ascensionLevel);
    const tutorialRef = useRef(tutorial);
    const pendingStartRef = useRef<
        {
            enemyId?: string;
            enemyIds?: string[];
            startHealth: number;
            deck: string[];
            seed: number;
            bodyMods: string[];
            runAttackCount: number;
            rerollsRemaining: number;
            nodeKind?: RunMapNodeKind;
            ascensionLevel?: number;
            routeKind?: import('./game/run/runMap').RouteKind;
        } | null
    >(null);
    const pendingBattleRef = useRef<
        {
            node: RunMapNode;
            battleEnemyIds: string[];
            rerollsRemaining: number;
        } | null
    >(null);
    const pendingPuzzleRef = useRef<
        { puzzleId: string; startHealth: number; seed: number; bodyMods: string[]; runAttackCount: number } | null
    >(null);

    useEffect(() =>
    {
        seedRef.current = seed;
    }, [ seed ]);

    useEffect(() =>
    {
        bodyModsRef.current = bodyMods;
    }, [ bodyMods ]);

    useEffect(() =>
    {
        playerHealthRef.current = playerHealth;
    }, [ playerHealth ]);

    useEffect(() =>
    {
        goldRef.current = gold;
    }, [ gold ]);

    useEffect(() =>
    {
        deckRef.current = deck;
    }, [ deck ]);

    useEffect(() =>
    {
        phaseRef.current = phase;
    }, [ phase ]);

    useEffect(() =>
    {
        currentFloorRef.current = currentFloor;
    }, [ currentFloor ]);

    useEffect(() =>
    {
        floorRerollsRef.current = floorRerollsRemaining;
    }, [ floorRerollsRemaining ]);

    useEffect(() =>
    {
        tutorialRef.current = tutorial;
    }, [ tutorial ]);

    useEffect(() =>
    {
        ascensionLevelRef.current = ascensionLevel;
    }, [ ascensionLevel ]);

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

    /** Refills floor hand-rerolls when the player first enters a higher floor. */
    const enterNodeFloor = useCallback((node: RunMapNode): number =>
    {
        const nodeFloor = getFloorForColumn(node.row);

        if (nodeFloor > currentFloorRef.current)
        {
            currentFloorRef.current = nodeFloor;
            setCurrentFloor(nodeFloor);
            setFloorBanner(nodeFloor);

            if (getFloorBriefing(nodeFloor))
            {
                setFloorBriefing(nodeFloor);
            }

            floorRerollsRef.current = GAME_RULES.rerollsPerFloor;
            setFloorRerollsRemaining(GAME_RULES.rerollsPerFloor);
        }

        return floorRerollsRef.current;
    }, []);

    useEffect(() =>
    {
        if (phase === 'reward' || phase === 'puzzle-reward')
        {
            emitRunSfx('reward', { volume: 1 });
        }
    }, [ phase ]);

    useEffect(() =>
    {
        if (floorBanner !== null)
        {
            emitRunSfx('floor-enter', { volume: 0.95 });
        }
    }, [ floorBanner ]);

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

    const currentNodeId = path.length > 0 ? path[path.length - 1]! : null;
    const availableIds = useMemo(
        () => reachableNodeIds(map, currentNodeId),
        [ map, currentNodeId ],
    );

    useEffect(() =>
    {
        const onSceneReady = (): void =>
        {
            sceneReadyRef.current = true;
            emitRunBgm('glass-streets');
            EventBus.emit(GAME_EVENTS.RUN_PHASE, { phase: phaseRef.current });

            if (pendingStartRef.current)
            {
                EventBus.emit(GAME_EVENTS.START_BATTLE, pendingStartRef.current);
                pendingStartRef.current = null;
            }

            if (pendingPuzzleRef.current)
            {
                EventBus.emit(GAME_EVENTS.START_PUZZLE, pendingPuzzleRef.current);
                pendingPuzzleRef.current = null;
            }
        };

        const onBattleWon = ({
            playerHealth: remaining,
            runAttackCount: nextRunAttackCount,
            goldStolen,
            stolenCardIds,
            battleDamageDealt = 0,
            battleDamageTaken = 0,
        }: {
            playerHealth: number;
            runAttackCount: number;
            goldStolen?: number;
            stolenCardIds?: readonly string[];
            battleDamageDealt?: number;
            battleDamageTaken?: number;
        }): void =>
        {
            setRunAttackCount(nextRunAttackCount);
            setActiveBattleKind(null);
            setCombatRecap(null);
            const node = selectedNodeRef.current;
            const healed = Math.min(
                getRunMaxHealth(bodyModsRef.current),
                remaining + RUN_CONFIG.healOnVictory,
            );
            const healDelta = healed - remaining;
            const hotBonus = node?.routeKind === 'hot' ? HOT_ROUTE_VICTORY_GOLD : 0;

            setPlayerHealth(healed);
            const applied = applyBattleRunDeltas(
                deckRef.current,
                goldRef.current,
                { goldStolen, stolenCardIds },
                getVictoryGoldBonus(bodyModsRef.current) + hotBonus,
            );
            setGold(applied.gold);

        setRunStats((prev) => ({
            ...prev,
            battlesWon: prev.battlesWon + 1,
            damageDealt: prev.damageDealt + battleDamageDealt,
            damageTaken: prev.damageTaken + battleDamageTaken,
            credsEarned: prev.credsEarned + Math.max(
                0,
                getVictoryGoldBonus(bodyModsRef.current) + hotBonus - (goldStolen ?? 0),
            ),
            pathLength: path.length + (node && !path.includes(node.id) ? 1 : 0),
        }));

            if (stolenCardIds && stolenCardIds.length > 0)
            {
                setDeck(applied.deck);
                unlockCards(applied.deck);
                setRunToast(`Card stolen: ${stolenCardIds.join(', ')}`);
            }

            if (goldStolen && goldStolen > 0)
            {
                setRunToast((prev) =>
                    prev ? `${prev} · −${goldStolen} creds` : `−${goldStolen} creds stolen`);
            }

            tutorialRef.current.onFirstBattleWon();

            if (healDelta > 0)
            {
                setRunToast(`+${healDelta} HP after victory`);
                emitRunSfx('heal', { volume: Math.min(1, 0.75 + healDelta / 20) });
            }

            if (remaining > 0 && remaining <= 10)
            {
                setClutchVictory(true);
            }

            if (hotBonus > 0)
            {
                setRunToast(`Hot route bonus +${hotBonus} creds`);
            }

            if (node)
            {
                setPath((prev) => (prev.includes(node.id) ? prev : [ ...prev, node.id ]));
            }

            if (node?.reward)
            {
                const steps = buildRewardSteps(
                    seedRef.current,
                    node.id,
                    node.reward,
                    deckRef.current,
                    currentFloorRef.current,
                    bodyModsRef.current,
                );

                if (steps.length > 0)
                {
                    setPendingRewardFlow({
                        nodeId: node.id,
                        nodeKind: node.kind,
                        steps,
                        stepIndex: 0,
                    });
                    setPhase(steps[0]!.kind === 'body-mod' ? 'body-mod-reward' : 'reward');
                    return;
                }
            }

            if (node?.kind === 'boss')
            {
                completeWardenVictory();
                return;
            }

            setPhase('map');
        };

        const onBattleLost = ({
            runAttackCount: nextRunAttackCount,
            goldStolen,
            stolenCardIds,
        }: {
            runAttackCount: number;
            goldStolen?: number;
            stolenCardIds?: readonly string[];
        }): void =>
        {
            setRunAttackCount(nextRunAttackCount);
            setActiveBattleKind(null);

            if ((goldStolen && goldStolen > 0) || (stolenCardIds && stolenCardIds.length > 0))
            {
                const applied = applyBattleRunDeltas(deckRef.current, goldRef.current, {
                    goldStolen,
                    stolenCardIds,
                });
                setGold(applied.gold);

                if (stolenCardIds && stolenCardIds.length > 0)
                {
                    setDeck(applied.deck);
                    unlockCards(applied.deck);
                }
            }

            setPhase('defeat');
        };

        const onRunAttackCount = ({
            runAttackCount: nextRunAttackCount,
        }: {
            runAttackCount: number;
        }): void =>
        {
            setRunAttackCount(nextRunAttackCount);
        };

        const onRerollState = ({ rerollsRemaining }: RerollState): void =>
        {
            if (phaseRef.current !== 'battle')
            {
                return;
            }

            floorRerollsRef.current = rerollsRemaining;
            setFloorRerollsRemaining(rerollsRemaining);
        };

        const onPuzzleResolved = ({
            puzzleId,
            success,
            damageDealt,
            damageTarget,
        }: {
            puzzleId: string;
            success: boolean;
            damageDealt: number;
            damageTarget: number;
        }): void =>
        {
            const puzzle = getRunPuzzle(puzzleId);
            const effects = (success ? puzzle.successEffects : puzzle.failureEffects)
                .filter((effect) => effect.kind !== 'add-card');
            const applied = applyRunEventEffects(effects, {
                playerHealth: playerHealthRef.current,
                maxHealth: getRunMaxHealth(bodyModsRef.current),
                gold: goldRef.current,
                deck: [ ...deckRef.current ],
                bodyMods: [ ...bodyModsRef.current ],
            });

            setPlayerHealth(applied.playerHealth);
            setGold(applied.gold);
            setDeck(applied.deck);
            unlockCards(applied.deck);
            setBodyMods(applied.bodyMods);
            unlockBodyMods(applied.bodyMods);

            if (success)
            {
                const node = eventVisitRef.current?.node;

                if (!node)
                {
                    return;
                }

                seedScope(seedRef.current, `puzzle-reward:${node.id}:${puzzleId}`);

                setPendingPuzzleReward({
                    puzzleId,
                    nodeId: node.id,
                    options: rollPuzzleCardReward(deckRef.current, currentFloorRef.current),
                    damageDealt,
                    damageTarget,
                    messages: applied.messages,
                });
                setPhase('puzzle-reward');
                return;
            }

            setPuzzleResult({
                puzzleId,
                success,
                damageDealt,
                damageTarget,
                messages: applied.messages,
            });
            setPhase('puzzle-result');
        };

        const onCombatRecap = (recap: { damageDealt: number; armorGained: number; damageTaken: number }): void =>
        {
            if (phaseRef.current !== 'battle')
            {
                return;
            }

            setCombatRecap(recap);
        };

        const onPhaseShift = ({ label, message }: { label: string; message: string }): void =>
        {
            if (phaseRef.current !== 'battle')
            {
                return;
            }

            setRunToast(`${label}: ${message}`);
        };

        EventBus.on(GAME_EVENTS.SCENE_READY, onSceneReady);
        EventBus.on(GAME_EVENTS.BATTLE_WON, onBattleWon);
        EventBus.on(GAME_EVENTS.BATTLE_LOST, onBattleLost);
        EventBus.on(GAME_EVENTS.RUN_ATTACK_COUNT, onRunAttackCount);
        EventBus.on(GAME_EVENTS.REROLL_STATE, onRerollState);
        EventBus.on(GAME_EVENTS.PUZZLE_RESOLVED, onPuzzleResolved);
        EventBus.on(GAME_EVENTS.COMBAT_RECAP, onCombatRecap);
        EventBus.on(GAME_EVENTS.PHASE_SHIFT, onPhaseShift);

        return () =>
        {
            EventBus.off(GAME_EVENTS.SCENE_READY, onSceneReady);
            EventBus.off(GAME_EVENTS.BATTLE_WON, onBattleWon);
            EventBus.off(GAME_EVENTS.BATTLE_LOST, onBattleLost);
            EventBus.off(GAME_EVENTS.RUN_ATTACK_COUNT, onRunAttackCount);
            EventBus.off(GAME_EVENTS.REROLL_STATE, onRerollState);
            EventBus.off(GAME_EVENTS.PUZZLE_RESOLVED, onPuzzleResolved);
            EventBus.off(GAME_EVENTS.COMBAT_RECAP, onCombatRecap);
            EventBus.off(GAME_EVENTS.PHASE_SHIFT, onPhaseShift);
        };
    }, []);

    const startBattleForNode = useCallback((
        node: RunMapNode,
        battleEnemyIds: string[],
        rerollsRemaining: number,
    ): void =>
    {
        selectedNodeRef.current = node;
        setActiveBattleKind(node.kind);
        tutorial.onFirstBattleStart();
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
                node.eventId = outcome.eventId;
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
                        shopOffers: rollShopOffers(bodyMods, deck, currentFloor),
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
    }, [ deck, seed, bodyMods, runAttackCount, signalsVisited, enterNodeFloor, tutorial, currentFloor, startBattleForNode ]);

    const buyShopCard = useCallback((offer: ShopOffer): void =>
    {
        if (!offer.cardId || gold < offer.price)
        {
            return;
        }

        setGold((prev) => prev - offer.price);
        setDeck((prev) => [ ...prev, offer.cardId! ]);
        unlockCards([ offer.cardId! ]);
        emitRunSfx('shop-buy', { volume: 0.95 });
    }, [ gold ]);

    const buyShopBodyMod = useCallback((offer: ShopOffer): void =>
    {
        if (!offer.bodyModId || gold < offer.price || bodyMods.includes(offer.bodyModId))
        {
            return;
        }

        getBodyModDefinitionOrThrow(offer.bodyModId);
        setGold((prev) => prev - offer.price);
        setBodyMods((prev) => [ ...prev, offer.bodyModId! ]);
        unlockBodyMods([ offer.bodyModId! ]);
        setPlayerHealth((prev) => Math.min(getRunMaxHealth([ ...bodyMods, offer.bodyModId! ]), prev));
        emitRunSfx('shop-buy', { volume: 0.95 });
    }, [ gold, bodyMods ]);

    const buyShopHeal = useCallback((offer: ShopOffer): void =>
    {
        if (gold < offer.price || !offer.healAmount)
        {
            return;
        }

        setGold((prev) => prev - offer.price);
        setPlayerHealth((prev) => Math.min(runMaxHealth, prev + offer.healAmount!));
        emitRunSfx('shop-buy', { volume: 0.95 });
        emitRunSfx('heal', { volume: 0.85 });
    }, [ gold, runMaxHealth ]);

    const buyShopRemove = useCallback((offer: ShopOffer, definitionId: string): void =>
    {
        if (gold < offer.price)
        {
            return;
        }

        const index = deck.indexOf(definitionId);

        if (index < 0)
        {
            return;
        }

        setGold((prev) => prev - offer.price);
        setDeck((prev) =>
        {
            const next = [ ...prev ];
            const removeAt = next.indexOf(definitionId);

            if (removeAt >= 0)
            {
                next.splice(removeAt, 1);
            }

            return next;
        });
        emitRunSfx('shop-buy', { volume: 0.95 });
    }, [ gold, deck ]);

    const buyShopUpgrade = useCallback((offer: ShopOffer, definitionId: string): void =>
    {
        if (gold < offer.price)
        {
            return;
        }

        const nextDeck = upgradeFirstCardInDeck(deck, definitionId);

        if (!nextDeck)
        {
            return;
        }

        setGold((prev) => prev - offer.price);
        setDeck(nextDeck);
        emitRunSfx('shop-buy', { volume: 0.95 });
    }, [ gold, deck ]);

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

    const finishPuzzleResult = useCallback((): void =>
    {
        const node = eventVisitRef.current?.node;

        if (node)
        {
            setPath((prev) => (prev.includes(node.id) ? prev : [ ...prev, node.id ]));
        }

        eventVisitRef.current = null;
        setPuzzleResult(null);
        setPhase('map');
    }, []);

    const finishEvent = useCallback((result: AppliedEventResult): void =>
    {
        setPlayerHealth(result.playerHealth);
        setGold(result.gold);
        setDeck(result.deck);
        unlockCards(result.deck);
        setBodyMods(result.bodyMods);
        unlockBodyMods(result.bodyMods);
        finishVisit();
    }, [ finishVisit ]);

    const finishPuzzleReward = useCallback((chosen: string[]): void =>
    {
        if (chosen.length > 0)
        {
            setDeck((prev) => [ ...prev, ...chosen ]);
            unlockCards(chosen);
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

    const finishReward = useCallback((chosen: string[]): void =>
    {
        if (chosen.length > 0)
        {
            setDeck((prev) => [ ...prev, ...chosen ]);
            unlockCards(chosen);
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
                    deckRef.current,
                    currentFloorRef.current,
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
        setDeck(getDefaultDeckDefinitionIds());
        setGold(0);
        setBodyMods([]);
        setRunAttackCount(0);
        setSignalsVisited(0);
        setCurrentFloor(1);
        setFloorRerollsRemaining(GAME_RULES.rerollsPerFloor);
        currentFloorRef.current = 1;
        floorRerollsRef.current = GAME_RULES.rerollsPerFloor;
        setAscensionLevel(readRunAscensionLevel());
        setRunStats(createEmptyRunStats(readRunAscensionLevel()));
        setFloorBriefing(null);
        setCombatRecap(null);
        setPendingRewardFlow(null);
        setVisit(null);
        setPuzzleResult(null);
        setPendingPuzzleReward(null);
        eventVisitRef.current = null;
        setDepartingNodeId(null);
        setFloorBanner(null);
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
        resetRun(normalizeSeed(nextSeed ?? createRandomSeed()), 'map');
    }, [ resetRun ]);

    const returnToMenu = useCallback((): void =>
    {
        setPauseMenuOpen(false);
        resetRun(createRandomSeed(), 'menu');
    }, [ resetRun ]);

    const closePauseMenu = useCallback((): void =>
    {
        setPauseMenuOpen(false);
    }, []);

    const togglePauseMenu = useCallback((): void =>
    {
        setPauseMenuOpen((open) => !open);
    }, []);

    const startRunFromMenu = useCallback((nextSeed: string): void =>
    {
        resetRun(normalizeSeed(nextSeed), 'map');
    }, [ resetRun ]);

    const currentRewardStep = pendingRewardFlow?.steps[pendingRewardFlow.stepIndex];
    const deckArchetypeScores = useMemo(() => scoreDeckArchetypes(deck), [ deck ]);
    const rewardSynergyHints = useMemo(() =>
    {
        if (!currentRewardStep || currentRewardStep.kind !== 'card')
        {
            return undefined;
        }

        const hints: Record<string, string> = {};

        for (const optionId of currentRewardStep.options)
        {
            const hint = getCardSynergyHint(optionId, deck);

            if (hint)
            {
                hints[optionId] = hint;
            }
        }

        return hints;
    }, [ currentRewardStep, deck ]);

    const combatRecapLines = combatRecap
        ? [
            { label: 'Damage dealt', value: String(combatRecap.damageDealt), tone: 'good' as const },
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

    return (
        <div
            id="app"
            className={[
                appPhaseClass,
                lowHealth && phase !== 'victory' && phase !== 'defeat' ? 'app--low-hp' : '',
            ].filter(Boolean).join(' ') || undefined}
        >
            <PhaserGame />
            {phase !== 'victory' && phase !== 'defeat' && phase !== 'menu' && (
                <GameMenuButton open={pauseMenuOpen} onClick={togglePauseMenu} />
            )}
            {bodyMods.length > 0 && phase !== 'victory' && phase !== 'defeat' && phase !== 'menu' && (
                <BodyModsPanel
                    bodyMods={bodyMods}
                    runAttackCount={runAttackCount}
                    className="body-mods-panel--persistent"
                />
            )}
            {phase === 'menu' && (
                <MainMenuOverlay
                    mode="boot"
                    seed={seed}
                    onStart={startRunFromMenu}
                    onReplayTutorial={tutorial.replayTutorial}
                />
            )}
            {pauseMenuOpen && phase !== 'menu' && phase !== 'victory' && phase !== 'defeat' && (
                <MainMenuOverlay
                    mode="pause"
                    seed={seed}
                    onStart={closePauseMenu}
                    onResume={closePauseMenu}
                    onNewRun={startNewRun}
                    onReplayTutorial={tutorial.replayTutorial}
                />
            )}
            {phase === 'battle' && (
                <>
                    <GameHud />
                    <CombatRecapStrip lines={combatRecapLines} />
                    {tutorial.showBattleCoach && (
                        <TutorialCoachStrip onDismiss={tutorial.dismissBattleCoach} />
                    )}
                    {tutorial.showOffChainTip && (
                        <TutorialOffChainTipOverlay onDismiss={tutorial.dismissOffChainTip} />
                    )}
                </>
            )}
            {(phase === 'puzzle') && (
                <>
                    <GameHud />
                    <PuzzleHud />
                </>
            )}
            <PileViewOverlay />
            {phase === 'map' && tutorial.showIntro && (
                <TutorialIntroOverlay onDismiss={tutorial.dismissIntro} />
            )}
            {tutorial.showRewardTip && (
                <TutorialRewardTipOverlay onDismiss={tutorial.dismissRewardTip} />
            )}
            {floorBriefing !== null && getFloorBriefing(floorBriefing) && (
                <FloorBriefingOverlay
                    floor={floorBriefing}
                    briefing={getFloorBriefing(floorBriefing)!}
                    onDismiss={() => setFloorBriefing(null)}
                />
            )}
            {floorBanner !== null && (
                <FloorBanner floor={floorBanner} onDone={() => setFloorBanner(null)} />
            )}
            {runToast && (
                <RunToast message={runToast} tone="good" onDone={() => setRunToast(null)} />
            )}
            {battleIntroKind && (
                <BattleIntroOverlay nodeKind={battleIntroKind} onDone={finishBattleIntro} />
            )}
            {phase === 'map' && !tutorial.showIntro && (
                <RunMapOverlay
                    map={map}
                    path={path}
                    availableIds={availableIds}
                    departingNodeId={departingNodeId}
                    playerHealth={playerHealth}
                    maxHealth={runMaxHealth}
                    gold={gold}
                    currentFloor={currentFloor}
                    floorCount={RUN_CONFIG.floorCount}
                    floorRerollsRemaining={floorRerollsRemaining}
                    floorRerollsMax={GAME_RULES.rerollsPerFloor}
                    ascensionLevel={ascensionLevel}
                    seed={seed}
                    onPick={pickNode}
                />
            )}
            {phase === 'reward' && currentRewardStep?.kind === 'card' && (
                <CardRewardOverlay
                    options={currentRewardStep.options}
                    pickCount={currentRewardStep.reward.pickCount}
                    rerollable={currentRewardStep.reward.rerollable}
                    rules={BATTLE_REWARD_RULES}
                    eyebrow={pendingRewardFlow?.nodeKind === 'semi-boss' ? 'Lieutenant spoils' : 'Victory spoils'}
                    subtitle={deckArchetypeScores.dominant
                        ? `Deck specialty: ${deckArchetypeScores.dominant.charAt(0).toUpperCase()}${deckArchetypeScores.dominant.slice(1)}`
                        : undefined}
                    synergyHints={rewardSynergyHints}
                    onConfirm={finishReward}
                    onSkip={() => finishReward([])}
                    onReroll={rerollReward}
                />
            )}
            {phase === 'body-mod-reward' && currentRewardStep?.kind === 'body-mod' && (
                <BodyModRewardOverlay
                    options={currentRewardStep.options}
                    eyebrow={pendingRewardFlow?.nodeKind === 'boss' ? 'Warden body mod' : 'Lieutenant body mod'}
                    title={pendingRewardFlow?.nodeKind === 'boss'
                        ? 'Claim the Gatekeeper Seal'
                        : 'Install a body mod'}
                    subtitle="Permanent for the rest of the run."
                    onConfirm={finishBodyModReward}
                />
            )}
            {phase === 'puzzle-reward' && pendingPuzzleReward && (
                <CardRewardOverlay
                    eyebrow="Trial passed"
                    title="Choose a card reward"
                    subtitle={`Dealt ${pendingPuzzleReward.damageDealt} / ${pendingPuzzleReward.damageTarget} damage.`}
                    rules={PUZZLE_TRIAL_RULES}
                    options={pendingPuzzleReward.options}
                    pickCount={1}
                    rerollable={false}
                    onConfirm={finishPuzzleReward}
                />
            )}
            {phase === 'visit' && visit && visit.eventId && (
                <RunEventOverlay
                    eventId={visit.eventId}
                    nodeId={visit.node.id}
                    seed={seed}
                    playerHealth={playerHealth}
                    maxHealth={runMaxHealth}
                    gold={gold}
                    deck={deck}
                    bodyMods={bodyMods}
                    onFinish={finishEvent}
                    onStartPuzzle={startPuzzleFromEvent}
                />
            )}
            {phase === 'visit' && visit && !visit.eventId && visit.node.kind === 'rest' && (
                <RestOverlay
                    deck={deck}
                    playerHealth={playerHealth}
                    maxHealth={runMaxHealth}
                    onRest={restHeal}
                    onUpgrade={restUpgrade}
                    onContinue={finishVisit}
                />
            )}
            {phase === 'visit' && visit && !visit.eventId && visit.node.kind === 'shop' && visit.shopOffers && (
                <ShopOverlay
                    offers={visit.shopOffers}
                    gold={gold}
                    deck={deck}
                    playerHealth={playerHealth}
                    maxHealth={runMaxHealth}
                    onBuyCard={buyShopCard}
                    onBuyBodyMod={buyShopBodyMod}
                    onBuyHeal={buyShopHeal}
                    onBuyRemove={buyShopRemove}
                    onBuyUpgrade={buyShopUpgrade}
                    onContinue={finishVisit}
                />
            )}
            {phase === 'visit' && visit && !visit.eventId && visit.node.kind !== 'shop' && visit.node.kind !== 'rest' && (
                <NodeVisitOverlay node={visit.node} gold={gold} onContinue={finishVisit} />
            )}
            {phase === 'puzzle-result' && puzzleResult && (
                <PuzzleResultOverlay
                    puzzleId={puzzleResult.puzzleId}
                    success={puzzleResult.success}
                    damageDealt={puzzleResult.damageDealt}
                    damageTarget={puzzleResult.damageTarget}
                    messages={puzzleResult.messages}
                    onContinue={finishPuzzleResult}
                />
            )}
            {phase === 'victory' && (
                <RunEndOverlay
                    variant="victory"
                    clutch={clutchVictory}
                    stats={runStats}
                    unlockedAscension={ascensionUnlockedToast}
                    onRestart={startNewRun}
                    onMainMenu={returnToMenu}
                />
            )}
            {phase === 'defeat' && (
                <RunEndOverlay
                    variant="defeat"
                    stats={{ ...runStats, pathLength: path.length }}
                    onRestart={startNewRun}
                    onMainMenu={returnToMenu}
                />
            )}
        </div>
    );
}

export default App;
