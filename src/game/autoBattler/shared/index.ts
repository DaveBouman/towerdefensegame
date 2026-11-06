/**
 * Client-safe auto-battler surface.
 * Do NOT export battle sim, shop mutations, AI, or run reducers from here.
 */
export type {
    AbilityId,
    UnitDefinition,
    UnitInstance,
    Team,
    TeamSlot,
    ShopOffer,
    PlayerShopState,
    BattleSide,
    BattleEvent,
    BattleResult,
    RunPhase,
} from '../types';

export type { PublicRules } from './publicRules';
export { DEFAULT_PUBLIC_RULES, toPublicRules } from './publicRules';

export {
    getAllUnitDefinitions,
    getUnitDefinition,
    getUnitDefinitionOrThrow,
} from './unitCatalog';

export { createEmptyShopState, createEmptyTeam } from './emptyShop';
export { emptyClientRunView } from './emptyView';

export type {
    ClientLockedBattle,
    ClientRunView,
    ClientToServerMessage,
    ServerToClientMessage,
} from './protocol';
export {
    DEFAULT_AB_WS_PORT,
    parseClientMessage,
    sanitizeBattleLog,
} from './protocol';
