import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PhaserGame } from './PhaserGame';
import { GameHud } from './ui/components/GameHud';
import { PuzzleHud } from './ui/components/PuzzleHud';
import { PuzzleResultOverlay } from './ui/components/PuzzleResultOverlay';
import { RunMapOverlay } from './ui/components/RunMapOverlay';
import { RunEndOverlay } from './ui/components/RunEndOverlay';
import { CardRewardOverlay } from './ui/components/CardRewardOverlay';
import { NodeVisitOverlay } from './ui/components/NodeVisitOverlay';
import { ShopOverlay } from './ui/components/ShopOverlay';
import { RunEventOverlay } from './ui/components/RunEventOverlay';
import { PileViewOverlay } from './ui/components/PileViewOverlay';
import {
    TutorialIntroOverlay,
    TutorialCoachStrip,
    TutorialRewardTipOverlay,
    useTutorial,
} from './ui/tutorial/Tutorial';
import { isBattleKind } from './game/run/nodeKinds';
import { rollRunEventId, applyRunEventEffects } from './game/run/runEvents';
import type { AppliedEventResult, AppliedEventMessage } from './game/run/runEvents';
import { getRunPuzzle, rollPuzzleCardReward } from './game/run/runPuzzles';
import { getRunMaxHealth, getVictoryGoldBonus } from './game/run/runResources';
import { rollShopOffers, type ShopOffer } from './game/run/shop';
import { getBodyModDefinitionOrThrow } from './game/run/bodyMods';
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
import { rollCardReward, BATTLE_REWARD_RULES, PUZZLE_TRIAL_RULES, type CardReward } from './game/run/rewards';
import type { RerollState } from './game/cardGame/domain/types';
import { BodyModsPanel } from './ui/components/BodyModsPanel';
import {
    createRandomSeed,
    deriveSeed,
    normalizeSeed,
    seedScope,
} from './game/random/rng';

type RunPhase = 'map' | 'battle' | 'reward' | 'visit' | 'puzzle' | 'puzzle-result' | 'puzzle-reward' | 'victory' | 'defeat';

interface PendingReward {
    nodeId: string;
    reward: CardReward;
    options: string[];
    rerollIndex: number;
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
): string[] =>
{
    seedScope(seed, `reward:${nodeId}:${rerollIndex}`);

    return rollCardReward(reward.choiceCount, reward.pool ?? 'standard');
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
    const [ currentFloor, setCurrentFloor ] = useState(1);
    const [ floorRerollsRemaining, setFloorRerollsRemaining ] = useState(GAME_RULES.rerollsPerFloor);
    const [ phase, setPhase ] = useState<RunPhase>('map');
    const [ pendingReward, setPendingReward ] = useState<PendingReward | null>(null);
    const [ visit, setVisit ] = useState<VisitState | null>(null);
    const [ puzzleResult, setPuzzleResult ] = useState<PuzzleResultState | null>(null);
    const [ pendingPuzzleReward, setPendingPuzzleReward ] = useState<PendingPuzzleReward | null>(null);
    const tutorial = useTutorial();

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

    /** Refills floor hand-rerolls when the player first enters a higher floor. */
    const enterNodeFloor = useCallback((node: RunMapNode): number =>
    {
        const nodeFloor = getFloorForColumn(node.row);

        if (nodeFloor > currentFloorRef.current)
        {
            currentFloorRef.current = nodeFloor;
            setCurrentFloor(nodeFloor);
            floorRerollsRef.current = GAME_RULES.rerollsPerFloor;
            setFloorRerollsRemaining(GAME_RULES.rerollsPerFloor);
        }

        return floorRerollsRef.current;
    }, []);

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
        }: {
            playerHealth: number;
            runAttackCount: number;
        }): void =>
        {
            setRunAttackCount(nextRunAttackCount);
            const node = selectedNodeRef.current;
            const healed = Math.min(
                getRunMaxHealth(bodyModsRef.current),
                remaining + RUN_CONFIG.healOnVictory,
            );

            setPlayerHealth(healed);
            setGold((prev) => prev + getVictoryGoldBonus(bodyModsRef.current));
            tutorialRef.current.onFirstBattleWon();

            if (node)
            {
                setPath((prev) => (prev.includes(node.id) ? prev : [ ...prev, node.id ]));
            }

            if (node?.kind === 'boss')
            {
                setPhase('victory');
                return;
            }

            if (node && node.reward?.kind === 'card')
            {
                setPendingReward({
                    nodeId: node.id,
                    reward: node.reward,
                    options: rollRewardForNode(seedRef.current, node.id, node.reward, 0),
                    rerollIndex: 0,
                });
                setPhase('reward');
                return;
            }

            setPhase('map');
        };

        const onBattleLost = ({
            runAttackCount: nextRunAttackCount,
        }: {
            runAttackCount: number;
        }): void =>
        {
            setRunAttackCount(nextRunAttackCount);
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
            setBodyMods(applied.bodyMods);

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
                    options: rollPuzzleCardReward(),
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

        EventBus.on(GAME_EVENTS.SCENE_READY, onSceneReady);
        EventBus.on(GAME_EVENTS.BATTLE_WON, onBattleWon);
        EventBus.on(GAME_EVENTS.BATTLE_LOST, onBattleLost);
        EventBus.on(GAME_EVENTS.RUN_ATTACK_COUNT, onRunAttackCount);
        EventBus.on(GAME_EVENTS.REROLL_STATE, onRerollState);
        EventBus.on(GAME_EVENTS.PUZZLE_RESOLVED, onPuzzleResolved);

        return () =>
        {
            EventBus.off(GAME_EVENTS.SCENE_READY, onSceneReady);
            EventBus.off(GAME_EVENTS.BATTLE_WON, onBattleWon);
            EventBus.off(GAME_EVENTS.BATTLE_LOST, onBattleLost);
            EventBus.off(GAME_EVENTS.RUN_ATTACK_COUNT, onRunAttackCount);
            EventBus.off(GAME_EVENTS.REROLL_STATE, onRerollState);
            EventBus.off(GAME_EVENTS.PUZZLE_RESOLVED, onPuzzleResolved);
        };
    }, []);

    const pickNode = useCallback((node: RunMapNode): void =>
    {
        const rerollsRemaining = enterNodeFloor(node);
        const battleEnemyIds = getBattleEnemyIds(node);

        if (!isBattleKind(node.kind) || battleEnemyIds.length === 0)
        {
            if (node.kind === 'event')
            {
                if (!node.eventId)
                {
                    seedScope(seed, `event:${node.id}`);
                    node.eventId = rollRunEventId();
                }

                setVisit({ node, eventId: node.eventId });
            }
            else
            {
                seedScope(seed, `shop:${node.id}`);
                setVisit({
                    node,
                    eventId: null,
                    shopOffers: rollShopOffers(bodyMods),
                });
            }

            setPhase('visit');
            return;
        }

        selectedNodeRef.current = node;
        tutorial.onFirstBattleStart();
        const payload = {
            enemyId: battleEnemyIds[0],
            enemyIds: battleEnemyIds.length > 1 ? battleEnemyIds : undefined,
            startHealth: playerHealth,
            deck: [ ...deck ],
            seed: deriveSeed(seed, `battle:${node.id}`),
            bodyMods: [ ...bodyMods ],
            runAttackCount,
            rerollsRemaining,
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
    }, [ playerHealth, deck, seed, bodyMods, runAttackCount, enterNodeFloor, tutorial ]);

    const buyShopCard = useCallback((offer: ShopOffer): void =>
    {
        if (!offer.cardId || gold < offer.price)
        {
            return;
        }

        setGold((prev) => prev - offer.price);
        setDeck((prev) => [ ...prev, offer.cardId! ]);
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
        setPlayerHealth((prev) => Math.min(getRunMaxHealth([ ...bodyMods, offer.bodyModId! ]), prev));
    }, [ gold, bodyMods ]);

    const buyShopHeal = useCallback((offer: ShopOffer): void =>
    {
        if (gold < offer.price || !offer.healAmount)
        {
            return;
        }

        setGold((prev) => prev - offer.price);
        setPlayerHealth((prev) => Math.min(runMaxHealth, prev + offer.healAmount!));
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
    }, [ gold, deck ]);

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
        setBodyMods(result.bodyMods);
        finishVisit();
    }, [ finishVisit ]);

    const finishPuzzleReward = useCallback((chosen: string[]): void =>
    {
        if (chosen.length > 0)
        {
            setDeck((prev) => [ ...prev, ...chosen ]);
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

    const finishReward = useCallback((chosen: string[]): void =>
    {
        if (chosen.length > 0)
        {
            setDeck((prev) => [ ...prev, ...chosen ]);
        }

        setPendingReward(null);
        setPhase('map');
    }, []);

    const rerollReward = useCallback((): void =>
    {
        setPendingReward((prev) =>
        {
            if (!prev)
            {
                return prev;
            }

            const rerollIndex = prev.rerollIndex + 1;

            return {
                ...prev,
                rerollIndex,
                options: rollRewardForNode(seedRef.current, prev.nodeId, prev.reward, rerollIndex),
            };
        });
    }, []);

    const resetRun = useCallback((nextSeed: string): void =>
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
        setCurrentFloor(1);
        setFloorRerollsRemaining(GAME_RULES.rerollsPerFloor);
        currentFloorRef.current = 1;
        floorRerollsRef.current = GAME_RULES.rerollsPerFloor;
        setPendingReward(null);
        setVisit(null);
        setPuzzleResult(null);
        setPendingPuzzleReward(null);
        eventVisitRef.current = null;
        setPhase('map');
    }, []);

    const startNewRun = useCallback((): void =>
    {
        resetRun(createRandomSeed());
    }, [ resetRun ]);

    const applySeed = useCallback((input: string): void =>
    {
        resetRun(normalizeSeed(input));
    }, [ resetRun ]);

    const randomizeSeed = useCallback((): void =>
    {
        resetRun(createRandomSeed());
    }, [ resetRun ]);

    return (
        <div id="app">
            <PhaserGame />
            {bodyMods.length > 0 && phase !== 'victory' && phase !== 'defeat' && (
                <BodyModsPanel
                    bodyMods={bodyMods}
                    runAttackCount={runAttackCount}
                    className="body-mods-panel--persistent"
                />
            )}
            {phase === 'battle' && (
                <>
                    <GameHud />
                    {tutorial.showBattleCoach && (
                        <TutorialCoachStrip onDismiss={tutorial.dismissBattleCoach} />
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
            {phase === 'map' && !tutorial.showIntro && (
                <RunMapOverlay
                    map={map}
                    path={path}
                    availableIds={availableIds}
                    playerHealth={playerHealth}
                    maxHealth={runMaxHealth}
                    gold={gold}
                    currentFloor={currentFloor}
                    floorCount={RUN_CONFIG.floorCount}
                    floorRerollsRemaining={floorRerollsRemaining}
                    floorRerollsMax={GAME_RULES.rerollsPerFloor}
                    seed={seed}
                    seedEditable={path.length === 0}
                    onSeedChange={applySeed}
                    onRandomizeSeed={randomizeSeed}
                    onPick={pickNode}
                />
            )}
            {phase === 'reward' && pendingReward && (
                <CardRewardOverlay
                    options={pendingReward.options}
                    pickCount={pendingReward.reward.pickCount}
                    rerollable={pendingReward.reward.rerollable}
                    rules={BATTLE_REWARD_RULES}
                    onConfirm={finishReward}
                    onSkip={() => finishReward([])}
                    onReroll={rerollReward}
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
                    onContinue={finishVisit}
                />
            )}
            {phase === 'visit' && visit && !visit.eventId && visit.node.kind !== 'shop' && (
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
            {phase === 'victory' && <RunEndOverlay variant="victory" onRestart={startNewRun} />}
            {phase === 'defeat' && <RunEndOverlay variant="defeat" onRestart={startNewRun} />}
        </div>
    );
}

export default App;
