/** Accumulated metrics for the run-end summary screen. */
export interface RunStats {
    battlesWon: number;
    damageDealt: number;
    damageTaken: number;
    cardsAdded: number;
    credsEarned: number;
    signalsVisited: number;
    bodyModsCollected: number;
    ascensionLevel: number;
    pathLength: number;
}

export const createEmptyRunStats = (ascensionLevel = 0): RunStats => ({
    battlesWon: 0,
    damageDealt: 0,
    damageTaken: 0,
    cardsAdded: 0,
    credsEarned: 0,
    signalsVisited: 0,
    bodyModsCollected: 0,
    ascensionLevel,
    pathLength: 0,
});
