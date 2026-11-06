import { seedScope } from '../../random/rng';
import type {
    AbilityId,
    BattleEvent,
    BattleResult,
    BattleSide,
    Team,
    UnitInstance,
} from '../types';
import { cloneTeam, createUnitInstance, getAbilityId, getUnitDefinitionOrThrow } from '../unitRegistry';

interface BattleUnit extends UnitInstance {
    side: BattleSide;
}

type Board = BattleUnit[];

const living = (board: Board): Board => board.filter((unit) => unit.health > 0);

const findIndex = (board: Board, uid: string): number =>
    board.findIndex((unit) => unit.uid === uid);

const toBoard = (side: BattleSide, team: Team): Board =>
    team
        .filter((slot): slot is UnitInstance => slot !== null)
        .map((unit) => ({ ...unit, side }));

const pushBuff = (
    log: BattleEvent[],
    unit: BattleUnit,
    attackDelta: number,
    healthDelta: number,
): void =>
{
    unit.attack = Math.max(0, unit.attack + attackDelta);
    unit.health += healthDelta;
    unit.maxHealth += Math.max(0, healthDelta);
    log.push({
        type: 'buff',
        side: unit.side,
        uid: unit.uid,
        attackDelta,
        healthDelta,
    });
};

const applyDamage = (
    log: BattleEvent[],
    target: BattleUnit,
    amount: number,
    boards: { a: Board; b: Board },
    attacker?: BattleUnit,
): void =>
{
    if (amount <= 0 || target.health <= 0)
    {
        return;
    }

    target.health -= amount;
    log.push({
        type: 'damage',
        side: target.side,
        uid: target.uid,
        amount,
        healthAfter: target.health,
    });

    if (attacker && target.health > 0 && getAbilityId(target.definitionId) === 'hurtReflect')
    {
        applyDamage(log, attacker, 1, boards);
    }

    if (target.health <= 0)
    {
        resolveFaint(log, target, boards, attacker);
    }
};

const summon = (
    log: BattleEvent[],
    side: BattleSide,
    boards: { a: Board; b: Board },
    definitionId: string,
    attack: number,
    health: number,
    atIndex: number,
): void =>
{
    const board = boards[side];

    if (board.length >= 5)
    {
        return;
    }

    const unit = createUnitInstance(definitionId, { attack, health, maxHealth: health });
    const battleUnit: BattleUnit = { ...unit, side };
    const insertAt = Math.min(Math.max(0, atIndex), board.length);
    board.splice(insertAt, 0, battleUnit);
    log.push({
        type: 'summon',
        side,
        uid: battleUnit.uid,
        definitionId,
        slot: insertAt,
        attack,
        health,
    });
};

const resolveFaint = (
    log: BattleEvent[],
    unit: BattleUnit,
    boards: { a: Board; b: Board },
    killer?: BattleUnit,
): void =>
{
    const board = boards[unit.side];
    const index = findIndex(board, unit.uid);

    if (index < 0)
    {
        return;
    }

    board.splice(index, 1);
    log.push({
        type: 'faint',
        side: unit.side,
        uid: unit.uid,
        definitionId: unit.definitionId,
    });

    const ability = getAbilityId(unit.definitionId);
    const enemyBoard = boards[unit.side === 'a' ? 'b' : 'a'];

    if (ability === 'faintSummonSpark')
    {
        summon(log, unit.side, boards, 'striker', 1, 1, index);
    }

    if (ability === 'faintAoe')
    {
        for (const enemy of [ ...living(enemyBoard) ])
        {
            applyDamage(log, enemy, 1, boards);
        }
    }

    if (ability === 'faintHurtAttacker' && killer && killer.health > 0)
    {
        applyDamage(log, killer, 3, boards);
    }
};

const runStartOfBattle = (
    log: BattleEvent[],
    boards: { a: Board; b: Board },
): void =>
{
    const starters = [ ...boards.a, ...boards.b ];

    for (const unit of starters)
    {
        if (unit.health <= 0)
        {
            continue;
        }

        const ability: AbilityId = getAbilityId(unit.definitionId);
        log.push({
            type: 'startOfBattle',
            side: unit.side,
            uid: unit.uid,
            definitionId: unit.definitionId,
        });

        const board = boards[unit.side];
        const index = findIndex(board, unit.uid);
        const enemyFront = living(boards[unit.side === 'a' ? 'b' : 'a'])[0];

        if (ability === 'buffBehindStart' && index >= 0)
        {
            const behind = board[index + 1];

            if (behind && behind.health > 0)
            {
                pushBuff(log, behind, 0, 1);
            }
        }

        if (ability === 'snipeFrontStart' && enemyFront)
        {
            applyDamage(log, enemyFront, 2, boards, unit);
        }

        if (ability === 'buffAdjacentStart' && index >= 0)
        {
            const left = board[index - 1];
            const right = board[index + 1];

            if (left && left.health > 0)
            {
                pushBuff(log, left, 1, 1);
            }

            if (right && right.health > 0)
            {
                pushBuff(log, right, 1, 1);
            }
        }
    }
};

const beforeAttack = (
    log: BattleEvent[],
    attacker: BattleUnit,
    boards: { a: Board; b: Board },
): void =>
{
    const ability = getAbilityId(attacker.definitionId);
    const board = boards[attacker.side];
    const index = findIndex(board, attacker.uid);
    const enemies = living(boards[attacker.side === 'a' ? 'b' : 'a']);

    if (ability === 'lonelyPower' && index >= 0 && !board[index + 1])
    {
        pushBuff(log, attacker, 2, 0);
    }

    if (ability === 'splashBeforeAttack' && enemies[1])
    {
        applyDamage(log, enemies[1]!, 1, boards, attacker);
    }
};

const afterKnockOut = (
    log: BattleEvent[],
    attacker: BattleUnit,
    boards: { a: Board; b: Board },
): void =>
{
    const ability = getAbilityId(attacker.definitionId);

    if (ability === 'knockOutHeal' && attacker.health > 0)
    {
        const amount = 3;
        attacker.health = Math.min(attacker.maxHealth, attacker.health + amount);
        log.push({
            type: 'heal',
            side: attacker.side,
            uid: attacker.uid,
            amount,
            healthAfter: attacker.health,
        });
    }

    if (ability === 'knockOutPushBack' && attacker.health > 0)
    {
        const board = boards[attacker.side];
        const from = findIndex(board, attacker.uid);

        if (from >= 0 && from < board.length - 1)
        {
            board.splice(from, 1);
            board.push(attacker);
            log.push({
                type: 'move',
                side: attacker.side,
                uid: attacker.uid,
                from,
                to: board.length - 1,
            });
        }
    }
};

/**
 * Pure deterministic battle. Callers must not rely on global RNG after this
 * beyond what `seed` scopes here (reserved for future random abilities).
 */
export const simulateBattle = (
    seed: string,
    teamA: Team,
    teamB: Team,
): BattleResult =>
{
    seedScope(seed, 'battle');
    const log: BattleEvent[] = [ { type: 'start', seed } ];
    const boards = {
        a: toBoard('a', cloneTeam(teamA)),
        b: toBoard('b', cloneTeam(teamB)),
    };

    runStartOfBattle(log, boards);

    let guard = 0;

    while (living(boards.a).length > 0 && living(boards.b).length > 0 && guard < 200)
    {
        guard += 1;
        const attackerA = living(boards.a)[0]!;
        const attackerB = living(boards.b)[0]!;

        beforeAttack(log, attackerA, boards);

        if (attackerA.health <= 0 || attackerB.health <= 0)
        {
            continue;
        }

        beforeAttack(log, attackerB, boards);

        if (attackerA.health <= 0 || attackerB.health <= 0)
        {
            continue;
        }

        const dmgA = attackerA.attack;
        const dmgB = attackerB.attack;

        log.push({
            type: 'attack',
            attackerSide: 'a',
            attackerUid: attackerA.uid,
            defenderUid: attackerB.uid,
            damage: dmgA,
        });
        log.push({
            type: 'attack',
            attackerSide: 'b',
            attackerUid: attackerB.uid,
            defenderUid: attackerA.uid,
            damage: dmgB,
        });

        applyDamage(log, attackerB, dmgA, boards, attackerA);
        applyDamage(log, attackerA, dmgB, boards, attackerB);

        const aAlive = attackerA.health > 0;
        const bAlive = attackerB.health > 0;

        if (aAlive && !bAlive)
        {
            afterKnockOut(log, attackerA, boards);
        }

        if (bAlive && !aAlive)
        {
            afterKnockOut(log, attackerB, boards);
        }
    }

    const survivingA = living(boards.a).length;
    const survivingB = living(boards.b).length;
    let winner: BattleResult['winner'] = 'draw';

    if (survivingA > 0 && survivingB === 0)
    {
        winner = 'a';
    }
    else if (survivingB > 0 && survivingA === 0)
    {
        winner = 'b';
    }

    log.push({ type: 'end', winner });

    return { winner, log, survivingA, survivingB };
};

export const describeUnit = (definitionId: string): string =>
    getUnitDefinitionOrThrow(definitionId).label;
