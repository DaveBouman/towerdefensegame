import { type LoadedCardGameEnemyDefinition } from '../config/enemyCatalog';
import { getEnemyPassive } from '../enemyPassives/defaults';
import { shatterPartsThatFit, shouldSpawnMinionAfterTurn } from '../enemyPassives/spawnShatter';
import {
    applyLinkRageToAllies,
    getCardThiefPassive,
    shouldFleeThisTurn,
    shouldStealCardThisTurn,
    stealCredFromRun,
} from '../enemyPassives/interactionPassives';
import { createEnemyCombatant, isCombatantAlive, normalizeEnemyIds } from './enemyCombatants';
import type { EnemyCombatant, EnemyState } from './types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';

export interface EnemySquadHost
{
    returnStolenCardToDeck (definitionId: string): void;
    stealRandomDeckCard (): string | null;
}

/** Enemy squad lifecycle, targeting, and run battle deltas. */
export class EnemySquadManager
{
    readonly combatants: EnemyCombatant[] = [];
    private attackTargetId: string | null = null;
    private goldStolen = 0;
    private readonly permanentlyStolenCardIds: string[] = [];
    private nextCombatantIndex = 0;
    private readonly runGold: number;

    constructor (
        private readonly host: EnemySquadHost,
        enemyIds: string | readonly string[],
        healthMultiplier: number,
        runGold: number,
    )
    {
        this.runGold = Math.max(0, runGold);

        for (const [ index, definitionId ] of normalizeEnemyIds(enemyIds).entries())
        {
            this.combatants.push(createEnemyCombatant(`enemy-${index}`, definitionId, healthMultiplier));
            this.nextCombatantIndex = index + 1;
        }
    }

    getCombatants (): readonly EnemyCombatant[]
    {
        return this.combatants;
    }

    getCombatant (instanceId: string): EnemyCombatant | undefined
    {
        return this.combatants.find((combatant) => combatant.instanceId === instanceId);
    }

    getLivingCombatants (): EnemyCombatant[]
    {
        return this.combatants.filter((combatant) => isCombatantAlive(combatant));
    }

    hasMultipleEnemies (): boolean
    {
        return this.getLivingCombatants().length > 1;
    }

    tryTriggerPhaseShift (combatant: EnemyCombatant): { label: string; message: string } | null
    {
        if (combatant.phaseShiftActive)
        {
            return null;
        }

        const passive = getEnemyPassive(combatant.definition.passives, 'phaseShift');

        if (!passive || combatant.state.maxHealth <= 0)
        {
            return null;
        }

        const ratio = combatant.state.health / combatant.state.maxHealth;

        if (ratio > passive.healthRatio)
        {
            return null;
        }

        combatant.phaseShiftActive = true;

        const payload = {
            label: passive.label,
            message: passive.message,
        };

        CardGameEventBus.emit(CARD_GAME_EVENTS.PHASE_SHIFT, payload);

        return payload;
    }

    /** Adds a living combatant mid-battle (spawn / shatter). */
    addCombatant (definitionId: string): EnemyCombatant
    {
        const combatant = createEnemyCombatant(`enemy-${this.nextCombatantIndex}`, definitionId);
        this.nextCombatantIndex += 1;
        this.combatants.push(combatant);

        return combatant;
    }

    removeCombatant (instanceId: string): boolean
    {
        const index = this.combatants.findIndex((combatant) => combatant.instanceId === instanceId);

        if (index < 0)
        {
            return false;
        }

        if (this.attackTargetId === instanceId)
        {
            this.attackTargetId = null;
        }

        this.combatants.splice(index, 1);

        return true;
    }

    private emitCombatantsChanged (
        added: readonly string[],
        removed: readonly string[],
        reason: 'spawn' | 'shatter' | 'flee',
    ): void
    {
        CardGameEventBus.emit(CARD_GAME_EVENTS.COMBATANTS_CHANGED, {
            added: [ ...added ],
            removed: [ ...removed ],
            reason,
        });
    }

    /**
     * On kill: if the combatant has shatterOnDeath, remove it and spawn parts.
     * Emits COMBATANTS_CHANGED for UI sync.
     */
    shatterCombatantIfNeeded (instanceId: string): string[]
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant)
        {
            return [];
        }

        const livingOthers = this.getLivingCombatants()
            .filter((entry) => entry.instanceId !== instanceId)
            .length;
        const partIds = shatterPartsThatFit(combatant, livingOthers);

        if (partIds.length === 0)
        {
            return [];
        }

        this.removeCombatant(instanceId);
        const added = partIds.map((definitionId) => this.addCombatant(definitionId).instanceId);
        this.emitCombatantsChanged(added, [ instanceId ], 'shatter');

        return added;
    }

    /** After a host finishes its turn, maybe spawn a minion. */
    trySpawnMinionAfterEnemyTurn (instanceId: string): EnemyCombatant | null
    {
        const host = this.getCombatant(instanceId);

        if (!host)
        {
            return null;
        }

        const passive = shouldSpawnMinionAfterTurn(host, this.combatants);

        if (!passive)
        {
            return null;
        }

        const spawned = this.addCombatant(passive.minionId);
        this.emitCombatantsChanged([ spawned.instanceId ], [], 'spawn');

        return spawned;
    }

    onCombatantKilled (instanceId: string): void
    {
        const combatant = this.getCombatant(instanceId);

        if (combatant?.stolenCardId)
        {
            this.host.returnStolenCardToDeck(combatant.stolenCardId);
            combatant.stolenCardId = undefined;
        }

        applyLinkRageToAllies(
            this.getLivingCombatants().filter((entry) => entry.instanceId !== instanceId),
        );
    }

    fleeCombatant (instanceId: string): void
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant)
        {
            return;
        }

        if (combatant.stolenCardId)
        {
            this.permanentlyStolenCardIds.push(combatant.stolenCardId);
            combatant.stolenCardId = undefined;
        }

        this.removeCombatant(instanceId);
        this.emitCombatantsChanged([], [ instanceId ], 'flee');
    }

    getRunBattleDeltas (): { goldStolen: number; stolenCardIds: readonly string[] }
    {
        return {
            goldStolen: this.goldStolen,
            stolenCardIds: [ ...this.permanentlyStolenCardIds ],
        };
    }

    getAttackTargetId (): string | null
    {
        if (!this.attackTargetId)
        {
            return null;
        }

        const combatant = this.getCombatant(this.attackTargetId);

        return combatant && isCombatantAlive(combatant) ? this.attackTargetId : null;
    }

    setAttackTargetId (instanceId: string | null): void
    {
        this.attackTargetId = instanceId;
    }

    setAttackTarget (instanceId: string): boolean
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant || !isCombatantAlive(combatant))
        {
            return false;
        }

        this.attackTargetId = instanceId;

        return true;
    }

    /** Cycles lock target to the next living enemy in squad order (wraps). */
    cycleAttackTarget (): string | null
    {
        const living = this.getLivingCombatants();

        if (living.length === 0)
        {
            return null;
        }

        if (living.length === 1)
        {
            this.attackTargetId = living[0]!.instanceId;

            return this.attackTargetId;
        }

        const ids = living.map((combatant) => combatant.instanceId);
        const current = this.getAttackTargetId();
        const currentIndex = current ? ids.indexOf(current) : -1;
        const nextIndex = (currentIndex + 1) % ids.length;

        this.attackTargetId = ids[nextIndex]!;

        return this.attackTargetId;
    }

    hasValidAttackTarget (): boolean
    {
        return this.getAttackTargetId() !== null;
    }

    /** Picks a lone living enemy automatically; returns null when the player must choose. */
    ensureAttackTarget (): string | null
    {
        const current = this.getAttackTargetId();

        if (current)
        {
            return current;
        }

        const living = this.getLivingCombatants();

        if (living.length === 1)
        {
            this.attackTargetId = living[0]!.instanceId;

            return this.attackTargetId;
        }

        return null;
    }

    getTargetCombatant (): EnemyCombatant
    {
        const targetId = this.getAttackTargetId() ?? this.getLivingCombatants()[0]?.instanceId;
        const combatant = targetId ? this.getCombatant(targetId) : this.combatants[0];

        if (!combatant)
        {
            throw new Error('No enemy combatants in session');
        }

        return combatant;
    }

    getCombatantOrThrow (instanceId: string): EnemyCombatant
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant)
        {
            throw new Error(`Unknown enemy combatant: ${instanceId}`);
        }

        return combatant;
    }

    resolveAttackTargetId (explicit?: string): string
    {
        if (explicit)
        {
            const combatant = this.getCombatant(explicit);

            if (combatant && isCombatantAlive(combatant))
            {
                return explicit;
            }
        }

        const targetId = this.ensureAttackTarget();

        if (targetId)
        {
            return targetId;
        }

        const living = this.getLivingCombatants();

        if (living.length > 0)
        {
            this.attackTargetId = living[0]!.instanceId;

            return this.attackTargetId;
        }

        throw new Error('Attack target required');
    }

    getEnemy (instanceId?: string): EnemyState
    {
        const combatant = instanceId
            ? this.getCombatant(instanceId)
            : this.getTargetCombatant();

        return combatant ? { ...combatant.state } : { health: 0, maxHealth: 0, shield: 0 };
    }

    getEnemyDefinition (instanceId?: string): LoadedCardGameEnemyDefinition
    {
        const combatant = instanceId
            ? this.getCombatant(instanceId)
            : this.getTargetCombatant();

        return combatant.definition;
    }

    applyPostEnemyTurnPassives (instanceId: string): void
    {
        const combatant = this.getCombatant(instanceId);

        if (!combatant || !isCombatantAlive(combatant))
        {
            return;
        }

        const credLeech = getEnemyPassive(combatant.definition.passives, 'credLeech');

        if (credLeech && this.runGold > 0)
        {
            const result = stealCredFromRun(this.runGold, this.goldStolen, credLeech.amountPerTurn);
            this.goldStolen = result.goldStolen;
        }

        const thief = getCardThiefPassive(combatant);

        if (thief)
        {
            if (shouldStealCardThisTurn(combatant, thief))
            {
                const stolen = this.host.stealRandomDeckCard();

                if (stolen)
                {
                    combatant.stolenCardId = stolen;
                }
            }

            if (shouldFleeThisTurn(combatant, thief))
            {
                this.fleeCombatant(instanceId);
            }
        }
    }
}
