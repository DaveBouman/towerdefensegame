import { GAME_RULES } from '../config/cardRegistry';
import {
    getEnemyAllyActions,
    mergeAllyStepsIntoTurn,
    planAllySupportSteps,
} from '../combat/enemyAllySupport';
import { planEnemyTurn } from '../combat/enemyTurn';
import { isCombatantAlive } from './enemyCombatants';
import type { EnemyCombatant, EnemyState, EnemyTurnAction, PlayerState } from './types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';

export interface EnemyPhaseHost
{
    readonly combatants: readonly EnemyCombatant[];
    getLivingCombatants (): EnemyCombatant[];
    getCombatant (instanceId: string): EnemyCombatant | undefined;
    isEnemyDefeated (): boolean;
    isPlayerDefeated (): boolean;
    getPlayer (): PlayerState;
    getEnemy (instanceId?: string): EnemyState;
    rampEnemyAction (action: EnemyTurnAction): EnemyTurnAction;
    applySilenceTilesFromPassives (): void;
}

export class EnemyPhaseController
{
    private enemyTurnsTaken = 0;
    private queuedEnemyTurn: EnemyTurnAction | null = null;
    private enemyPhaseQueue: EnemyTurnAction[] = [];
    private enemyPhasePrepared = false;
    private enemyTurnInProgress = false;

    constructor (private readonly host: EnemyPhaseHost) {}

    getEnemyTurnsTaken (): number
    {
        return this.enemyTurnsTaken;
    }

    isEnemyTurnInProgress (): boolean
    {
        return this.enemyTurnInProgress;
    }

    getQueuedEnemyTurn (instanceId?: string): EnemyTurnAction | null
    {
        if (instanceId)
        {
            const combatant = this.host.getCombatant(instanceId);

            return combatant?.queuedTurn ? { ...combatant.queuedTurn } : null;
        }

        const living = this.host.getLivingCombatants()[0];

        return living?.queuedTurn ? { ...living.queuedTurn } : null;
    }

    getQueuedEnemyTurns (): EnemyTurnAction[]
    {
        return this.host.getLivingCombatants()
            .filter((combatant) => combatant.queuedTurn !== null)
            .map((combatant) => ({ ...combatant.queuedTurn! }));
    }

    getTelegraphedEnemyTurn (instanceId: string): EnemyTurnAction | null
    {
        const combatant = this.host.getCombatant(instanceId);

        if (!combatant?.queuedTurn)
        {
            return null;
        }

        return this.host.rampEnemyAction(combatant.queuedTurn);
    }

    queueNextEnemyTurn (): EnemyTurnAction
    {
        for (const combatant of this.host.combatants)
        {
            if (!isCombatantAlive(combatant))
            {
                combatant.queuedTurn = null;
                continue;
            }

            const baseTurn = planEnemyTurn({
                enemy: combatant.definition,
                enemyState: combatant.state,
                enrageStacks: combatant.enrageStacks,
                turnsTaken: combatant.turnsTaken,
            });
            const allySteps = planAllySupportSteps(
                combatant,
                this.host.getLivingCombatants(),
                getEnemyAllyActions(combatant.definition),
            );

            combatant.queuedTurn = {
                ...baseTurn,
                steps: mergeAllyStepsIntoTurn(baseTurn.steps, allySteps),
                instanceId: combatant.instanceId,
                enemyId: combatant.definitionId,
            };
        }

        this.queuedEnemyTurn = this.getQueuedEnemyTurn();

        return this.queuedEnemyTurn ? { ...this.queuedEnemyTurn } : {
            enemyId: this.host.combatants[0]?.definitionId ?? GAME_RULES.defaultEnemyId,
            steps: [],
        };
    }

    hasQueuedEnemyTurn (): boolean
    {
        return this.host.getLivingCombatants().some((combatant) => combatant.queuedTurn !== null);
    }

    hasMoreEnemyTurnsInPhase (): boolean
    {
        return this.enemyPhaseQueue.length > 0;
    }

    prepareEnemyPhase (): EnemyTurnAction[]
    {
        if (this.host.isEnemyDefeated() || this.host.isPlayerDefeated())
        {
            return [];
        }

        if (!this.hasQueuedEnemyTurn())
        {
            this.queueNextEnemyTurn();
        }

        this.enemyPhaseQueue = this.host.getLivingCombatants()
            .filter((combatant) => combatant.queuedTurn !== null)
            .map((combatant) => this.host.rampEnemyAction(combatant.queuedTurn!));

        this.enemyPhasePrepared = this.enemyPhaseQueue.length > 0;

        return [ ...this.enemyPhaseQueue ];
    }

    beginEnemyTurn (): EnemyTurnAction | null
    {
        if (this.enemyTurnInProgress || this.host.isEnemyDefeated() || this.host.isPlayerDefeated())
        {
            return null;
        }

        if (this.enemyPhaseQueue.length === 0)
        {
            if (this.enemyPhasePrepared)
            {
                return null;
            }

            const prepared = this.prepareEnemyPhase();

            if (prepared.length === 0)
            {
                return null;
            }
        }

        const next = this.enemyPhaseQueue.shift();

        if (!next)
        {
            return null;
        }

        const combatant = next.instanceId
            ? this.host.getCombatant(next.instanceId)
            : this.host.getLivingCombatants()[0];

        if (!combatant)
        {
            return null;
        }

        combatant.state.shield = 0;
        combatant.queuedTurn = null;
        this.queuedEnemyTurn = next;
        this.enemyTurnInProgress = true;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_TURN_STARTED, { action: next });

        return next;
    }

    completeSingleEnemyTurn (action: EnemyTurnAction): void
    {
        const combatant = action.instanceId
            ? this.host.getCombatant(action.instanceId)
            : this.host.getLivingCombatants()[0];

        if (combatant)
        {
            combatant.turnsTaken += 1;
            combatant.enrageStacks = 0;
        }

        this.queuedEnemyTurn = null;
        this.enemyTurnInProgress = false;
    }

    completeEnemyPhase (): void
    {
        this.enemyPhaseQueue.length = 0;
        this.enemyPhasePrepared = false;
        this.enemyTurnInProgress = false;

        this.host.applySilenceTilesFromPassives();

        CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_TURN_COMPLETED, {
            action: { enemyId: GAME_RULES.defaultEnemyId, steps: [] },
            enemy: this.host.getEnemy(),
            player: this.host.getPlayer(),
        });

        if (this.host.isPlayerDefeated())
        {
            CardGameEventBus.emit(CARD_GAME_EVENTS.PLAYER_DEFEATED, { player: this.host.getPlayer() });
            return;
        }

        this.enemyTurnsTaken += 1;

        if (!this.host.isEnemyDefeated())
        {
            this.queueNextEnemyTurn();
        }
    }

    cancelEnemyTurn (): void
    {
        this.enemyTurnInProgress = false;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_TURN_CANCELLED);
    }

    /** Clears queued turn on puzzle init. */
    clearQueuedTurn (): void
    {
        this.queuedEnemyTurn = null;
    }
}
