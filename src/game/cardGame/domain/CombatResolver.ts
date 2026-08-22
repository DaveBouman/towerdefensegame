import { BODY_MOD_IDS, CAPACITOR_BANK_ATTACK_MULTIPLIER, isFifthStrikeAttack, isSeventhStrikeAttack, PORTSIDE_GYRO_DAMAGE_MULTIPLIER } from '../../run/bodyMods';
import type { CardDirection } from './cardDirections';
import {
    GAME_RULES,
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
import { applyLinkRageToAllies, resolveBodyguardRedirect } from '../enemyPassives/interactionPassives';
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
    /** Shatter parent on kill; returns spawned part instance ids. */
    shatterCombatantIfNeeded (instanceId: string): string[];
    /** Card thief recovery, link rage, etc. */
    onCombatantKilled (instanceId: string): void;
    /** Lieutenant phase shift when HP crosses threshold. */
    tryTriggerPhaseShift (combatant: EnemyCombatant): { label: string; message: string } | null;
    getPlayerThorns (): number;
}

export class CombatResolver
{
    private attackInProgress = false;
    private damageDealtThisAttack = 0;
    private armorGrantedThisAttack = 0;
    private poisonAppliedThisAttack = 0;
    private siphonHealedThisAttack = 0;
    private playerDamageThisEnemyPhase = 0;
    private battleTotalDamageDealt = 0;
    private battleTotalDamageTaken = 0;
    private lastAttackDamageDealt = 0;
    private lastAttackArmorGained = 0;
    private runAttackCount: number;
    private doubleDamageThisAttack = false;
    private bodyguardRedirectUsedThisAttack = false;
    private playerHitsBlockedRemaining?: number;
    private chainDefendCount = 0;
    private capacitorChargeReady = false;

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

    /** Counts an in-chain defend step toward Capacitor Bank (not echo replays). */
    registerCapacitorDefendStep (): void
    {
        if (!this.ctx.bodyMods.includes(BODY_MOD_IDS.capacitorBank))
        {
            return;
        }

        this.chainDefendCount += 1;

        if (this.chainDefendCount % 3 === 0)
        {
            this.capacitorChargeReady = true;
        }
    }

    isCapacitorChargeReady (): boolean
    {
        return this.capacitorChargeReady;
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
        this.poisonAppliedThisAttack = 0;
        this.siphonHealedThisAttack = 0;
        this.doubleDamageThisAttack = false;
        this.bodyguardRedirectUsedThisAttack = false;
        this.playerDamageThisEnemyPhase = 0;
        this.chainDefendCount = 0;
        this.capacitorChargeReady = false;

        if (!this.ctx.puzzleMode)
        {
            this.runAttackCount += 1;

            if (this.ctx.bodyMods.includes(BODY_MOD_IDS.markSeven)
                && isSeventhStrikeAttack(this.runAttackCount))
            {
                this.doubleDamageThisAttack = true;
            }

            if (this.ctx.bodyMods.includes(BODY_MOD_IDS.markFive)
                && isFifthStrikeAttack(this.runAttackCount))
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
        sourceBehaviorId?: string,
        sourceArrow?: CardDirection,
    ): DamageResult
    {
        if (this.ctx.getLivingCombatants().length === 0)
        {
            return {
                enemy: { health: 0, maxHealth: 0, shield: 0 },
                shieldAbsorbed: 0,
                healthDamage: 0,
            };
        }

        const targetId = this.ctx.resolveAttackTargetId(targetInstanceId);
        const redirect = resolveBodyguardRedirect(
            targetId,
            this.ctx.getCombatants(),
            this.bodyguardRedirectUsedThisAttack,
        );
        this.bodyguardRedirectUsedThisAttack = redirect.redirectUsed;
        const resolvedTargetId = redirect.targetInstanceId;
        const combatant = this.ctx.getCombatantOrThrow(resolvedTargetId);
        const scaledDamage = this.scalePlayerDamageDealt(damage, sourceArrow, sourceBehaviorId);

        if (scaledDamage <= 0)
        {
            return {
                enemy: { ...combatant.state },
                shieldAbsorbed: 0,
                healthDamage: 0,
                targetInstanceId: resolvedTargetId,
            };
        }

        const mitigation = applyEnemyHitMitigation(combatant, scaledDamage);

        if (mitigation.blocked)
        {
            return {
                enemy: { ...combatant.state },
                shieldAbsorbed: 0,
                healthDamage: 0,
                targetInstanceId: resolvedTargetId,
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
                targetInstanceId: resolvedTargetId,
            };
        }

        const wasAlive = isCombatantAlive(combatant);
        const shieldAbsorbed = Math.min(combatant.state.shield, effectiveDamage);
        const healthDamage = effectiveDamage - shieldAbsorbed;

        combatant.state.shield -= shieldAbsorbed;
        combatant.state.health = Math.max(0, combatant.state.health - healthDamage);
        this.damageDealtThisAttack += effectiveDamage;
        this.battleTotalDamageDealt += effectiveDamage;
        this.ctx.tryTriggerPhaseShift(combatant);

        const enemyKilled = wasAlive && combatant.state.health <= 0;
        const killExtras = enemyKilled
            ? this.handleEnemyKilled(combatant, resolvedTargetId, sourceDefinitionId)
            : {};

        const thornsDamage = computeThornsReflectDamage(
            combatant.definition.passives,
            effectiveDamage,
            sourceBehaviorId,
        );

        const base: DamageResult = {
            enemy: { ...combatant.state },
            shieldAbsorbed,
            healthDamage,
            targetInstanceId: resolvedTargetId,
            enemyKilled,
            spawnedInstanceIds: killExtras.spawnedInstanceIds,
            healOnKill: killExtras.healOnKill,
        };

        if (thornsDamage <= 0)
        {
            return base;
        }

        const reflect = this.resolveEnemyAttack(thornsDamage);

        return {
            ...base,
            thornsDamage: reflect.healthDamage + reflect.shieldAbsorbed,
            thornsShieldAbsorbed: reflect.shieldAbsorbed,
            thornsHealthDamage: reflect.healthDamage,
        };
    }

    private handleEnemyKilled (
        combatant: EnemyCombatant,
        instanceId: string,
        sourceDefinitionId?: string,
    ): { healOnKill?: number; spawnedInstanceIds?: string[] }
    {
        if (this.ctx.getAttackTargetId() === instanceId)
        {
            this.ctx.setAttackTargetId(null);
        }

        CardGameEventBus.emit(CARD_GAME_EVENTS.ENEMY_DEFEATED, {
            enemy: { ...combatant.state },
            instanceId,
        });

        this.ctx.onCombatantKilled(instanceId);

        const spawned = this.ctx.shatterCombatantIfNeeded(instanceId);
        let healOnKill: number | undefined;

        if (sourceDefinitionId)
        {
            const amount = getCardHealOnKill(getCardDefinitionOrThrow(sourceDefinitionId));

            if (amount > 0)
            {
                this.healPlayer(amount);
                healOnKill = amount;
            }
        }

        return {
            healOnKill,
            spawnedInstanceIds: spawned.length > 0 ? spawned : undefined,
        };
    }

    completeAttack (sequence: AttackSequence): void
    {
        const remainingDamage = sequence.totalDamage - this.damageDealtThisAttack;
        const fightOver = this.ctx.getLivingCombatants().length === 0 || this.ctx.player.health <= 0;

        if (remainingDamage > 0 && this.ctx.getLivingCombatants().length > 0)
        {
            this.dealAttackDamage(remainingDamage);
        }

        const target = this.ctx.getTargetCombatant();

        if (!fightOver)
        {
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
        }

        this.ctx.fieldEffects.resolveHazardsAfterAttack(sequence.chain);

        const remainingSiphonHeal = Math.max(0, sequence.siphonHeal - this.siphonHealedThisAttack);

        if (remainingSiphonHeal > 0 && !fightOver)
        {
            this.resolveSiphonHeal(remainingSiphonHeal);
        }

        const totalArmor = sequence.chain.reduce((sum, step) => sum + step.armor, 0)
            + sequence.offChainArmor
            + sequence.abilityArmorGain;
        const remainingArmor = Math.max(0, totalArmor - this.armorGrantedThisAttack);

        this.ctx.player.shield += this.scalePlayerArmorGain(remainingArmor);

        const remainingPoison = Math.max(
            0,
            this.scalePoisonStacks(sequence.abilityPoisonStacks) - this.poisonAppliedThisAttack,
        );

        if (remainingPoison > 0)
        {
            target.state.poison = (target.state.poison ?? 0) + remainingPoison;
        }

        this.lastAttackDamageDealt = this.damageDealtThisAttack;
        this.lastAttackArmorGained = this.armorGrantedThisAttack;
        this.damageDealtThisAttack = 0;
        this.armorGrantedThisAttack = 0;
        this.poisonAppliedThisAttack = 0;
        this.siphonHealedThisAttack = 0;

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
        this.poisonAppliedThisAttack = 0;
        this.siphonHealedThisAttack = 0;
        this.attackInProgress = false;
        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_CANCELLED);
    }

    resolveEnemyAttack (damage: number, attackerInstanceId?: string): PlayerDamageResult
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
        const totalTaken = shieldAbsorbed + healthDamage;
        this.playerDamageThisEnemyPhase += totalTaken;
        this.battleTotalDamageTaken += totalTaken;

        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.ctx.player.shield });

        const hit: PlayerDamageResult = {
            player: { ...this.ctx.player },
            shieldAbsorbed,
            healthDamage,
        };

        const reflectedThorns = this.reflectPlayerThorns(attackerInstanceId);

        if (!reflectedThorns)
        {
            return hit;
        }

        return {
            ...hit,
            reflectedThorns,
        };
    }

    private reflectPlayerThorns (attackerInstanceId?: string): DamageResult | undefined
    {
        const thorns = this.ctx.getPlayerThorns();

        if (thorns <= 0 || !attackerInstanceId)
        {
            return undefined;
        }

        const attacker = this.ctx.getCombatant(attackerInstanceId);

        if (!attacker || !isCombatantAlive(attacker))
        {
            return undefined;
        }

        return this.dealAttackDamage(thorns, attackerInstanceId, 'thorns', 'thorns');
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

    /**
     * Unchained leech nodes heal a living enemy. Does not revive if the fight is over.
     * Prefers the current attack target when it is still alive.
     */
    resolveSiphonHeal (amount: number): { healed: number; targetInstanceId?: string }
    {
        const heal = Math.max(0, amount);
        const living = this.ctx.getLivingCombatants();

        if (heal <= 0 || living.length === 0)
        {
            return { healed: 0 };
        }

        const preferredId = this.ctx.getAttackTargetId();
        const combatant = living.find((entry) => entry.instanceId === preferredId) ?? living[0]!;
        const before = combatant.state.health;

        combatant.state.health = Math.min(
            combatant.state.maxHealth,
            combatant.state.health + heal,
        );

        const healed = combatant.state.health - before;
        this.siphonHealedThisAttack += healed;

        return { healed, targetInstanceId: combatant.instanceId };
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

    /** Applies poison stacks during chain playback; completeAttack only adds any remainder. */
    applyPoisonStacks (stacks: number, targetInstanceId?: string): number
    {
        const scaled = this.scalePoisonStacks(stacks);

        if (scaled <= 0 || this.ctx.getLivingCombatants().length === 0)
        {
            return 0;
        }

        const targetId = this.ctx.resolveAttackTargetId(targetInstanceId);
        const combatant = this.ctx.getCombatantOrThrow(targetId);

        combatant.state.poison = (combatant.state.poison ?? 0) + scaled;
        this.poisonAppliedThisAttack += scaled;

        return scaled;
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
        const damagePerStack = Math.max(1, GAME_RULES.chainAbilities.poisonTrail.damagePerStack);
        const rawDamage = stacks * damagePerStack;
        const healthDamage = Math.min(combatant.state.health, rawDamage);

        combatant.state.health = Math.max(0, combatant.state.health - rawDamage);
        combatant.state.poison = Math.max(0, stacks - 1);

        const enemyKilled = wasAlive && combatant.state.health <= 0;
        const killExtras = enemyKilled
            ? this.handleEnemyKilled(combatant, combatant.instanceId)
            : {};

        return {
            enemy: { ...combatant.state },
            shieldAbsorbed: 0,
            healthDamage,
            targetInstanceId: combatant.instanceId,
            enemyKilled,
            spawnedInstanceIds: killExtras.spawnedInstanceIds,
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

    private scalePlayerDamageDealt (
        damage: number,
        sourceArrow?: CardDirection,
        sourceBehaviorId?: string,
    ): number
    {
        let scaled = applyPlayerBuffModifier(damage, this.getModifierTotals().playerDamageDealt);

        if (this.doubleDamageThisAttack)
        {
            scaled *= 2;
        }

        if (this.ctx.bodyMods.includes(BODY_MOD_IDS.razorFeed))
        {
            scaled += 2;
        }

        if (sourceArrow === 'left'
            && this.ctx.bodyMods.includes(BODY_MOD_IDS.portsideGyro)
            && scaled > 0)
        {
            scaled = Math.ceil(scaled * PORTSIDE_GYRO_DAMAGE_MULTIPLIER);
        }

        if (this.capacitorChargeReady
            && sourceBehaviorId === 'attack'
            && scaled > 0
            && this.ctx.bodyMods.includes(BODY_MOD_IDS.capacitorBank))
        {
            scaled = Math.ceil(scaled * CAPACITOR_BANK_ATTACK_MULTIPLIER);
            this.capacitorChargeReady = false;
        }

        return scaled;
    }

    private scalePlayerArmorGain (armor: number): number
    {
        let scaled = applyPlayerBuffModifier(armor, this.getModifierTotals().playerArmor);

        if (this.ctx.bodyMods.includes(BODY_MOD_IDS.carapaceWeave) && scaled > 0)
        {
            scaled = Math.ceil(scaled * 1.5);
        }

        return scaled;
    }

    /** Rad stacks after Venom Latch (and any future toxin chrome). */
    scalePoisonStacks (stacks: number): number
    {
        if (stacks <= 0)
        {
            return 0;
        }

        if (this.ctx.bodyMods.includes(BODY_MOD_IDS.venomLatch))
        {
            return stacks * 2;
        }

        return stacks;
    }

    /** Ability payload damage after playstyle chrome (fire / bleed). */
    scaleAbilityEnemyDamage (abilityId: string, damage: number): number
    {
        if (damage <= 0)
        {
            return 0;
        }

        let scaled = damage;

        if (abilityId === 'fire-alternation'
            && this.ctx.bodyMods.includes(BODY_MOD_IDS.pyreLink))
        {
            scaled = Math.ceil(scaled * 1.5);
        }

        if (abilityId === 'bleed'
            && this.ctx.bodyMods.includes(BODY_MOD_IDS.hemorrhageCoil))
        {
            scaled = Math.ceil(scaled * 1.5);
        }

        return scaled;
    }

    private scaleEnemyAttackDamage (damage: number): number
    {
        const totals = this.getModifierTotals();

        return scaleIncomingDamage(damage, totals.enemyAttack, totals.playerDamageTaken);
    }

    getCombatRecap (): { damageDealt: number; armorGained: number; damageTaken: number }
    {
        return {
            damageDealt: this.lastAttackDamageDealt,
            armorGained: this.lastAttackArmorGained,
            damageTaken: this.playerDamageThisEnemyPhase,
        };
    }

    getBattleDamageTotals (): { dealt: number; taken: number }
    {
        return {
            dealt: this.battleTotalDamageDealt,
            taken: this.battleTotalDamageTaken,
        };
    }
}
