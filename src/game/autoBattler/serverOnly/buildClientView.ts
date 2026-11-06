import type { AutoBattlerRunState } from '../run/AutoBattlerRun';
import { emptyClientRunView, sanitizeBattleLog } from '../shared';
import type { ClientLockedBattle, ClientRunView } from '../shared';
import { cloneTeam } from '../unitRegistry';
import type { BattleEvent, LockedBattle } from '../types';

const toClientBattle = (battle: LockedBattle): ClientLockedBattle =>
    ({
        playerTeam: cloneTeam(battle.playerTeam),
        enemyTeam: cloneTeam(battle.enemyTeam),
        result: {
            winner: battle.result.winner,
            survivingA: battle.result.survivingA,
            survivingB: battle.result.survivingB,
            log: sanitizeBattleLog(battle.result.log),
        },
    });

/** Server-only: build the stripped snapshot the client may see. */
export const buildClientRunView = (
    state: AutoBattlerRunState,
    mode: ClientRunView['mode'],
    matchId?: string,
): ClientRunView =>
    ({
        mode,
        phase: state.phase,
        player: {
            ...state.player,
            team: cloneTeam(state.player.team),
            offers: state.player.offers.map((offer) => ({ ...offer })),
        },
        enemyTeam: cloneTeam(state.enemy.team),
        battle: state.battle ? toClientBattle(state.battle) : null,
        lastMessage: state.lastMessage,
        matchId,
    });

export const buildClientBattleRemapped = (
    battle: LockedBattle,
    asSideA: boolean,
): ClientLockedBattle =>
{
    if (asSideA)
    {
        return toClientBattle(battle);
    }

    const flip = (side: 'a' | 'b'): 'a' | 'b' => (side === 'a' ? 'b' : 'a');
    const log: BattleEvent[] = sanitizeBattleLog(battle.result.log).map((event) =>
    {
        switch (event.type)
        {
            case 'startOfBattle':
            case 'damage':
            case 'heal':
            case 'buff':
            case 'summon':
            case 'faint':
            case 'move':
                return { ...event, side: flip(event.side) };
            case 'attack':
                return { ...event, attackerSide: flip(event.attackerSide) };
            case 'end':
                return {
                    ...event,
                    winner: event.winner === 'draw' ? 'draw' : flip(event.winner),
                };
            default:
                return event;
        }
    });

    return {
        playerTeam: cloneTeam(battle.enemyTeam),
        enemyTeam: cloneTeam(battle.playerTeam),
        result: {
            winner: battle.result.winner === 'draw'
                ? 'draw'
                : battle.result.winner === 'b'
                    ? 'a'
                    : 'b',
            log,
            survivingA: battle.result.survivingB,
            survivingB: battle.result.survivingA,
        },
    };
};

export { emptyClientRunView };
