import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PhaserGame } from './PhaserGame';
import { GameHud } from './ui/components/GameHud';
import { RunMapOverlay } from './ui/components/RunMapOverlay';
import { RunEndOverlay } from './ui/components/RunEndOverlay';
import { CardRewardOverlay } from './ui/components/CardRewardOverlay';
import { NodeVisitOverlay } from './ui/components/NodeVisitOverlay';
import { isBattleKind } from './game/run/nodeKinds';
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

type RunPhase = 'map' | 'battle' | 'reward' | 'visit' | 'victory' | 'defeat';

interface PendingReward {
    nodeId: string;
    reward: CardReward;
    options: string[];
    rerollIndex: number;
}

const MAX_HEALTH = GAME_RULES.player.maxHealth;

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
    const [ phase, setPhase ] = useState<RunPhase>('map');
    const [ pendingReward, setPendingReward ] = useState<PendingReward | null>(null);
    const [ visitNode, setVisitNode ] = useState<RunMapNode | null>(null);

    const selectedNodeRef = useRef<RunMapNode | null>(null);
    const sceneReadyRef = useRef(false);
    const seedRef = useRef(seed);
    const pendingStartRef = useRef<
        { enemyId: string; startHealth: number; deck: string[]; seed: number } | null
    >(null);

    useEffect(() =>
    {
        seedRef.current = seed;
    }, [ seed ]);

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
        };

        const onBattleWon = ({ playerHealth: remaining }: { playerHealth: number }): void =>
        {
            const node = selectedNodeRef.current;
            const healed = Math.min(MAX_HEALTH, remaining + RUN_CONFIG.healOnVictory);

            setPlayerHealth(healed);

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

        EventBus.on(GAME_EVENTS.SCENE_READY, onSceneReady);
        EventBus.on(GAME_EVENTS.BATTLE_WON, onBattleWon);
        EventBus.on(GAME_EVENTS.BATTLE_LOST, onBattleLost);

        return () =>
        {
            EventBus.off(GAME_EVENTS.SCENE_READY, onSceneReady);
            EventBus.off(GAME_EVENTS.BATTLE_WON, onBattleWon);
            EventBus.off(GAME_EVENTS.BATTLE_LOST, onBattleLost);
        };
    }, []);

    const pickNode = useCallback((node: RunMapNode): void =>
    {
        if (!isBattleKind(node.kind) || !node.enemyId)
        {
            setVisitNode(node);
            setPhase('visit');
            return;
        }

        selectedNodeRef.current = node;
        const payload = {
            enemyId: node.enemyId,
            startHealth: playerHealth,
            deck: [ ...deck ],
            seed: deriveSeed(seed, `battle:${node.id}`),
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
    }, [ playerHealth, deck, seed ]);

    const finishVisit = useCallback((): void =>
    {
        setVisitNode((node) =>
        {
            if (node)
            {
                setPath((prev) => (prev.includes(node.id) ? prev : [ ...prev, node.id ]));
            }

            return null;
        });
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
        setPendingReward(null);
        setVisitNode(null);
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
            {phase === 'map' && (
                <RunMapOverlay
                    map={map}
                    path={path}
                    availableIds={availableIds}
                    playerHealth={playerHealth}
                    maxHealth={MAX_HEALTH}
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
            {phase === 'visit' && visitNode && (
                <NodeVisitOverlay node={visitNode} onContinue={finishVisit} />
            )}
            {phase === 'victory' && <RunEndOverlay variant="victory" onRestart={startNewRun} />}
            {phase === 'defeat' && <RunEndOverlay variant="defeat" onRestart={startNewRun} />}
        </div>
    );
}

export default App;
