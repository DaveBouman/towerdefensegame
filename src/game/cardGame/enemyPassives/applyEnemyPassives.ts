import { GRID_CONFIG } from '../../config/gridConfig';
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
import { GAME_RULES } from '../config/cardRegistry';
import { BATTLE_MODIFIER_PRESETS } from '../combat/battleModifierPresets';
import { random, randomInt } from '../../random/rng';

export interface EnemyTurnPlanningContext {
    enemy: LoadedCardGameEnemyDefinition;
    enemyState: EnemyState;
    enrageStacks: number;
    /** Number of enemy turns already taken this battle — drives Escalate ramp and Dead Zone cadence. */
    turnsTaken?: number;
    /** Global enemy phases completed — drives Stutter Clock. */
    globalEnemyTurns?: number;
    /** Temporary attack bonus from link rage or reroll tax. */
    bonusAttack?: number;
    /** Extra traps queued for this turn plan. */
    bonusTraps?: number;
    /** Lieutenant phase shift — adds attack/trap pressure below half HP. */
    phaseShiftActive?: boolean;
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
    bonusAttack = 0,
): EnemyTurnStep =>
{
    const lastStand = getEnemyPassive(passives, 'lastStand');

    if (lastStand && isLastStandActive(enemyState, lastStand))
    {
        if (lastStand.forceAttack)
        {
            return { kind: 'attack', amount: lastStand.attackDamage + bonusAttack };
        }

        return random() < enemy.attackChance
            ? { kind: 'attack', amount: lastStand.attackDamage + bonusAttack }
            : { kind: 'shield', amount: lastStand.shieldGain };
    }

    const enrage = getEnemyPassive(passives, 'enrage');
    const attackBonus = (enrage?.attackBonusPerTrap ?? 0) * enrageStacks + bonusAttack;

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

const buildCombatSteps = (
    enemy: LoadedCardGameEnemyDefinition,
    passives: readonly EnemyPassiveConfig[],
    combatStep: EnemyTurnStep,
    globalEnemyTurns: number,
): EnemyTurnStep[] =>
{
    const steps = [ combatStep ];
    const stutter = getEnemyPassive(passives, 'stutterClock');

    if (
        stutter
        && stutter.everyGlobalTurns > 0
        && globalEnemyTurns > 0
        && globalEnemyTurns % stutter.everyGlobalTurns === 0
    )
    {
        steps.push({ ...combatStep });
    }

    if (getEnemyPassive(passives, 'phantomIntent'))
    {
        const decoy: EnemyTurnStep = combatStep.kind === 'attack'
            ? { kind: 'shield', amount: enemy.shieldGain, decoy: true }
            : {
                kind: 'attack',
                amount: combatStep.amount ?? enemy.attackDamage,
                decoy: true,
            };

        steps.push(decoy);
    }

    return steps;
};

export const planEnemyTurnWithPassives = ({
    enemy,
    enemyState,
    enrageStacks,
    turnsTaken = 0,
    globalEnemyTurns = 0,
    bonusAttack = 0,
    bonusTraps = 0,
    phaseShiftActive = false,
}: EnemyTurnPlanningContext): EnemyTurnAction =>
{
    const passives = enemy.passives;
    const lastStand = getEnemyPassive(passives, 'lastStand');
    const enrage = getEnemyPassive(passives, 'enrage');
    const escalate = getEnemyPassive(passives, 'escalate');
    const dampen = getEnemyPassive(passives, 'dampenTiles');
    const pressure = getEnemyPassive(passives, 'pressureColumn');
    const nullifyLane = getEnemyPassive(passives, 'nullifyLane');
    const handRedirect = getEnemyPassive(passives, 'handRedirect');
    const siphonNode = getEnemyPassive(passives, 'siphonNode');
    const phaseShift = getEnemyPassive(passives, 'phaseShift');
    const inLastStand = lastStand ? isLastStandActive(enemyState, lastStand) : false;
    const baseHazards = inLastStand ? lastStand!.hazardsPerTurn : enemy.hazardsPerTurn;
    const extraHazards = (enrage?.extraTrapsPerTrap ?? 0) * enrageStacks;
    const escalateHazards = escalate ? escalate.trapsPerRamp * turnsTaken : 0;
    let phaseBonusAttack = bonusAttack;
    let phaseBonusTraps = bonusTraps;

    if (phaseShiftActive && phaseShift)
    {
        phaseBonusAttack += phaseShift.attackBonus;
        phaseBonusTraps += phaseShift.extraTraps;
    }

    let hazardCount = baseHazards + extraHazards + escalateHazards + phaseBonusTraps;

    if (escalate)
    {
        hazardCount = Math.min(hazardCount, escalate.maxTraps);
    }

    const steps: EnemyTurnStep[] = [];

    const modifierChance = GAME_RULES.battleModifier?.enemyIntentChance ?? 0;

    if (modifierChance > 0 && random() < modifierChance)
    {
        const preset = BATTLE_MODIFIER_PRESETS[randomInt(BATTLE_MODIFIER_PRESETS.length)]!;

        steps.push({
            kind: 'battle-mod',
            modifierStat: preset.stat,
            modifierDelta: preset.delta,
        });
    }

    steps.push(...buildCombatSteps(
        enemy,
        passives,
        planCombatStep(enemy, enemyState, passives, enrageStacks, phaseBonusAttack),
        globalEnemyTurns,
    ));

    // Dead Zone is an event the enemy casts on a cadence (telegraphed like a trap).
    if (dampen && dampen.everyTurns > 0 && turnsTaken % dampen.everyTurns === 0)
    {
        steps.push({ kind: 'dampen-field' });
    }

    // Column pressure: lock one board column (telegraphed with the column index).
    if (pressure)
    {
        const startCol = pressure.avoidStartColumn
            ? (GAME_RULES.activationStartColumn ?? 0) + 1
            : 0;
        const maxCol = GRID_CONFIG.cols - 1;

        if (startCol <= maxCol)
        {
            const column = startCol + randomInt(maxCol - startCol + 1);

            steps.push({ kind: 'lock-column', column, amount: column + 1 });
        }
    }

    // Null Strip: zero out one column or row (cards still placeable).
    if (nullifyLane)
    {
        const pickColumn = nullifyLane.axes === 'column'
            || (nullifyLane.axes === 'any' && random() < 0.5);

        if (pickColumn)
        {
            const startCol = nullifyLane.avoidStartColumn
                ? (GAME_RULES.activationStartColumn ?? 0) + 1
                : 0;
            const maxCol = GRID_CONFIG.cols - 1;

            if (startCol <= maxCol)
            {
                const column = startCol + randomInt(maxCol - startCol + 1);

                steps.push({
                    kind: 'nullify-lane',
                    axis: 'column',
                    column,
                    amount: column + 1,
                });
            }
        }
        else
        {
            const row = randomInt(GRID_CONFIG.rows);

            steps.push({
                kind: 'nullify-lane',
                axis: 'row',
                row,
                amount: row + 1,
            });
        }
    }

    // Signal Twist: scramble hand arrows for the rest of the energy round.
    if (handRedirect && handRedirect.everyTurns > 0 && turnsTaken % handRedirect.everyTurns === 0)
    {
        steps.push({ kind: 'redirect-hand' });
    }

    for (let i = 0; i < hazardCount; i++)
    {
        steps.push({ kind: 'place-hazard' });
    }

    const siphonCount = siphonNode?.nodesPerTurn ?? 0;

    for (let i = 0; i < siphonCount; i++)
    {
        steps.push({ kind: 'place-siphon' });
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

export type NullifyLane = {
    axis: 'column' | 'row';
    index: number;
};

export const isNullifiedSlot = (
    slot: SlotPosition,
    lane: NullifyLane,
): boolean =>
    lane.axis === 'column' ? slot.col === lane.index : slot.row === lane.index;

/** Zeros damage, armor, and ability payloads from cards on a nullified column/row. */
export const applyLaneNullify = (
    sequence: AttackSequence,
    lane: NullifyLane,
): AttackSequence =>
{
    let abilityEnemyDamage = sequence.abilityEnemyDamage;
    let abilityPlayerDamage = sequence.abilityPlayerDamage;
    let abilityArmorGain = sequence.abilityArmorGain;
    let abilityPoisonStacks = sequence.abilityPoisonStacks;

    const nullifiedIndexes = new Set<number>();
    const chain = sequence.chain.map((step, index) =>
    {
        if (!isNullifiedSlot(step.slot, lane))
        {
            return step;
        }

        nullifiedIndexes.add(index);

        if (step.damage === 0 && step.armor === 0)
        {
            return step;
        }

        return { ...step, damage: 0, armor: 0 };
    });

    const steps = chain.filter((step) => step.damage > 0).map(toAttackStep);
    const totalDamage = steps.reduce((sum, step) => sum + step.damage, 0);
    const chainAbilityEffects = sequence.chainAbilityEffects.map((effect) =>
    {
        if (!nullifiedIndexes.has(effect.stepIndex))
        {
            return effect;
        }

        abilityEnemyDamage -= effect.enemyDamage;
        abilityPlayerDamage -= effect.playerDamage;
        abilityArmorGain -= effect.armorGain;
        abilityPoisonStacks -= effect.poisonStacks;

        return {
            ...effect,
            enemyDamage: 0,
            playerDamage: 0,
            armorGain: 0,
            poisonStacks: 0,
        };
    });

    return {
        ...sequence,
        chain,
        steps,
        totalDamage,
        chainAbilityEffects,
        abilityEnemyDamage: Math.max(0, abilityEnemyDamage),
        abilityPlayerDamage: Math.max(0, abilityPlayerDamage),
        abilityArmorGain: Math.max(0, abilityArmorGain),
        abilityPoisonStacks: Math.max(0, abilityPoisonStacks),
    };
};

export const applyEnemyPassivesToSequence = (
    sequence: AttackSequence,
    enemyState: EnemyState,
    passives: readonly EnemyPassiveConfig[],
    chain: readonly ActivationStep[],
): AttackSequence =>
{
    const smoke = getEnemyPassive(passives, 'smoke');
    const wetBlanket = getEnemyPassive(passives, 'wetBlanket');
    const skillJamCount = passives
        .filter((passive): passive is Extract<EnemyPassiveConfig, { id: 'skillJam' }> =>
            passive.id === 'skillJam')
        .reduce((max, passive) => Math.max(max, passive.suppressedSkillCards), 0);

    if (!smoke && !wetBlanket && skillJamCount === 0)
    {
        return sequence;
    }

    let suppressedPoisonCards = smoke?.suppressedPoisonCards ?? 0;
    let suppressedSkillCards = skillJamCount;
    let abilityEnemyDamage = sequence.abilityEnemyDamage;
    let abilityPoisonStacks = sequence.abilityPoisonStacks;
    const chainAbilityEffects = sequence.chainAbilityEffects.map((effect) => ({ ...effect }));

    for (const effect of chainAbilityEffects)
    {
        const step = chain[effect.stepIndex];

        if (
            step
            && suppressedSkillCards > 0
            && step.behaviorId !== 'attack'
            && step.behaviorId !== 'defend'
        )
        {
            abilityEnemyDamage -= effect.enemyDamage;
            abilityPoisonStacks -= effect.poisonStacks;
            effect.enemyDamage = 0;
            effect.playerDamage = 0;
            effect.armorGain = 0;
            effect.poisonStacks = 0;
            suppressedSkillCards -= 1;
            continue;
        }

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
    damage: number,
    behaviorId?: string,
): number =>
{
    const thorns = getEnemyPassive(passives, 'thorns');

    if (!thorns || damage <= 0 || behaviorId !== 'attack')
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
