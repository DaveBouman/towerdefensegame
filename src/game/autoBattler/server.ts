/**
 * Server-only barrel. Client Vite build must never import this module.
 */
export { AUTO_BATTLER_RULES, livesLostOnDefeat, tierForTurn } from './config/rules';
export { simulateBattle } from './battle/simulateBattle';
export { runShopAiTurn } from './ai/shopAi';
export {
    beginShopTurn,
    buyOffer,
    compactTeam,
    moveTeamUnit,
    refillShopOffers,
    rerollShop,
    sellTeamUnit,
    startNewRunShop,
    teamFromUnits,
    toggleFreezeOffer,
} from './shop';
export {
    cloneTeam,
    createUnitInstance,
    getAbilityId,
    getUnitsForTier,
    resetAutoBattlerUidCounter,
} from './unitRegistry';
export {
    applyBuy,
    applyFreeze,
    applyMove,
    applyReroll,
    applySell,
    createMenuState,
    endTurnAndBattle,
    finishBattle,
    startRun,
    type AutoBattlerRunState,
} from './run/AutoBattlerRun';
export type * from './types';
export { toPublicRules } from './shared/publicRules';
export {
    buildClientBattleRemapped,
    buildClientRunView,
    emptyClientRunView,
} from './serverOnly/buildClientView';
