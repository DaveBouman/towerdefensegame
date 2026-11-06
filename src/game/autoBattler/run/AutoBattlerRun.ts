import { createRandomSeed } from '../../random/rng';
import { runShopAiTurn } from '../ai/shopAi';
import { simulateBattle } from '../battle/simulateBattle';
import { AUTO_BATTLER_RULES, livesLostOnDefeat } from '../config/rules';
import {
    beginShopTurn,
    buyOffer,
    createEmptyShopState,
    moveTeamUnit,
    rerollShop,
    sellTeamUnit,
    startNewRunShop,
    toggleFreezeOffer,
} from '../shop';
import type {
    LockedBattle,
    PlayerShopState,
    RunPhase,
} from '../types';
import { cloneTeam } from '../unitRegistry';

export interface AutoBattlerRunState {
    seed: string;
    phase: RunPhase;
    player: PlayerShopState;
    enemy: PlayerShopState;
    battle: LockedBattle | null;
    lastMessage: string;
}

export const createMenuState = (): AutoBattlerRunState =>
    ({
        seed: '',
        phase: 'menu',
        player: createEmptyShopState(),
        enemy: createEmptyShopState(),
        battle: null,
        lastMessage: '',
    });

export const startRun = (seed = createRandomSeed()): AutoBattlerRunState =>
{
    const player = startNewRunShop(seed);
    let enemy = startNewRunShop(`${seed}:enemy`);
    enemy = runShopAiTurn(enemy, `${seed}:enemy`);

    return {
        seed,
        phase: 'shop',
        player,
        enemy,
        battle: null,
        lastMessage: 'Buy units. Front fights first.',
    };
};

export const applyBuy = (state: AutoBattlerRunState, offerUid: string): AutoBattlerRunState =>
{
    if (state.phase !== 'shop')
    {
        return state;
    }

    const next = buyOffer(state.player, offerUid);

    return next ? { ...state, player: next } : state;
};

export const applySell = (state: AutoBattlerRunState, unitUid: string): AutoBattlerRunState =>
{
    if (state.phase !== 'shop')
    {
        return state;
    }

    const next = sellTeamUnit(state.player, unitUid);

    return next ? { ...state, player: next } : state;
};

export const applyReroll = (state: AutoBattlerRunState): AutoBattlerRunState =>
{
    if (state.phase !== 'shop')
    {
        return state;
    }

    const next = rerollShop(state.player, state.seed);

    return next ? { ...state, player: next } : state;
};

export const applyFreeze = (state: AutoBattlerRunState, offerUid: string): AutoBattlerRunState =>
{
    if (state.phase !== 'shop')
    {
        return state;
    }

    const next = toggleFreezeOffer(state.player, offerUid);

    return next ? { ...state, player: next } : state;
};

export const applyMove = (
    state: AutoBattlerRunState,
    fromIndex: number,
    toIndex: number,
): AutoBattlerRunState =>
{
    if (state.phase !== 'shop')
    {
        return state;
    }

    const next = moveTeamUnit(state.player, fromIndex, toIndex);

    return next ? { ...state, player: next } : state;
};

export const endTurnAndBattle = (state: AutoBattlerRunState): AutoBattlerRunState =>
{
    if (state.phase !== 'shop')
    {
        return state;
    }

    const battleSeed = `${state.seed}:battle:${state.player.turn}`;
    const enemyReady = runShopAiTurn(state.enemy, `${state.seed}:enemy:${state.player.turn}`);
    const result = simulateBattle(
        battleSeed,
        cloneTeam(state.player.team),
        cloneTeam(enemyReady.team),
    );

    const battle: LockedBattle = {
        seed: battleSeed,
        playerTeam: cloneTeam(state.player.team),
        enemyTeam: cloneTeam(enemyReady.team),
        result,
    };

    return {
        ...state,
        phase: 'battle',
        enemy: enemyReady,
        battle,
        lastMessage: result.winner === 'a'
            ? 'Victory!'
            : result.winner === 'b'
                ? 'Defeat!'
                : 'Draw!',
    };
};

export const finishBattle = (state: AutoBattlerRunState): AutoBattlerRunState =>
{
    if (state.phase !== 'battle' || !state.battle)
    {
        return state;
    }

    const { result } = state.battle;
    let player = {
        ...state.player,
        team: state.player.team.map((slot) => (slot ? { ...slot } : null)),
        offers: state.player.offers.map((offer) => ({ ...offer })),
    };
    let enemy = {
        ...state.enemy,
        team: state.enemy.team.map((slot) => (slot ? { ...slot } : null)),
        offers: state.enemy.offers.map((offer) => ({ ...offer })),
    };

    if (result.winner === 'a')
    {
        player = { ...player, wins: player.wins + 1 };
    }
    else if (result.winner === 'b')
    {
        const lost = livesLostOnDefeat(result.survivingB);
        player = { ...player, lives: Math.max(0, player.lives - lost) };
    }

    if (player.wins >= AUTO_BATTLER_RULES.winsToVictory)
    {
        return {
            ...state,
            phase: 'victory',
            player,
            enemy,
            battle: null,
            lastMessage: 'Circuit cleared — 10 wins.',
        };
    }

    if (player.lives <= 0)
    {
        return {
            ...state,
            phase: 'defeat',
            player,
            enemy,
            battle: null,
            lastMessage: 'Integrity depleted.',
        };
    }

    player = beginShopTurn({ ...player, turn: player.turn + 1 }, state.seed);
    enemy = beginShopTurn({ ...enemy, turn: enemy.turn + 1 }, `${state.seed}:enemy`);
    enemy = runShopAiTurn(enemy, `${state.seed}:enemy:${enemy.turn}`);

    return {
        ...state,
        phase: 'shop',
        player,
        enemy,
        battle: null,
        lastMessage: `Turn ${player.turn} — shop open.`,
    };
};
