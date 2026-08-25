import { useEffect, useRef, type MutableRefObject } from 'react';
import { EventBus } from '../game/EventBus';
import { GAME_EVENTS } from '../game/events/gameEvents';
import { GAME_RULES } from '../game/cardGame/config/cardRegistry';
import { buildMapForSeed } from './rewardHelpers';
import { toDefinitionIds } from '../game/run/runDeck';
import type { RunDeckCard } from '../game/run/runDeck';
import type { RunPhase, VisitState, PendingRewardFlow } from './types';
import type { RunMapNodeKind } from '../game/run/nodeKinds';
import {
    STEAM_CAPTURE_SEED,
    buildShowcaseCardReward,
    buildShowcaseDeck,
    buildShowcaseShopVisit,
    parseCaptureId,
    showcaseGold,
    showcasePlayerHealth,
    showcasePuzzleMode,
    SHOWCASE_BOARD_ENEMY_HP_MULTIPLIER,
    SHOWCASE_BOARD_ENEMY_ID,
} from '../game/showcase/showcaseScenarios';
import { getRunPuzzle } from '../game/run/runPuzzles';
import { deriveSeed } from '../game/random/rng';
import { SEMI_BOSS_REWARD } from '../game/run/rewards';
import { buildRewardSteps } from './rewardHelpers';

export interface ShowcaseCaptureTarget {
    setPhase: (phase: RunPhase) => void;
    setMap: (map: ReturnType<typeof buildMapForSeed>) => void;
    setPath: (path: string[]) => void;
    setPlayerHealth: (hp: number) => void;
    setGold: (gold: number) => void;
    setDeck: (deck: RunDeckCard[]) => void;
    setBodyMods: (mods: string[]) => void;
    setVisit: (visit: VisitState | null) => void;
    setPendingRewardFlow: (flow: PendingRewardFlow | null) => void;
    setBattleIntroKind: (kind: RunMapNodeKind | null) => void;
    sceneReadyRef: MutableRefObject<boolean>;
    pendingStartRef: MutableRefObject<Record<string, unknown> | null>;
    pendingPuzzleRef: MutableRefObject<Record<string, unknown> | null>;
    bodyMods: string[];
    runAttackCount: number;
}

/** Applies ?capture= on first mount — skips menu/map grind. */
export const useShowcaseCapture = (target: ShowcaseCaptureTarget): void =>
{
    const appliedRef = useRef(false);

    useEffect(() =>
    {
        if (appliedRef.current)
        {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const captureId = parseCaptureId(params.get('capture'));

        if (!captureId)
        {
            return;
        }

        const lockKey = 'signal-chain-steam-capture';
        const previous = sessionStorage.getItem(lockKey);

        if (previous === captureId)
        {
            appliedRef.current = true;

            return;
        }

        sessionStorage.setItem(lockKey, captureId);
        appliedRef.current = true;

        const deck = buildShowcaseDeck();
        const bodyMods = target.bodyMods;
        const health = showcasePlayerHealth(bodyMods);

        target.setDeck(deck);
        target.setPlayerHealth(health);
        target.setGold(showcaseGold());
        target.setBattleIntroKind(null);

        if (captureId === 'map')
        {
            target.setMap(buildMapForSeed(STEAM_CAPTURE_SEED));
            target.setPath([ 'n2-0', 'n3-1', 'n4-0' ]);
            target.setPhase('map');
            return;
        }

        if (captureId === 'shop')
        {
            target.setVisit(buildShowcaseShopVisit(bodyMods, toDefinitionIds(deck)));
            target.setPhase('visit');
            return;
        }

        if (captureId === 'reward')
        {
            target.setPendingRewardFlow(buildShowcaseCardReward(toDefinitionIds(deck)));
            target.setPhase('reward');
            return;
        }

        if (captureId === 'bodymod')
        {
            const nodeId = 'steam-capture-lieutenant';
            target.setPendingRewardFlow({
                nodeId,
                nodeKind: 'semi-boss',
                steps: buildRewardSteps(
                    STEAM_CAPTURE_SEED,
                    nodeId,
                    SEMI_BOSS_REWARD,
                    toDefinitionIds(deck),
                    2,
                    bodyMods,
                ),
                stepIndex: 1,
            });
            target.setPhase('body-mod-reward');
            return;
        }

        if (captureId === 'event')
        {
            target.setVisit({
                node: {
                    id: 'steam-capture-signal',
                    row: 3,
                    col: 0,
                    colCount: 1,
                    kind: 'event',
                    eventId: 'wheel',
                    nextIds: [],
                },
                eventId: 'wheel',
            });
            target.setPhase('visit');
            return;
        }

        if (captureId === 'rest')
        {
            target.setVisit({
                node: {
                    id: 'steam-capture-rest',
                    row: 6,
                    col: 0,
                    colCount: 1,
                    kind: 'rest',
                    nextIds: [],
                },
                eventId: null,
            });
            target.setPhase('visit');
            return;
        }

        if (captureId === 'combo')
        {
            const puzzle = getRunPuzzle('fire-alternation');
            const payload = {
                puzzleId: puzzle.id,
                startHealth: health,
                seed: deriveSeed(STEAM_CAPTURE_SEED, `puzzle:${puzzle.id}`),
                bodyMods: [ ...bodyMods ],
                runAttackCount: target.runAttackCount,
            };
            target.setPhase('puzzle');

            if (target.sceneReadyRef.current)
            {
                EventBus.emit(GAME_EVENTS.START_PUZZLE, payload);
            }
            else
            {
                target.pendingPuzzleRef.current = payload;
            }

            return;
        }

        const battlePayload = {
            startHealth: health,
            deck,
            seed: deriveSeed(STEAM_CAPTURE_SEED, 'battle:showcase'),
            bodyMods: [ ...bodyMods ],
            runAttackCount: target.runAttackCount,
            rerollsRemaining: GAME_RULES.rerollsPerFloor,
            runGold: showcaseGold(),
            ascensionLevel: captureId === 'boss' ? 1 : 0,
        };

        if (captureId === 'board' || captureId === 'multi' || captureId === 'boss')
        {
            const puzzleMode = captureId === 'board' ? showcasePuzzleMode() : null;
            const enemyIds = captureId === 'multi'
                ? [ 'smokebinder', 'saboteur' ]
                : captureId === 'boss'
                    ? [ 'warden' ]
                    : [ captureId === 'board' ? SHOWCASE_BOARD_ENEMY_ID : 'smokebinder' ];

            target.setPhase('battle');
            const payload = {
                ...battlePayload,
                enemyIds,
                puzzleMode,
                enemyHealthMultiplier: captureId === 'board'
                    ? SHOWCASE_BOARD_ENEMY_HP_MULTIPLIER
                    : undefined,
            };

            if (target.sceneReadyRef.current)
            {
                EventBus.emit(GAME_EVENTS.START_BATTLE, payload);
            }
            else
            {
                target.pendingStartRef.current = payload;
            }
        }
    }, []);
};
