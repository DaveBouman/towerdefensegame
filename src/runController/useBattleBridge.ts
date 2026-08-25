import { useEffect, type MutableRefObject, type RefObject } from 'react';
import { EventBus } from '../game/EventBus';
import { GAME_EVENTS } from '../game/events/gameEvents';
import { GAME_RULES } from '../game/cardGame/config/cardRegistry';
import type { RerollState } from '../game/cardGame/domain/types';
import { toDefinitionIds } from '../game/run/runDeck';
import type { RunDeckCard } from '../game/run/runDeck';
import { applyRunEventEffects } from '../game/run/runEvents';
import { unlockCards } from '../game/run/cardCollection';
import { unlockBodyMods } from '../game/run/bodyModBestiary';
import { getRunMaxHealth, getVictoryGoldBonus } from '../game/run/runResources';
import { getRunPuzzle, rollPuzzleCardReward } from '../game/run/runPuzzles';
import { HOT_ROUTE_VICTORY_GOLD } from '../game/run/routeModifiers';
import { getFloorForColumn, RUN_CONFIG, type RunMapNode } from '../game/run/runMap';
import { emitRunSfx } from '../game/audio/emitRunSfx';
import { emitRunBgm } from '../game/audio/emitRunBgm';
import { seedScope } from '../game/random/rng';
import type { useTutorial } from '../ui/tutorial/Tutorial';
import {
    applyBattleRunDeltas,
    buildRewardSteps,
} from './rewardHelpers';
import type {
    PendingPuzzleReward,
    PendingRewardFlow,
    PuzzleResultState,
    RunPhase,
    VisitState,
} from './types';

interface PendingBattleStart {
    enemyId?: string;
    enemyIds?: string[];
    startHealth: number;
    deck: RunDeckCard[];
    seed: number;
    bodyMods: string[];
    runAttackCount: number;
    rerollsRemaining: number;
    nodeKind?: import('../game/run/nodeKinds').RunMapNodeKind;
    ascensionLevel?: number;
    routeKind?: import('../game/run/runMap').RouteKind;
    runGold?: number;
    puzzleMode?: import('../game/cardGame/domain/CardGameSession').PuzzleModeConfig | null;
    enemyHealthMultiplier?: number;
}

interface PendingPuzzleStart {
    puzzleId: string;
    startHealth: number;
    seed: number;
    bodyMods: string[];
    runAttackCount: number;
}

export interface BattleBridgeRefs {
    seed: RefObject<string>;
    bodyMods: RefObject<string[]>;
    playerHealth: RefObject<number>;
    gold: RefObject<number>;
    deck: RefObject<RunDeckCard[]>;
    path: RefObject<string[]>;
    phase: RefObject<RunPhase>;
    currentFloor: RefObject<number>;
    floorRerolls: RefObject<number>;
    ascensionLevel: RefObject<number>;
    tutorial: RefObject<ReturnType<typeof useTutorial>>;
    sceneReady: MutableRefObject<boolean>;
    selectedNode: MutableRefObject<RunMapNode | null>;
    eventVisit: MutableRefObject<VisitState | null>;
    pendingStart: MutableRefObject<PendingBattleStart | null>;
    pendingPuzzle: MutableRefObject<PendingPuzzleStart | null>;
}

export interface BattleBridgeActions {
    setRunAttackCount: (value: number) => void;
    setActiveBattleKind: (value: import('../game/run/nodeKinds').RunMapNodeKind | null) => void;
    setCombatRecap: (value: { damageDealt: number; armorGained: number; damageTaken: number } | null) => void;
    setPlayerHealth: (value: number) => void;
    setGold: (value: number) => void;
    setDeck: (value: RunDeckCard[]) => void;
    setBodyMods: (value: string[]) => void;
    setPath: (updater: (prev: string[]) => string[]) => void;
    setRunToast: (value: string | null | ((prev: string | null) => string | null)) => void;
    setClutchVictory: (value: boolean) => void;
    setRunStats: (updater: (prev: import('../game/run/runStats').RunStats) => import('../game/run/runStats').RunStats) => void;
    setPendingRewardFlow: (value: PendingRewardFlow | null) => void;
    setPendingPuzzleReward: (value: PendingPuzzleReward | null) => void;
    setPuzzleResult: (value: PuzzleResultState | null) => void;
    setPhase: (phase: RunPhase) => void;
    setFloorRerollsRemaining: (value: number) => void;
    completeWardenVictory: () => void;
}

export const useBattleBridge = (
    refs: BattleBridgeRefs,
    actions: BattleBridgeActions,
): void =>
{
    useEffect(() =>
    {
        const onSceneReady = (): void =>
        {
            refs.sceneReady.current = true;
            emitRunBgm('glass-streets');
            EventBus.emit(GAME_EVENTS.RUN_PHASE, { phase: refs.phase.current });

            if (refs.pendingStart.current)
            {
                EventBus.emit(GAME_EVENTS.START_BATTLE, refs.pendingStart.current);
                refs.pendingStart.current = null;
            }

            if (refs.pendingPuzzle.current)
            {
                EventBus.emit(GAME_EVENTS.START_PUZZLE, refs.pendingPuzzle.current);
                refs.pendingPuzzle.current = null;
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
            actions.setRunAttackCount(nextRunAttackCount);
            actions.setActiveBattleKind(null);
            actions.setCombatRecap(null);
            const node = refs.selectedNode.current;
            const healed = Math.min(
                getRunMaxHealth(refs.bodyMods.current),
                remaining + RUN_CONFIG.healOnVictory,
            );
            const healDelta = healed - remaining;
            const hotBonus = node?.routeKind === 'hot' ? HOT_ROUTE_VICTORY_GOLD : 0;

            actions.setPlayerHealth(healed);
            const applied = applyBattleRunDeltas(
                refs.deck.current,
                refs.gold.current,
                { goldStolen, stolenCardIds },
                getVictoryGoldBonus(refs.bodyMods.current) + hotBonus,
            );
            actions.setGold(applied.gold);

            actions.setRunStats((prev) => ({
                ...prev,
                battlesWon: prev.battlesWon + 1,
                damageDealt: prev.damageDealt + battleDamageDealt,
                damageTaken: prev.damageTaken + battleDamageTaken,
                credsEarned: prev.credsEarned + Math.max(
                    0,
                    getVictoryGoldBonus(refs.bodyMods.current) + hotBonus - (goldStolen ?? 0),
                ),
                pathLength: refs.path.current.length + (node && !refs.path.current.includes(node.id) ? 1 : 0),
            }));

            if (stolenCardIds && stolenCardIds.length > 0)
            {
                actions.setDeck(applied.deck);
                unlockCards(toDefinitionIds(applied.deck));
                actions.setRunToast(`Card stolen: ${stolenCardIds.join(', ')}`);
            }

            if (goldStolen && goldStolen > 0)
            {
                actions.setRunToast((prev) =>
                    prev ? `${prev} · −${goldStolen} creds` : `−${goldStolen} creds stolen`);
            }

            refs.tutorial.current.onFirstBattleWon();

            if (healDelta > 0)
            {
                actions.setRunToast(`+${healDelta} HP after victory`);
                emitRunSfx('heal', { volume: Math.min(1, 0.75 + healDelta / 20) });
            }

            if (remaining > 0 && remaining <= 10)
            {
                actions.setClutchVictory(true);
            }

            if (hotBonus > 0)
            {
                actions.setRunToast(`Hot route bonus +${hotBonus} creds`);
            }

            if (node)
            {
                actions.setPath((prev) => (prev.includes(node.id) ? prev : [ ...prev, node.id ]));
            }

            if (node?.reward)
            {
                const steps = buildRewardSteps(
                    refs.seed.current,
                    node.id,
                    node.reward,
                    toDefinitionIds(refs.deck.current),
                    getFloorForColumn(node.row),
                    refs.bodyMods.current,
                );

                if (steps.length > 0)
                {
                    actions.setPendingRewardFlow({
                        nodeId: node.id,
                        nodeKind: node.kind,
                        steps,
                        stepIndex: 0,
                    });
                    actions.setPhase(steps[0]!.kind === 'body-mod' ? 'body-mod-reward' : 'reward');
                    return;
                }
            }

            if (node?.kind === 'boss')
            {
                actions.completeWardenVictory();
                return;
            }

            actions.setPhase('map');
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
            actions.setRunAttackCount(nextRunAttackCount);
            actions.setActiveBattleKind(null);

            if ((goldStolen && goldStolen > 0) || (stolenCardIds && stolenCardIds.length > 0))
            {
                const applied = applyBattleRunDeltas(refs.deck.current, refs.gold.current, {
                    goldStolen,
                    stolenCardIds,
                });
                actions.setGold(applied.gold);

                if (stolenCardIds && stolenCardIds.length > 0)
                {
                    actions.setDeck(applied.deck);
                    unlockCards(toDefinitionIds(applied.deck));
                }
            }

            actions.setPhase('defeat');
        };

        const onRunAttackCount = ({ runAttackCount: nextRunAttackCount }: { runAttackCount: number }): void =>
        {
            actions.setRunAttackCount(nextRunAttackCount);
        };

        const onRerollState = ({ rerollsRemaining }: RerollState): void =>
        {
            if (refs.phase.current !== 'battle')
            {
                return;
            }

            refs.floorRerolls.current = rerollsRemaining;
            actions.setFloorRerollsRemaining(rerollsRemaining);
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
                playerHealth: refs.playerHealth.current,
                maxHealth: getRunMaxHealth(refs.bodyMods.current),
                gold: refs.gold.current,
                deck: refs.deck.current,
                bodyMods: [ ...refs.bodyMods.current ],
            });

            actions.setPlayerHealth(applied.playerHealth);
            actions.setGold(applied.gold);
            actions.setDeck(applied.deck);
            unlockCards(toDefinitionIds(applied.deck));
            actions.setBodyMods(applied.bodyMods);
            unlockBodyMods(applied.bodyMods);

            if (success)
            {
                const node = refs.eventVisit.current?.node;

                if (!node)
                {
                    return;
                }

                seedScope(refs.seed.current, `puzzle-reward:${node.id}:${puzzleId}`);

                actions.setPendingPuzzleReward({
                    puzzleId,
                    nodeId: node.id,
                    options: rollPuzzleCardReward(toDefinitionIds(refs.deck.current), refs.currentFloor.current),
                    damageDealt,
                    damageTarget,
                    messages: applied.messages,
                });
                actions.setPhase('puzzle-reward');
                return;
            }

            actions.setPuzzleResult({
                puzzleId,
                success,
                damageDealt,
                damageTarget,
                messages: applied.messages,
            });
            actions.setPhase('puzzle-result');
        };

        const onCombatRecap = (recap: { damageDealt: number; armorGained: number; damageTaken: number }): void =>
        {
            if (refs.phase.current !== 'battle')
            {
                return;
            }

            actions.setCombatRecap(recap);
        };

        const onPhaseShift = ({ label, message }: { label: string; message: string }): void =>
        {
            if (refs.phase.current !== 'battle')
            {
                return;
            }

            actions.setRunToast(`${label}: ${message}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable bridge; reads refs at event time
    }, []);
};
