import { GAME_RULES } from '../../config/cardRegistry';
import type { ChainAbilityEffect } from '../../abilities/types';
import { isOnStepChainAbility } from '../../abilities/chainAbilityRegistry';
import type { BoardModel } from '../../domain/BoardModel';
import type { CardGameSession } from '../../domain/CardGameSession';
import type { ActivationStep, AttackSequence, SlotPosition } from '../../domain/types';
import type { CardBoardView } from '../../../board/CardBoardView';
import type { EnemySquadView } from '../../../board/EnemySquadView';
import type { ArmorView } from '../../../board/ArmorView';
import { playFloatingText } from '../visualEffects/visualEffectTweens';
import { getCardVisualEffectOrThrow } from '../visualEffects/visualEffectRegistry';
import { playAbilityProcSfx } from '../../../audio/bindGameAudio';
import {
    applyEnemyHitResult,
    applyPlayerDamage,
    type CombatHitVisualDeps,
} from './combatHitVisuals';

export interface ChainEndEffectsDeps extends CombatHitVisualDeps
{
    boardView: CardBoardView;
    enemySquad: EnemySquadView;
    armorView: ArmorView;
    scheduleAttackTimer: (callback: () => void, delayMs: number) => void;
}

export function playEndOfChainEffects (
    deps: ChainEndEffectsDeps,
    sequence: AttackSequence,
    chain: ActivationStep[],
    board: BoardModel,
    offChainSlots: SlotPosition[],
    hazardSlots: SlotPosition[],
    siphonSlots: SlotPosition[],
    onComplete: () => void,
): void
{
    const stepMs = GAME_RULES.activationStepMs;
    // On-step abilities (e.g. Overload) already played during their card's activation.
    const abilityEffects = [ ...sequence.chainAbilityEffects ]
        .filter((effect) => !isOnStepChainAbility(effect.abilityId))
        .sort((a, b) => a.stepIndex - b.stepIndex);
    const tasks: Array<(done: () => void) => void> = [];

    for (const effect of abilityEffects)
    {
        tasks.push((done) => playChainAbilityEffectVisual(deps, effect, done));
    }

    if (offChainSlots.length > 0)
    {
        tasks.push((done) => playOffChainBonusVisual(deps, offChainSlots, sequence, done));
    }

    if (hazardSlots.length > 0 || sequence.abilityPlayerDamage > 0)
    {
        tasks.push((done) => playHazardBurstVisual(deps, hazardSlots, sequence, done));
    }

    if (siphonSlots.length > 0 || sequence.siphonHeal > 0)
    {
        tasks.push((done) => playSiphonHealVisual(deps, siphonSlots, sequence, done));
    }

    if (tasks.length === 0)
    {
        onComplete();
        return;
    }

    const runTask = (index: number): void =>
    {
        if (index >= tasks.length)
        {
            onComplete();
            return;
        }

        tasks[index]!(() =>
        {
            deps.scheduleAttackTimer(() =>
            {
                runTask(index + 1);
            }, Math.round(stepMs * 0.35));
        });
    };

    runTask(0);
}

/** Shared ability beat — used mid-chain (Surge overload) and at end-of-chain. */
export function playChainAbilityEffectVisual (
    deps: ChainEndEffectsDeps,
    effect: ChainAbilityEffect,
    onComplete: () => void,
): void
{
    const { session, boardView, armorView, setDisplayedArmor, scheduleAttackTimer } = deps;
    const chainStep = effect.stepIndex >= 0 ? { slot: effect.slot, visualId: effect.visualId } : null;

    if (chainStep)
    {
        playAbilityProcSfx(effect.visualId, effect.abilityId);
        pulseAbilityCard(deps, effect.slot, effect.visualId, GAME_RULES.activationStepMs);
    }

    try
    {
        if (effect.armorGain > 0)
        {
            session.grantPlayerShield(effect.armorGain);
            setDisplayedArmor(session.getPlayer().shield);
            armorView.showShieldGain(session.getScaledArmorGain(effect.armorGain));
        }

        if (effect.enemyDamage > 0)
        {
            const damage = session.scaleAbilityEnemyDamage(effect.abilityId, effect.enemyDamage);

            applyEnemyHitResult(deps, session.dealAttackDamage(damage), {
                visualId: effect.visualId,
                behaviorId: effect.abilityId === 'overload' ? 'attack' : undefined,
            });
        }

        if (effect.poisonStacks > 0)
        {
            const targetId = session.getAttackTargetId()
                ?? session.getLivingCombatants()[0]?.instanceId;
            const enemyView = targetId ? deps.enemySquad.getView(targetId) : deps.enemySquad.firstView;
            const applied = session.applyPoisonStacks(effect.poisonStacks, targetId);
            const total = session.getEnemyPoison(targetId);

            enemyView?.showPoisonApplied(applied, total);
        }

        if (effect.playerDamage > 0)
        {
            applyPlayerDamage(deps, effect.playerDamage);
        }

        const label = formatAbilityEffectLabel(session, effect);

        if (label && chainStep)
        {
            const target = boardView.getCardVisualTarget(effect.slot);

            if (target)
            {
                playFloatingText(
                    deps.scene,
                    target.wrapper,
                    target.width / 2,
                    target.height * 0.22,
                    label,
                    effect.abilityId === 'overload' ? '#fcee0a' : '#f39c12',
                );
            }
        }
    }
    catch
    {
        onComplete();
        return;
    }

    scheduleAttackTimer(onComplete, GAME_RULES.activationStepMs);
}

function playOffChainBonusVisual (
    deps: ChainEndEffectsDeps,
    slots: SlotPosition[],
    sequence: AttackSequence,
    onComplete: () => void,
): void
{
    const { session, boardView, armorView, setDisplayedArmor, scheduleAttackTimer } = deps;

    for (const slot of slots)
    {
        boardView.bringCardToFront(slot);
    }

    try
    {
        if (sequence.offChainArmor > 0)
        {
            session.grantPlayerShield(sequence.offChainArmor);
            setDisplayedArmor(session.getPlayer().shield);
            armorView.showShieldGain(session.getScaledArmorGain(sequence.offChainArmor));
        }

        if (sequence.offChainDamage > 0)
        {
            applyEnemyHitResult(deps, session.dealAttackDamage(sequence.offChainDamage));
        }
    }
    catch
    {
        onComplete();
        return;
    }

    scheduleAttackTimer(onComplete, GAME_RULES.activationStepMs);
}

function playHazardBurstVisual (
    deps: ChainEndEffectsDeps,
    slots: SlotPosition[],
    sequence: AttackSequence,
    onComplete: () => void,
): void
{
    const { boardView, scheduleAttackTimer } = deps;

    for (const slot of slots)
    {
        boardView.bringCardToFront(slot);
    }

    const playerDamage = sequence.abilityPlayerDamage + sequence.hazardDamage;

    try
    {
        if (playerDamage > 0)
        {
            applyPlayerDamage(deps, playerDamage);
        }
    }
    catch
    {
        onComplete();
        return;
    }

    scheduleAttackTimer(onComplete, GAME_RULES.activationStepMs);
}

function playSiphonHealVisual (
    deps: ChainEndEffectsDeps,
    slots: SlotPosition[],
    sequence: AttackSequence,
    onComplete: () => void,
): void
{
    const { session, boardView, enemySquad, scheduleAttackTimer } = deps;

    for (const slot of slots)
    {
        boardView.bringCardToFront(slot);
        pulseAbilityCard(deps, slot, 'siphon', Math.round(GAME_RULES.activationStepMs * 0.7));
    }

    try
    {
        if (sequence.siphonHeal > 0)
        {
            const result = session.resolveSiphonHeal(sequence.siphonHeal);
            const targetId = result.targetInstanceId;
            const enemyView = targetId ? enemySquad.getView(targetId) : enemySquad.firstView;

            if (result.healed > 0)
            {
                enemyView?.setHealth(session.getEnemy(targetId));
                enemyView?.showHealGain(result.healed);
                enemySquad.syncFromSession(session);
            }
        }
    }
    catch
    {
        onComplete();
        return;
    }

    scheduleAttackTimer(onComplete, Math.round(GAME_RULES.activationStepMs * 0.7));
}

function formatAbilityEffectLabel (
    session: CardGameSession,
    effect: ChainAbilityEffect,
): string | null
{
    if (effect.enemyDamage > 0)
    {
        const amount = session.scaleAbilityEnemyDamage(effect.abilityId, effect.enemyDamage);

        if (effect.abilityId === 'overload')
        {
            return `OVERLOAD ${amount}`;
        }

        return `+${amount}`;
    }

    if (effect.armorGain > 0)
    {
        return `+${session.getScaledArmorGain(effect.armorGain)}`;
    }

    if (effect.poisonStacks > 0)
    {
        return `POISON +${session.scalePoisonStacks(effect.poisonStacks)}`;
    }

    if (effect.playerDamage > 0)
    {
        return `-${effect.playerDamage}`;
    }

    return null;
}

function pulseAbilityCard (
    deps: ChainEndEffectsDeps,
    slot: SlotPosition,
    visualId: string,
    durationMs: number,
): void
{
    const { scene, boardView } = deps;
    const target = boardView.getCardVisualTarget(slot);

    if (!target)
    {
        return;
    }

    boardView.bringCardToFront(slot);
    getCardVisualEffectOrThrow(visualId).activate(scene, target);

    scene.time.delayedCall(durationMs, () =>
    {
        getCardVisualEffectOrThrow(visualId).deactivate(scene, target);
    });
}
