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
import { getRunPuzzle, rollPuzzleCardReward } from './game/run/runPuzzles';
import { getRunMaxHealth, getVictoryGoldBonus } from './game/run/runResources';
import { EventBus } from './game/EventBus';
import { GAME_EVENTS } from './game/events/gameEvents';
import { GAME_RULES } from './game/cardGame/config/cardRegistry';
import { getDefaultDeckDefinitionIds } from './game/cardGame/domain/buildPlayerDeck';
import {
    generateRunMap,
    reachableNodeIds,
    getBattleEnemyIds,
    RUN_CONFIG,
    type RunMap,
    type RunMapNode,
} from './game/run/runMap';
import { rollCardReward, BATTLE_REWARD_RULES, PUZZLE_TRIAL_RULES, type CardReward } from './game/run/rewards';
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
    const [ bodyMods, setBodyMods ] = useState<string[]>([]);
    const [ runAttackCount, setRunAttackCount ] = useState(0);
    const [ phase, setPhase ] = useState<RunPhase>('map');
    const [ pendingReward, setPendingReward ] = useState<PendingReward | null>(null);
    const [ visit, setVisit ] = useState<VisitState | null>(null);
    const [ puzzleResult, setPuzzleResult ] = useState<PuzzleResultState | null>(null);
    const [ pendingPuzzleReward, setPendingPuzzleReward ] = useState<PendingPuzzleReward | null>(null);

    const runMaxHealth = useMemo(() => getRunMaxHealth(bodyMods), [ bodyMods ]);

    const selectedNodeRef = useRef<RunMapNode | null>(null);
    const eventVisitRef = useRef<VisitState | null>(null);
    const sceneReadyRef = useRef(false);
    const seedRef = useRef(seed);
    const bodyModsRef = useRef(bodyMods);
    const playerHealthRef = useRef(playerHealth);
    const goldRef = useRef(gold);
    const deckRef = useRef(deck);
    const pendingStartRef = useRef<
        {
            enemyId?: string;
            enemyIds?: string[];
            startHealth: number;
            deck: string[];
            seed: number;
            bodyMods: string[];
            runAttackCount: number;
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
        EventBus.on(GAME_EVENTS.PUZZLE_RESOLVED, onPuzzleResolved);

        return () =>
        {
            EventBus.off(GAME_EVENTS.SCENE_READY, onSceneReady);
            EventBus.off(GAME_EVENTS.BATTLE_WON, onBattleWon);
            EventBus.off(GAME_EVENTS.BATTLE_LOST, onBattleLost);
            EventBus.off(GAME_EVENTS.RUN_ATTACK_COUNT, onRunAttackCount);
            EventBus.off(GAME_EVENTS.PUZZLE_RESOLVED, onPuzzleResolved);
        };
    }, []);

    const pickNode = useCallback((node: RunMapNode): void =>
    {
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
                setVisit({ node, eventId: null });
            }

            setPhase('visit');
            return;
        }

        selectedNodeRef.current = node;
        const payload = {
            enemyId: battleEnemyIds[0],
            enemyIds: battleEnemyIds.length > 1 ? battleEnemyIds : undefined,
            startHealth: playerHealth,
            deck: [ ...deck ],
            seed: deriveSeed(seed, `battle:${node.id}`),
            bodyMods: [ ...bodyMods ],
            runAttackCount,
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
    }, [ playerHealth, deck, seed, bodyMods, runAttackCount, visit ]);

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
