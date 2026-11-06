import type { ClientRunView } from './protocol';
import { createEmptyShopState } from './emptyShop';

export const emptyClientRunView = (): ClientRunView =>
    ({
        mode: 'menu',
        phase: 'menu',
        player: createEmptyShopState(),
        enemyTeam: createEmptyShopState().team,
        battle: null,
        lastMessage: '',
    });
