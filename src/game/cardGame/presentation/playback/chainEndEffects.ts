import { poisonStatusNameUpper } from '../../../copy/strings';
import { GAME_RULES, getCardDefinitionOrThrow, getCardHandEndPenalty } from '../../config/cardRegistry';
import type { ChainAbilityEffect } from '../../abilities/types';
import { isOnStepChainAbility } from '../../abilities/chainAbilityRegistry';
import { isHazardDefinition } from '../../combat/bombConversion';
import type { BoardModel } from '../../domain/BoardModel';
import type { CardGameSession } from '../../domain/CardGameSession';
import type { ActivationStep, AttackSequence, SlotPosition } from '../../domain/types';
import type { CardBoardView } from '../../../board/CardBoardView';
import type { EnemySquadView } from '../../../board/EnemySquadView';
import type { ArmorView } from '../../../board/ArmorView';
import { playFloatingText } from '../visualEffects/visualEffectTweens';
import { getCardVisualEffectOrThrow } from '../visualEffects/visualEffectRegistry';
import { playAbilityProcSfx, playCardAbilitySfx } from '../../../audio/bindGameAudio';
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
    if (deps.session.isEnemyDefeated() || deps.session.isPlayerDefeated())
    {
        onComplete();
        return;
    }
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
        tasks.push((done) => playOffChainBonusVisual(deps, offChainSlots, board, done));
    }

    if (hazardSlots.length > 0 || sequence.abilityPlayerDamage > 0)
    {
        tasks.push((done) => playHazardBurstVisual(deps, hazardSlots, board, done));
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

    try
    {
        if (chainStep)
        {
            playAbilityProcSfx(effect.visualId, effect.abilityId);
            pulseAbilityCard(deps, effect.slot, effect.visualId, GAME_RULES.activationStepMs);
        }

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
                abilityId: effect.abilityId,
                sourceSlot: effect.slot,
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
        // Ability presentation must always advance the chain/end-effects queue.
    }

    scheduleAttackTimer(onComplete, GAME_RULES.activationStepMs);
}

function playOffChainBonusVisual (
    deps: ChainEndEffectsDeps,
    slots: SlotPosition[],
    board: BoardModel,
    onComplete: () => void,
): void
{
    const actionableSlots = slots.filter((slot) =>
    {
        const card = board.getCardAt(slot);

        if (!card)
        {
            return false;
        }

        const behaviorId = getCardDefinitionOrThrow(card.definitionId).behaviorId;

        if (card.spent)
        {
            return false;
        }

        return behaviorId === 'attack' || behaviorId === 'defend' || behaviorId === 'redline';
    });

    runSequentialSlotVisuals(deps, actionableSlots, (slot, done) =>
    {
        playOffChainCardVisual(deps, slot, board, done);
    }, onComplete);
}

function playOffChainCardVisual (
    deps: ChainEndEffectsDeps,
    slot: SlotPosition,
    board: BoardModel,
    onComplete: () => void,
): void
{
    const { session, boardView, armorView, setDisplayedArmor, scheduleAttackTimer } = deps;
    const card = board.getCardAt(slot);

    if (!card)
    {
        scheduleAttackTimer(onComplete, 0);
        return;
    }

    const definition = getCardDefinitionOrThrow(card.definitionId);
    const target = boardView.getCardVisualTarget(slot);
    const beatMs = Math.round(GAME_RULES.activationStepMs * 0.85);

    pulseAbilityCard(deps, slot, definition.visualId, beatMs);
    playCardAbilitySfx(definition.visualId, definition.behaviorId);

    try
    {
        if (definition.behaviorId === 'attack' || definition.behaviorId === 'redline')
        {
            const damage = GAME_RULES.offChainBonus.attackDamage;

            applyEnemyHitResult(deps, session.dealAttackDamage(damage), {
                visualId: definition.visualId,
                behaviorId: definition.behaviorId,
                definitionId: definition.id,
                sourceSlot: slot,
            });

            if (target)
            {
                playFloatingText(
                    deps.scene,
                    target.wrapper,
                    target.width / 2,
                    target.height * 0.22,
                    `+${damage}`,
                    '#ff7675',
                );
            }
        }

        if (definition.behaviorId === 'defend' || definition.behaviorId === 'redline')
        {
            const rawArmor = GAME_RULES.offChainBonus.defendArmor;

            session.grantPlayerShield(rawArmor);
            setDisplayedArmor(session.getPlayer().shield);

            const grantedArmor = session.getScaledArmorGain(rawArmor);

            armorView.showShieldGain(grantedArmor);

            if (target && grantedArmor > 0)
            {
                playFloatingText(
                    deps.scene,
                    target.wrapper,
                    target.width / 2,
                    target.height * 0.22,
                    `+${grantedArmor}`,
                    '#58d68d',
                );
            }
        }
    }
    catch
    {
        // Off-chain juice must not stall end-of-chain playback.
    }

    scheduleAttackTimer(onComplete, beatMs);
}

function playHazardBurstVisual (
    deps: ChainEndEffectsDeps,
    slots: SlotPosition[],
    board: BoardModel,
    onComplete: () => void,
): void
{
    runSequentialSlotVisuals(deps, slots, (slot, done) =>
    {
        playHazardSlotVisual(deps, slot, board, done);
    }, onComplete);
}

function playHazardSlotVisual (
    deps: ChainEndEffectsDeps,
    slot: SlotPosition,
    board: BoardModel,
    onComplete: () => void,
): void
{
    const { scheduleAttackTimer } = deps;
    const card = board.getCardAt(slot);

    if (!card)
    {
        scheduleAttackTimer(onComplete, 0);
        return;
    }

    const definition = getCardDefinitionOrThrow(card.definitionId);
    const target = deps.boardView.getCardVisualTarget(slot);
    const beatMs = Math.round(GAME_RULES.activationStepMs * 0.85);
    const isCurse = definition.behaviorId === 'curse';
    const isHazard = isHazardDefinition(definition);

    if (!isCurse && !isHazard)
    {
        scheduleAttackTimer(onComplete, 0);
        return;
    }

    pulseAbilityCard(deps, slot, definition.visualId, beatMs);
    playCardAbilitySfx(definition.visualId, definition.behaviorId);

    try
    {
        if (isCurse)
        {
            const penalty = getCardHandEndPenalty(definition) * 2;

            if (penalty > 0)
            {
                applyPlayerDamage(deps, penalty);

                if (target)
                {
                    playFloatingText(
                        deps.scene,
                        target.wrapper,
                        target.width / 2,
                        target.height * 0.22,
                        `-${penalty}`,
                        '#c97b9b',
                    );
                }
            }
        }
        else if (isHazard && definition.power > 0)
        {
            applyPlayerDamage(deps, definition.power);

            if (target)
            {
                playFloatingText(
                    deps.scene,
                    target.wrapper,
                    target.width / 2,
                    target.height * 0.22,
                    `-${definition.power}`,
                    '#ff6b35',
                );
            }
        }
    }
    catch
    {
        // Hazard/curse juice must not stall end-of-chain playback.
    }

    scheduleAttackTimer(onComplete, beatMs);
}

function runSequentialSlotVisuals (
    deps: ChainEndEffectsDeps,
    slots: SlotPosition[],
    playSlot: (slot: SlotPosition, done: () => void) => void,
    onComplete: () => void,
): void
{
    if (slots.length === 0)
    {
        onComplete();
        return;
    }

    const gapMs = Math.round(GAME_RULES.activationStepMs * 0.35);
    let index = 0;

    const runNext = (): void =>
    {
        if (index >= slots.length)
        {
            onComplete();
            return;
        }

        const slot = slots[index]!;

        index += 1;
        playSlot(slot, () =>
        {
            deps.scheduleAttackTimer(runNext, gapMs);
        });
    };

    runNext();
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
        return `${poisonStatusNameUpper()} +${session.scalePoisonStacks(effect.poisonStacks)}`;
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
