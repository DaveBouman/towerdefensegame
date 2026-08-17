import type { EnemyTurnAction } from './types';

export interface EnergyRoundHost
{
    isPlayerDefeated (): boolean;
    isEnemyDefeated (): boolean;
    refillHand (): void;
    renewHand (): void;
    clearTransientBattleModifiers (): void;
    clearBattleModifiers (): void;
    applyEnemyCurseHand (): void;
    isHandRedirectActiveThisRound (): boolean;
    scrambleHandArrows (): number;
    clearHandRedirect (): void;
    activatePendingHandRedirectAfterRenew (): void;
    completeEnemyPhase (): void;
    completeSingleEnemyTurn (action: EnemyTurnAction): void;
    hasMoreEnemyTurnsInPhase (): boolean;
}

/** Energy pool and end-of-phase / end-of-round player refresh. */
export class EnergyRoundController
{
    private energy: number;
    private readonly maxEnergy: number;

    constructor (
        private readonly host: EnergyRoundHost,
        maxEnergy: number,
    )
    {
        this.maxEnergy = maxEnergy;
        this.energy = maxEnergy;
    }

    getEnergy (): number
    {
        return this.energy;
    }

    getMaxEnergy (): number
    {
        return this.maxEnergy;
    }

    hasEnergy (): boolean
    {
        return this.energy > 0;
    }

    /** Attacks the player has taken so far this round (one energy spent per attack). */
    getAttacksThisRound (): number
    {
        return this.maxEnergy - this.energy;
    }

    /** Spends one energy for an attack. Returns false when none remains. */
    spendEnergy (): boolean
    {
        if (this.energy <= 0)
        {
            return false;
        }

        this.energy -= 1;

        return true;
    }

    resetEnergy (): void
    {
        this.energy = this.maxEnergy;
    }

    /** Refreshes the player between attacks in the same energy round (board persists). */
    refreshPlayerAfterMidRoundEnemy (): void
    {
        if (this.host.isPlayerDefeated() || this.host.isEnemyDefeated())
        {
            return;
        }

        this.host.refillHand();

        if (this.host.isHandRedirectActiveThisRound())
        {
            this.host.scrambleHandArrows();
        }

        this.host.clearTransientBattleModifiers();
        this.host.applyEnemyCurseHand();
    }

    /** Starts the next energy round after the board has been cleared. */
    finishPlayerRound (): void
    {
        if (this.host.isPlayerDefeated() || this.host.isEnemyDefeated())
        {
            return;
        }

        this.host.clearHandRedirect();
        this.host.renewHand();
        this.resetEnergy();
        this.host.clearBattleModifiers();
        this.host.activatePendingHandRedirectAfterRenew();
        this.host.applyEnemyCurseHand();
    }

    finishEnemyPhase (): void
    {
        this.host.completeEnemyPhase();

        if (this.host.isPlayerDefeated() || this.host.isEnemyDefeated())
        {
            return;
        }

        if (this.energy <= 0)
        {
            this.finishPlayerRound();
        }
        else
        {
            this.refreshPlayerAfterMidRoundEnemy();
        }
    }

    completeEnemyTurn (action: EnemyTurnAction): void
    {
        this.host.completeSingleEnemyTurn(action);

        if (this.host.hasMoreEnemyTurnsInPhase())
        {
            return;
        }

        this.host.completeEnemyPhase();

        if (this.energy > 0)
        {
            this.refreshPlayerAfterMidRoundEnemy();
        }
    }
}
