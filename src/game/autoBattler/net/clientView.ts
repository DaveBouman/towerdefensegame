import type { AutoBattlerRunState } from '../run/AutoBattlerRun';
import { createEmptyShopState } from '../shop';
import { cloneTeam } from '../unitRegistry';
import type { ClientRunView } from './protocol';

export const toClientRunView = (
    state: AutoBattlerRunState,
    mode: ClientRunView['mode'],
    matchId?: string,
): ClientRunView =>
    ({
        mode,
        seed: state.seed,
        phase: state.phase,
        player: {
            ...state.player,
            team: cloneTeam(state.player.team),
            offers: state.player.offers.map((offer) => ({ ...offer })),
        },
        enemyTeam: cloneTeam(state.enemy.team),
        battle: state.battle
            ? {
                seed: state.battle.seed,
                playerTeam: cloneTeam(state.battle.playerTeam),
                enemyTeam: cloneTeam(state.battle.enemyTeam),
                result: {
                    ...state.battle.result,
                    log: [ ...state.battle.result.log ],
                },
            }
            : null,
        lastMessage: state.lastMessage,
        matchId,
    });

export const emptyClientRunView = (): ClientRunView =>
    ({
        mode: 'menu',
        seed: '',
        phase: 'menu',
        player: createEmptyShopState(),
        enemyTeam: createEmptyShopState().team,
        battle: null,
        lastMessage: '',
    });
