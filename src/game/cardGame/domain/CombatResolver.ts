import { BODY_MOD_IDS, isSeventhStrikeAttack } from '../../run/bodyMods';
import {
    getCardDefinitionOrThrow,
    getCardHealOnKill,
} from '../config/cardRegistry';
import {
    aggregateBattleModifiers,
    applyPlayerBuffModifier,
    scaleIncomingDamage,
    type BattleModifier,
} from '../combat/battleModifiers';
import { applyCombatHitMitigation, applyEnemyHitMitigation } from '../combat/combatTraits/mitigation';
import { collectCombatTraitsFromBodyMods } from '../combat/combatTraits/collect';
import type { CombatTraitConfig } from '../combat/combatTraits/types';
import { computeThornsReflectDamage, resolvePostAttackPassives } from '../enemyPassives/applyEnemyPassives';
import type { BoardModel } from './BoardModel';
import type { FieldEffects } from './FieldEffects';
import { isCombatantAlive } from './enemyCombatants';
import type {
    AttackSequence,
    DamageResult,
    EnemyCombatant,
    EnemyState,
    PlayerDamageResult,
    PlayerState,
    PuzzleModeConfig,
} from './types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';

export interface CombatContext
{
    readonly board: BoardModel;
    readonly fieldEffects: FieldEffects;
    readonly bodyMods: readonly string[];
    readonly puzzleMode: PuzzleModeConfig | null;
    readonly battleModifiers: BattleModifier[];
    player: PlayerState;
    getCombatants (): readonly EnemyCombatant[];
    getLivingCombatants (): EnemyCombatant[];
    getCombatant (instanceId: string): EnemyCombatant | undefined;
    getCombatantOrThrow (instanceId: string): EnemyCombatant;
    getTargetCombatant (): EnemyCombatant;
    getAttackTargetId (): string | null;
    setAttackTargetId (instanceId: string | null): void;
    ensureAttackTarget (): string | null;
    resolveAttackTargetId (explicit?: string): string;
}

export class CombatResolver
{
    private attackInProgress = false;
    private damageDealtThisAttack = 0;
    private armorGrantedThisAttack = 0;
    private runAttackCount: number;
    private doubleDamageThisAttack = false;
    private playerHitsBlockedRemaining?: number;

    constructor (
        private readonly ctx: CombatContext,
        runAttackCount = 0,
    )
    {
        this.runAttackCount = Math.max(0, Math.round(runAttackCount));
    }

    initPlayerHitWard (hitsBlocked: number): void
    {
        this.playerHitsBlockedRemaining = hitsBlocked;
    }

    getRunAttackCount (): number
    {
        return this.runAttackCount;
    }

    isDoubleDamageThisAttack (): boolean
    {
        return this.doubleDamageThisAttack;
    }

    isAttackInProgress (): boolean
    {
        return this.attackInProgress;
    }

    getPlayerCombatTraits (): readonly CombatTraitConfig[]
    {
        return collectCombatTraitsFromBodyMods(this.ctx.bodyMods);
    }

    getScaledArmorGain (armor: number): number
    {
        return this.scalePlayerArmorGain(armor);
    }

    beginAttack (chainLength: number): boolean
    {
        if (chainLength === 0)
        {
            return false;
        }

        this.attackInProgress = true;
        this.damageDealtThisAttack = 0;
        this.armorGrantedThisAttack = 0;
        this.doubleDamageThisAttack = false;

        if (!this.ctx.puzzleMode)
        {
            this.runAttackCount += 1;

            if (this.ctx.bodyMods.includes(BODY_MOD_IDS.markSeven)
                && isSeventhStrikeAttack(this.runAttackCount))
            {
                this.doubleDamageThisAttack = true;
            }
        }

        return true;
    }

    emitAttackStep (stepIndex: number, sequence: AttackSequence): void
    {
        const step = sequence.steps[stepIndex];

        if (!step)
        {
            return;
        }

        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_STEP, { step, stepIndex, sequence });
    }

    grantPlayerShield (amount: number): void
    {
        const scaled = this.scalePlayerArmorGain(amount);

        if (scaled <= 0)
        {
            return;
        }

        this.ctx.player.shield += scaled;
        this.armorGrantedThisAttack += amount;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.ctx.player.shield });
    }

    healPlayer (amount: number): void
    {
        if (amount <= 0)
        {
            return;
        }

        this.ctx.player.health = Math.min(
            this.ctx.player.maxHealth,
            this.ctx.player.health + amount,
        );
        CardGameEventBus.emit(CARD_GAME_EVENTS.PLAYER_HEALED, {
            player: { ...this.ctx.player },
            amount,
        });
    }

    dealAttackDamage (
        damage: number,
        targetInstanceId?: string,
        sourceDefinitionId?: string,
    ): DamageResult
    {
        const targetId = this.ctx.resolveAttackTargetId(targetInstanceId);
        const combatant = this.ctx.getCombatantOrThrow(targetId);
        const scaledDamage = this.scalePlayerDamageDealt(damage);

        if (scaledDamage <= 0)
        {
            return {
                enemy: { ...combatant.state },
                shieldAbsorbed: 0,
                healthDamage: 0,
                targetInstanceId: targetId,
            };
        }

        const mitigation = applyEnemyHitMitigation(combatant, scaledDamage);

        if (mitigation.blocked)
        {
            return {
                enemy: { ...combatant.state },
                shieldAbsorbed: 0,
                healthDamage: 0,
                targetInstanceId: targetId,
                damageBlocked: true,
            };
        }

        const effectiveDamage = mitigation.damage;

        if (effectiveDamage <= 0)
        {
            return {
                enemy: { ...combatant.state },
                shieldAbsorbed: 0,
                healthDamage: 0,
                targetInstanceId: targetId,
            };
        }

        const wasAlive = isCombatantAlive(combatant);
        const shieldAbsorbed = Math.min(combatant.state.shield, effectiveDamage);
        const healthDamage = effectiveDamage - shieldAbsorbed;

        combatant.state.shield -= shieldAbsorbed;
        combatant.state.health = Math.max(0, combatant.state.health - healthDamage);
        this.damageDealtThisAttack += effectiveDamage;

        const enemyKilled = wasAlive && combatant.state.health <= 0;
        let healOnKill = 0;

        if (enemyKilled)
        {
            if (this.ctx.getAttackTargetId() === targetId)
            {
                this.ctx.setAttackTargetId(null);
            }

            CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_DEFEATED, {
                enemy: { ...combatant.state },
                instanceId: targetId,
            });

            if (sourceDefinitionId)
            {
                const sourceDefinition = getCardDefinitionOrThrow(sourceDefinitionId);
                healOnKill = getCardHealOnKill(sourceDefinition);

                if (healOnKill > 0)
                {
                    this.healPlayer(healOnKill);
                }
            }
        }

        const thornsDamage = computeThornsReflectDamage(
            combatant.definition.passives,
            effectiveDamage,
        );

        if (thornsDamage > 0)
        {
            const reflect = this.resolveEnemyAttack(thornsDamage);

            return {
                enemy: { ...combatant.state },
                shieldAbsorbed,
                healthDamage,
                targetInstanceId: targetId,
                enemyKilled,
                healOnKill: healOnKill > 0 ? healOnKill : undefined,
                thornsDamage: reflect.healthDamage + reflect.shieldAbsorbed,
                thornsShieldAbsorbed: reflect.shieldAbsorbed,
                thornsHealthDamage: reflect.healthDamage,
            };
        }

        return {
            enemy: { ...combatant.state },
            shieldAbsorbed,
            healthDamage,
            targetInstanceId: targetId,
            enemyKilled,
            healOnKill: healOnKill > 0 ? healOnKill : undefined,
        };
    }

    completeAttack (sequence: AttackSequence): void
    {
        const remainingDamage = sequence.totalDamage - this.damageDealtThisAttack;

        if (remainingDamage > 0)
        {
            this.dealAttackDamage(remainingDamage);
        }

        const target = this.ctx.getTargetCombatant();
        const postAttack = resolvePostAttackPassives(
            this.ctx.board,
            sequence,
            target.definition.passives,
        );

        target.enrageStacks = postAttack.enrageStacks;

        if (postAttack.jammerShield > 0)
        {
            this.resolveEnemyShield(postAttack.jammerShield, target.instanceId);
        }

        if (postAttack.loopHunterDamage > 0)
        {
            this.resolveEnemyAttack(postAttack.loopHunterDamage);
        }

        this.ctx.fieldEffects.markUnchainedHazardsAfterAttack(sequence.chain);

        const totalArmor = sequence.chain.reduce((sum, step) => sum + step.armor, 0)
            + sequence.offChainArmor
            + sequence.abilityArmorGain;
        const remainingArmor = Math.max(0, totalArmor - this.armorGrantedThisAttack);

        this.ctx.player.shield += this.scalePlayerArmorGain(remainingArmor);

        if (sequence.abilityPoisonStacks > 0)
        {
            target.state.poison = (target.state.poison ?? 0) + sequence.abilityPoisonStacks;
        }

        this.damageDealtThisAttack = 0;
        this.armorGrantedThisAttack = 0;

        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_COMPLETED, {
            sequence,
            enemy: { ...target.state },
        });
        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.ctx.player.shield });
    }

    releaseAttackLock (): void
    {
        this.attackInProgress = false;
        this.doubleDamageThisAttack = false;
    }

    cancelAttack (): void
    {
        this.damageDealtThisAttack = 0;
        this.armorGrantedThisAttack = 0;
        this.attackInProgress = false;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_CANCELLED);
    }

    resolveEnemyAttack (damage: number): PlayerDamageResult
    {
        const scaledDamage = this.scaleEnemyAttackDamage(damage);

        if (scaledDamage <= 0)
        {
            return {
                player: { ...this.ctx.player },
                shieldAbsorbed: 0,
                healthDamage: 0,
            };
        }

        const mitigation = applyCombatHitMitigation(
            this.getPlayerCombatTraits(),
            scaledDamage,
            this.playerHitsBlockedRemaining,
        );

        this.playerHitsBlockedRemaining = mitigation.hitsBlockedRemaining;

        if (mitigation.result.blocked)
        {
            return {
                player: { ...this.ctx.player },
                shieldAbsorbed: 0,
                healthDamage: 0,
            };
        }

        const effectiveDamage = mitigation.result.damage;

        if (effectiveDamage <= 0)
        {
            return {
                player: { ...this.ctx.player },
                shieldAbsorbed: 0,
                healthDamage: 0,
            };
        }

        const shieldAbsorbed = Math.min(this.ctx.player.shield, effectiveDamage);
        const healthDamage = effectiveDamage - shieldAbsorbed;

        this.ctx.player.shield -= shieldAbsorbed;
        this.ctx.player.health = Math.max(0, this.ctx.player.health - healthDamage);

        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.ctx.player.shield });

        return {
            player: { ...this.ctx.player },
            shieldAbsorbed,
            healthDamage,
        };
    }

    resolveEnemyShield (shield: number, instanceId?: string): EnemyState
    {
        const combatant = instanceId
            ? this.ctx.getCombatantOrThrow(instanceId)
            : this.ctx.getTargetCombatant();

        combatant.state.shield += shield;

        return { ...combatant.state };
    }

    resolveAllyHeal (amount: number, targetInstanceId: string): EnemyState
    {
        const combatant = this.ctx.getCombatantOrThrow(targetInstanceId);
        const heal = Math.max(0, amount);

        combatant.state.health = Math.min(
            combatant.state.maxHealth,
            combatant.state.health + heal,
        );

        return { ...combatant.state };
    }

    resolveAllyShield (amount: number, targetInstanceId: string): EnemyState
    {
        return this.resolveEnemyShield(amount, targetInstanceId);
    }

    resolveHazardDamage (damage: number): PlayerDamageResult
    {
        return this.resolveEnemyAttack(damage);
    }

    getEnemyPoison (instanceId?: string): number
    {
        const combatant = instanceId
            ? this.ctx.getCombatant(instanceId)
            : this.ctx.getTargetCombatant();

        return combatant?.state.poison ?? 0;
    }

    tickPoison (instanceId?: string): DamageResult
    {
        const combatant = instanceId
            ? this.ctx.getCombatantOrThrow(instanceId)
            : this.ctx.getTargetCombatant();
        const stacks = combatant.state.poison ?? 0;

        if (stacks <= 0)
        {
            return {
                enemy: { ...combatant.state },
                shieldAbsorbed: 0,
                healthDamage: 0,
                targetInstanceId: combatant.instanceId,
            };
        }

        const wasAlive = isCombatantAlive(combatant);
        const healthDamage = Math.min(combatant.state.health, stacks);

        combatant.state.health = Math.max(0, combatant.state.health - stacks);
        combatant.state.poison = Math.max(0, stacks - 1);

        const enemyKilled = wasAlive && combatant.state.health <= 0;

        if (enemyKilled)
        {
            if (this.ctx.getAttackTargetId() === combatant.instanceId)
            {
                this.ctx.setAttackTargetId(null);
            }

            CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_DEFEATED, {
                enemy: { ...combatant.state },
                instanceId: combatant.instanceId,
            });
        }

        return {
            enemy: { ...combatant.state },
            shieldAbsorbed: 0,
            healthDamage,
            targetInstanceId: combatant.instanceId,
            enemyKilled,
        };
    }

    scaleEnemyAttackDamageForRamp (damage: number): number
    {
        return this.scaleEnemyAttackDamage(damage);
    }

    private getModifierTotals ()
    {
        return aggregateBattleModifiers(this.ctx.battleModifiers);
    }

    private scalePlayerDamageDealt (damage: number): number
    {
        let scaled = applyPlayerBuffModifier(damage, this.getModifierTotals().playerDamageDealt);

        if (this.doubleDamageThisAttack)
        {
            scaled *= 2;
        }

        return scaled;
    }

    private scalePlayerArmorGain (armor: number): number
    {
        return applyPlayerBuffModifier(armor, this.getModifierTotals().playerArmor);
    }

    private scaleEnemyAttackDamage (damage: number): number
    {
        const totals = this.getModifierTotals();

        return scaleIncomingDamage(damage, totals.enemyAttack, totals.playerDamageTaken);
    }
}
