import { getUnchainedHazardSlots } from '../combat/AttackPipeline';
import type { BoardModel } from '../domain/BoardModel';
import { slotKey } from '../domain/cardDirections';
import type {
    ActivationStep,
    AttackSequence,
    AttackStep,
    EnemyState,
    EnemyTurnAction,
    EnemyTurnStep,
    SlotPosition,
} from '../domain/types';
import type { LoadedCardGameEnemyDefinition } from '../config/enemyCatalog';
import { getEnemyPassive } from './defaults';
import type { EnemyPassiveConfig } from './types';
import { random, randomInt } from '../../random/rng';

export interface EnemyTurnPlanningContext {
    enemy: LoadedCardGameEnemyDefinition;
    enemyState: EnemyState;
    enrageStacks: number;
    /** Number of enemy turns already taken this battle — drives Escalate ramp and Dead Zone cadence. */
    turnsTaken?: number;
}

const isLastStandActive = (
    enemyState: EnemyState,
    passive: Extract<EnemyPassiveConfig, { id: 'lastStand' }>,
): boolean =>
    enemyState.maxHealth > 0
    && enemyState.health / enemyState.maxHealth <= passive.healthRatio;

const planCombatStep = (
    enemy: LoadedCardGameEnemyDefinition,
    enemyState: EnemyState,
    passives: readonly EnemyPassiveConfig[],
    enrageStacks: number,
): EnemyTurnStep =>
{
    const lastStand = getEnemyPassive(passives, 'lastStand');

    if (lastStand && isLastStandActive(enemyState, lastStand))
    {
        if (lastStand.forceAttack)
        {
            return { kind: 'attack', amount: lastStand.attackDamage };
        }

        return random() < enemy.attackChance
            ? { kind: 'attack', amount: lastStand.attackDamage }
            : { kind: 'shield', amount: lastStand.shieldGain };
    }

    const enrage = getEnemyPassive(passives, 'enrage');
    const attackBonus = (enrage?.attackBonusPerTrap ?? 0) * enrageStacks;

    if (random() < enemy.attackChance)
    {
        return {
            kind: 'attack',
            amount: enemy.attackDamage + attackBonus,
        };
    }

    return {
        kind: 'shield',
        amount: enemy.shieldGain,
    };
};

export const planEnemyTurnWithPassives = ({
    enemy,
    enemyState,
    enrageStacks,
    turnsTaken = 0,
}: EnemyTurnPlanningContext): EnemyTurnAction =>
{
    const passives = enemy.passives;
    const lastStand = getEnemyPassive(passives, 'lastStand');
    const enrage = getEnemyPassive(passives, 'enrage');
    const escalate = getEnemyPassive(passives, 'escalate');
    const dampen = getEnemyPassive(passives, 'dampenTiles');
    const inLastStand = lastStand ? isLastStandActive(enemyState, lastStand) : false;
    const baseHazards = inLastStand ? lastStand!.hazardsPerTurn : enemy.hazardsPerTurn;
    const extraHazards = (enrage?.extraTrapsPerTrap ?? 0) * enrageStacks;
    const escalateHazards = escalate ? escalate.trapsPerRamp * turnsTaken : 0;
    let hazardCount = baseHazards + extraHazards + escalateHazards;

    if (escalate)
    {
        hazardCount = Math.min(hazardCount, escalate.maxTraps);
    }

    const steps: EnemyTurnStep[] = [ planCombatStep(enemy, enemyState, passives, enrageStacks) ];

    // Dead Zone is an event the enemy casts on a cadence (telegraphed like a trap).
    if (dampen && dampen.everyTurns > 0 && turnsTaken % dampen.everyTurns === 0)
    {
        steps.push({ kind: 'dampen-field' });
    }

    for (let i = 0; i < hazardCount; i++)
    {
        steps.push({ kind: 'place-hazard' });
    }

    return {
        enemyId: enemy.id,
        steps,
    };
};

export type DampenField = Pick<
    Extract<EnemyPassiveConfig, { id: 'dampenTiles' }>,
    'parity' | 'multiplier'
>;

export const isDampenedTile = (
    { row, col }: SlotPosition,
    parity: DampenField['parity'],
): boolean =>
{
    const even = (row + col) % 2 === 0;

    return parity === 'even' ? even : !even;
};

const toAttackStep = (step: ActivationStep): AttackStep => ({
    slot: step.slot,
    card: step.card,
    definitionId: step.definitionId,
    damage: step.damage,
    behaviorId: step.behaviorId,
    visualId: step.visualId,
});

/** Halves a card's damage/armor on dead-zone tiles, then recomputes derived totals. */
export const applyTileDampening = (
    sequence: AttackSequence,
    dampen: DampenField,
): AttackSequence =>
{
    const chain = sequence.chain.map((step) =>
    {
        if (!isDampenedTile(step.slot, dampen.parity))
        {
            return step;
        }

        const damage = step.damage > 0 ? Math.floor(step.damage * dampen.multiplier) : step.damage;
        const armor = step.armor > 0 ? Math.floor(step.armor * dampen.multiplier) : step.armor;

        if (damage === step.damage && armor === step.armor)
        {
            return step;
        }

        return { ...step, damage, armor };
    });

    const steps = chain.filter((step) => step.damage > 0).map(toAttackStep);
    const totalDamage = steps.reduce((sum, step) => sum + step.damage, 0);

    return { ...sequence, chain, steps, totalDamage };
};

export const applyEnemyPassivesToSequence = (
    sequence: AttackSequence,
    enemyState: EnemyState,
    passives: readonly EnemyPassiveConfig[],
): AttackSequence =>
{
    const smoke = getEnemyPassive(passives, 'smoke');
    const wetBlanket = getEnemyPassive(passives, 'wetBlanket');

    if (!smoke && !wetBlanket)
    {
        return sequence;
    }

    let suppressedPoisonCards = smoke?.suppressedPoisonCards ?? 0;
    let abilityEnemyDamage = sequence.abilityEnemyDamage;
    let abilityPoisonStacks = sequence.abilityPoisonStacks;
    const chainAbilityEffects = sequence.chainAbilityEffects.map((effect) => ({ ...effect }));

    for (const effect of chainAbilityEffects)
    {
        if (effect.abilityId === 'poison-trail' && suppressedPoisonCards > 0)
        {
            abilityPoisonStacks -= effect.poisonStacks;
            effect.enemyDamage = 0;
            effect.playerDamage = 0;
            effect.armorGain = 0;
            effect.poisonStacks = 0;
            suppressedPoisonCards -= 1;
            continue;
        }

        if (effect.abilityId === 'fire-alternation' && wetBlanket && enemyState.shield > 0)
        {
            const scaled = Math.round(effect.enemyDamage * wetBlanket.fireAlternationMultiplier);
            abilityEnemyDamage += scaled - effect.enemyDamage;
            effect.enemyDamage = scaled;
        }
    }

    return {
        ...sequence,
        chainAbilityEffects,
        abilityEnemyDamage: Math.max(0, abilityEnemyDamage),
        abilityPoisonStacks: Math.max(0, abilityPoisonStacks),
    };
};

export const computeThornsReflectDamage = (
    passives: readonly EnemyPassiveConfig[],
    enemyShieldBefore: number,
    damage: number,
): number =>
{
    const thorns = getEnemyPassive(passives, 'thorns');

    if (!thorns || damage <= 0 || enemyShieldBefore <= 0)
    {
        return 0;
    }

    return thorns.reflectDamage;
};

export interface PostAttackPassiveResult {
    enrageStacks: number;
    loopHunterDamage: number;
    jammerShield: number;
}

export const resolvePostAttackPassives = (
    board: BoardModel,
    sequence: AttackSequence,
    passives: readonly EnemyPassiveConfig[],
): PostAttackPassiveResult =>
{
    const enrage = getEnemyPassive(passives, 'enrage');
    const loopHunter = getEnemyPassive(passives, 'loopHunter');
    const jammer = getEnemyPassive(passives, 'jammer');
    const unchainedTrapCount = getUnchainedHazardSlots(board, sequence.chain).length;
    const usedLoop = sequence.chain.some((step) => step.behaviorId === 'loop-reset');

    return {
        enrageStacks: enrage ? unchainedTrapCount : 0,
        loopHunterDamage: loopHunter && usedLoop ? loopHunter.damage : 0,
        jammerShield: jammer && sequence.chain.length >= jammer.minChainLength
            ? jammer.shieldGain
            : 0,
    };
};

export const placeSilenceTiles = (
    board: BoardModel,
    silencedSlots: Set<string>,
    passives: readonly EnemyPassiveConfig[],
): SlotPosition[] =>
{
    const silenceTile = getEnemyPassive(passives, 'silenceTile');

    if (!silenceTile || silenceTile.tilesPerTurn <= 0)
    {
        return [];
    }

    const candidates: SlotPosition[] = [];

    for (const slot of board.slotsInOrder())
    {
        if (board.isEmpty(slot) && !silencedSlots.has(slotKey(slot)))
        {
            candidates.push({ ...slot });
        }
    }

    const placed: SlotPosition[] = [];
    const pool = [ ...candidates ];

    for (let i = 0; i < silenceTile.tilesPerTurn && pool.length > 0; i++)
    {
        const index = randomInt(pool.length);
        const slot = pool.splice(index, 1)[0]!;

        silencedSlots.add(slotKey(slot));
        placed.push(slot);
    }

    return placed;
};
