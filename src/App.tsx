import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PhaserGame } from './PhaserGame';
import { GameHud } from './ui/components/GameHud';
import { RunMapOverlay } from './ui/components/RunMapOverlay';
import { RunEndOverlay } from './ui/components/RunEndOverlay';
import { EventBus } from './game/EventBus';
import { GAME_EVENTS } from './game/events/gameEvents';
import { GAME_RULES } from './game/cardGame/config/cardRegistry';
import {
    generateRunMap,
    reachableNodeIds,
    RUN_CONFIG,
    type RunMap,
    type RunMapNode,
} from './game/run/runMap';

type RunPhase = 'map' | 'battle' | 'victory' | 'defeat';

const MAX_HEALTH = GAME_RULES.player.maxHealth;

function App()
{
    const [ map, setMap ] = useState<RunMap>(() => generateRunMap());
    const [ path, setPath ] = useState<string[]>([]);
    const [ playerHealth, setPlayerHealth ] = useState(MAX_HEALTH);
    const [ phase, setPhase ] = useState<RunPhase>('map');

    const selectedNodeRef = useRef<RunMapNode | null>(null);
    const sceneReadyRef = useRef(false);
    const pendingStartRef = useRef<{ enemyId: string; startHealth: number } | null>(null);

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

            setPhase(node?.isBoss ? 'victory' : 'map');
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
        selectedNodeRef.current = node;
        const payload = { enemyId: node.enemyId, startHealth: playerHealth };
        setPhase('battle');

        if (sceneReadyRef.current)
        {
            EventBus.emit(GAME_EVENTS.START_BATTLE, payload);
        }
        else
        {
            pendingStartRef.current = payload;
        }
    }, [ playerHealth ]);

    const startNewRun = useCallback((): void =>
    {
        selectedNodeRef.current = null;
        setMap(generateRunMap());
        setPath([]);
        setPlayerHealth(MAX_HEALTH);
        setPhase('map');
    }, []);

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
                    onPick={pickNode}
                />
            )}
            {phase === 'victory' && <RunEndOverlay variant="victory" onRestart={startNewRun} />}
            {phase === 'defeat' && <RunEndOverlay variant="defeat" onRestart={startNewRun} />}
        </div>
    );
}

export default App;
