import { GAME_RULES } from '../../config/cardRegistry';
import type { ChainAbilityEffect } from '../../abilities/types';
import type { BoardModel } from '../../domain/BoardModel';
import type { CardGameSession } from '../../domain/CardGameSession';
import type { ActivationStep, AttackSequence, SlotPosition } from '../../domain/types';
import type { CardBoardView } from '../../../board/CardBoardView';
import type { EnemySquadView } from '../../../board/EnemySquadView';
import type { ArmorView } from '../../../board/ArmorView';
import { playFloatingText } from '../visualEffects/visualEffectTweens';
import { getCardVisualEffectOrThrow } from '../visualEffects/visualEffectRegistry';
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
    onComplete: () => void,
): void
{
    const stepMs = GAME_RULES.activationStepMs;
    const abilityEffects = [ ...sequence.chainAbilityEffects ].sort((a, b) => a.stepIndex - b.stepIndex);
    const tasks: Array<(done: () => void) => void> = [];

    for (const effect of abilityEffects)
    {
        tasks.push((done) => playAbilityEffectVisual(deps, effect, done));
    }

    if (offChainSlots.length > 0)
    {
        tasks.push((done) => playOffChainBonusVisual(deps, offChainSlots, sequence, done));
    }

    if (hazardSlots.length > 0 || sequence.abilityPlayerDamage > 0)
    {
        tasks.push((done) => playHazardBurstVisual(deps, hazardSlots, sequence, done));
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

function playAbilityEffectVisual (
    deps: ChainEndEffectsDeps,
    effect: ChainAbilityEffect,
    onComplete: () => void,
): void
{
    const { session, boardView, armorView, setDisplayedArmor, scheduleAttackTimer } = deps;
    const chainStep = effect.stepIndex >= 0 ? { slot: effect.slot, visualId: effect.visualId } : null;

    if (chainStep)
    {
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
            applyEnemyHitResult(deps, session.dealAttackDamage(effect.enemyDamage));
        }

        if (effect.poisonStacks > 0)
        {
            const targetId = session.getAttackTargetId()
                ?? session.getLivingCombatants()[0]?.instanceId;
            const enemyView = targetId ? deps.enemySquad.getView(targetId) : deps.enemySquad.firstView;

            enemyView?.showPoisonApplied(effect.poisonStacks);
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
                    '#f39c12',
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

function formatAbilityEffectLabel (
    session: CardGameSession,
    effect: ChainAbilityEffect,
): string | null
{
    if (effect.enemyDamage > 0)
    {
        return `+${effect.enemyDamage}`;
    }

    if (effect.armorGain > 0)
    {
        return `+${session.getScaledArmorGain(effect.armorGain)}`;
    }

    if (effect.poisonStacks > 0)
    {
        return `+${effect.poisonStacks} poison`;
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
