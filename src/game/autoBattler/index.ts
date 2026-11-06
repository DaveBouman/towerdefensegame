/**
 * Public client entry for the auto battler.
 * Server/sim code must be imported from deep server paths only (see server/).
 */
export * from './shared';
export {
    AutoBattlerSocket,
    loadStoredGuestId,
    storeGuestId,
    type ConnectionStatus,
    type AutoBattlerSocketHandlers,
} from './client/AutoBattlerSocket';
