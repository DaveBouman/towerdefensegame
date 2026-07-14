import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PhaserGame } from './PhaserGame';
import { GameHud } from './ui/components/GameHud';
import { PuzzleHud } from './ui/components/PuzzleHud';
import { PuzzleResultOverlay } from './ui/components/PuzzleResultOverlay';
import { RunMapOverlay } from './ui/components/RunMapOverlay';
import { RunEndOverlay } from './ui/components/RunEndOverlay';
import { CardRewardOverlay } from './ui/components/CardRewardOverlay';
import { NodeVisitOverlay } from './ui/components/NodeVisitOverlay';
import { RunEventOverlay } from './ui/components/RunEventOverlay';
import { PileViewOverlay } from './ui/components/PileViewOverlay';
import { isBattleKind } from './game/run/nodeKinds';
import { rollRunEventId, applyRunEventEffects } from './game/run/runEvents';
import type { AppliedEventResult, AppliedEventMessage } from './game/run/runEvents';
import { getRunPuzzle } from './game/run/runPuzzles';
import { getRunMaxHealth, getVictoryGoldBonus } from './game/run/runResources';
import { EventBus } from './game/EventBus';
import { GAME_EVENTS } from './game/events/gameEvents';
import { GAME_RULES } from './game/cardGame/config/cardRegistry';
import { getDefaultDeckDefinitionIds } from './game/cardGame/domain/buildPlayerDeck';
import {
    generateRunMap,
    reachableNodeIds,
    RUN_CONFIG,
    type RunMap,
    type RunMapNode,
} from './game/run/runMap';
import { rollCardReward, type CardReward } from './game/run/rewards';
import {
    createRandomSeed,
    deriveSeed,
    normalizeSeed,
    seedScope,
} from './game/random/rng';

type RunPhase = 'map' | 'battle' | 'reward' | 'visit' | 'puzzle' | 'puzzle-result' | 'victory' | 'defeat';

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
}

interface PuzzleResultState {
    puzzleId: string;
    success: boolean;
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

    return rollCardReward(reward.choiceCount);
};

function App()
{
    const [ seed, setSeed ] = useState<string>(createRandomSeed);
    const [ map, setMap ] = useState<RunMap>(() => buildMapForSeed(seed));
    const [ path, setPath ] = useState<string[]>([]);
    const [ playerHealth, setPlayerHealth ] = useState(MAX_HEALTH);
    const [ deck, setDeck ] = useState<string[]>(() => getDefaultDeckDefinitionIds());
    const [ gold, setGold ] = useState(0);
    const [ trinkets, setTrinkets ] = useState<string[]>([]);
    const [ phase, setPhase ] = useState<RunPhase>('map');
    const [ pendingReward, setPendingReward ] = useState<PendingReward | null>(null);
    const [ visit, setVisit ] = useState<VisitState | null>(null);
    const [ puzzleResult, setPuzzleResult ] = useState<PuzzleResultState | null>(null);

    const runMaxHealth = useMemo(() => getRunMaxHealth(trinkets), [ trinkets ]);

    const selectedNodeRef = useRef<RunMapNode | null>(null);
    const eventVisitRef = useRef<VisitState | null>(null);
    const sceneReadyRef = useRef(false);
    const seedRef = useRef(seed);
    const trinketsRef = useRef(trinkets);
    const playerHealthRef = useRef(playerHealth);
    const goldRef = useRef(gold);
    const deckRef = useRef(deck);
    const pendingStartRef = useRef<
        { enemyId: string; startHealth: number; deck: string[]; seed: number; trinkets: string[] } | null
    >(null);
    const pendingPuzzleRef = useRef<
        { puzzleId: string; startHealth: number; seed: number; trinkets: string[] } | null
    >(null);

    useEffect(() =>
    {
        seedRef.current = seed;
    }, [ seed ]);

    useEffect(() =>
    {
        trinketsRef.current = trinkets;
    }, [ trinkets ]);

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
            exhaustedDefinitionIds = [],
        }: {
            playerHealth: number;
            exhaustedDefinitionIds?: string[];
        }): void =>
        {
            const node = selectedNodeRef.current;
            const healed = Math.min(
                getRunMaxHealth(trinketsRef.current),
                remaining + RUN_CONFIG.healOnVictory,
            );

            setPlayerHealth(healed);
            setGold((prev) => prev + getVictoryGoldBonus(trinketsRef.current));

            if (exhaustedDefinitionIds.length > 0)
            {
                setDeck((prev) =>
                {
                    const next = [ ...prev ];

                    for (const definitionId of exhaustedDefinitionIds)
                    {
                        const index = next.indexOf(definitionId);

                        if (index >= 0)
                        {
                            next.splice(index, 1);
                        }
                    }

                    return next;
                });
            }

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

        const onBattleLost = (): void =>
        {
            setPhase('defeat');
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
            const effects = success ? puzzle.successEffects : puzzle.failureEffects;
            const applied = applyRunEventEffects(effects, {
                playerHealth: playerHealthRef.current,
                maxHealth: getRunMaxHealth(trinketsRef.current),
                gold: goldRef.current,
                deck: [ ...deckRef.current ],
                trinkets: [ ...trinketsRef.current ],
            });

            setPlayerHealth(applied.playerHealth);
            setGold(applied.gold);
            setDeck(applied.deck);
            setTrinkets(applied.trinkets);
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
        EventBus.on(GAME_EVENTS.PUZZLE_RESOLVED, onPuzzleResolved);

        return () =>
        {
            EventBus.off(GAME_EVENTS.SCENE_READY, onSceneReady);
            EventBus.off(GAME_EVENTS.BATTLE_WON, onBattleWon);
            EventBus.off(GAME_EVENTS.BATTLE_LOST, onBattleLost);
            EventBus.off(GAME_EVENTS.PUZZLE_RESOLVED, onPuzzleResolved);
        };
    }, []);

    const pickNode = useCallback((node: RunMapNode): void =>
    {
        if (!isBattleKind(node.kind) || !node.enemyId)
        {
            if (node.kind === 'event')
            {
                seedScope(seed, `event:${node.id}`);
                setVisit({ node, eventId: rollRunEventId() });
            }
            else
            {
                setVisit({ node, eventId: null });
            }

            setPhase('visit');
            return;
        }

        selectedNodeRef.current = node;
        const payload = {
            enemyId: node.enemyId,
            startHealth: playerHealth,
            deck: [ ...deck ],
            seed: deriveSeed(seed, `battle:${node.id}`),
            trinkets: [ ...trinkets ],
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
    }, [ playerHealth, deck, seed, trinkets, visit ]);

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
            trinkets: [ ...trinkets ],
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
    }, [ visit, playerHealth, seed, trinkets ]);

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
        setTrinkets(result.trinkets);
        finishVisit();
    }, [ finishVisit ]);

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
        setTrinkets([]);
        setPendingReward(null);
        setVisit(null);
        setPuzzleResult(null);
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
            {phase === 'battle' && <GameHud />}
            {(phase === 'puzzle') && (
                <>
                    <GameHud />
                    <PuzzleHud />
                </>
            )}
            <PileViewOverlay />
            {phase === 'map' && (
                <RunMapOverlay
                    map={map}
                    path={path}
                    availableIds={availableIds}
                    playerHealth={playerHealth}
                    maxHealth={runMaxHealth}
                    gold={gold}
                    trinketCount={trinkets.length}
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
                    onConfirm={finishReward}
                    onSkip={() => finishReward([])}
                    onReroll={rerollReward}
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
                    trinkets={trinkets}
                    onFinish={finishEvent}
                    onStartPuzzle={startPuzzleFromEvent}
                />
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
            {phase === 'visit' && visit && !visit.eventId && (
                <NodeVisitOverlay node={visit.node} gold={gold} onContinue={finishVisit} />
            )}
            {phase === 'victory' && <RunEndOverlay variant="victory" onRestart={startNewRun} />}
            {phase === 'defeat' && <RunEndOverlay variant="defeat" onRestart={startNewRun} />}
        </div>
    );
}

export default App;
