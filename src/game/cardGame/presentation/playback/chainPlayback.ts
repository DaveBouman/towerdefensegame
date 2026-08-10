import { GAME_RULES, getCardDefinitionOrThrow } from '../../config/cardRegistry';
import {
    applyJokerChosenDirection,
    getNextChainSlotFromStep,
    getOffChainSlots,
    getUnchainedCurseSlots,
    getUnchainedHazardSlots,
    getBoostMultiplierForStep,
    isBoostedChainStep,
    isEchoDefinition,
    isJokerDefinition,
    resolveChainSteps,
    tryBuildActivationStep,
    createChainWalkState,
} from '../../combat/AttackPipeline';
import { getEchoReplayTarget } from '../../combat/echoReplay';
import type { EchoReplayTarget } from '../../combat/echoReplay';
import type { CardGameSession } from '../../domain/CardGameSession';
import type { ActivationStep, AttackSequence, AttackStep, SlotPosition } from '../../domain/types';
import type { CardBoardView } from '../../../board/CardBoardView';
import type { EnemySquadView } from '../../../board/EnemySquadView';
import { applyEnemyHitResult, type CombatHitVisualDeps } from './combatHitVisuals';
import { playChainAbilityEffectVisual, playEndOfChainEffects } from './chainEndEffects';
import { getChainStepMs } from '../combatJuice';
import { playBattleModifierFloatingLabel } from '../battleModifierFloatingLabel';
import { boostedBuffVisual } from '../visualEffects/boostedBuffVisual';
import { playFloatingText } from '../visualEffects/visualEffectTweens';
import { getCardVisualEffectOrThrow } from '../visualEffects/visualEffectRegistry';
import { scaleBoostedDelta } from '../../combat/chainBoost';
import {
    isOnStepChainAbility,
    resolveChainAbilities,
} from '../../abilities/chainAbilityRegistry';
import type { ChainAbilityEffect } from '../../abilities/types';

export interface ChainPlaybackDeps extends CombatHitVisualDeps
{
    session: CardGameSession;
    boardView: CardBoardView;
    enemySquad: EnemySquadView;
    scheduleAttackTimer: (callback: () => void, delayMs: number) => void;
    clearAttackTimer: () => void;
    setDisplayedArmor: (armor: number) => void;
    syncBattleModifierStatus: () => void;
    deactivateActiveVisual: () => void;
    deactivateBoostBuff: () => void;
    activateStep: (step: ActivationStep, boostMultiplier?: number) => void;
    deactivateStep: (step: ActivationStep) => void;
    requestHitstop: (ms: number) => void;
}

export function runChainPlayback (
    deps: ChainPlaybackDeps,
    chainStart: SlotPosition,
    onComplete: (sequence: AttackSequence) => void,
): void
{
    deps.clearAttackTimer();
    deps.deactivateActiveVisual();
    deps.deactivateBoostBuff();
    deps.boardView.setChainStartActive(false);
    deps.boardView.hideJokerDirectionPicker();
    deps.setDisplayedArmor(deps.session.getPlayer().shield);

    const board = deps.session.board;
    const chain: ActivationStep[] = [];
    const attackSteps: AttackStep[] = [];
    const walkState = createChainWalkState();
    let current: SlotPosition | null = board.getCardAt(chainStart) ? chainStart : null;
    let activeStep: ActivationStep | null = null;
    const stepMs = GAME_RULES.activationStepMs;

    const buildCurrentSequence = (): AttackSequence =>
        deps.session.buildAttackSequence(chain, stepMs);

    let attackCompleted = false;

    const finalize = (): void =>
    {
        if (attackCompleted)
        {
            return;
        }

        attackCompleted = true;
        deps.clearAttackTimer();
        deps.boardView.hideJokerDirectionPicker();

        if (activeStep)
        {
            deps.deactivateStep(activeStep);
            activeStep = null;
        }

        for (const step of chain)
        {
            deps.deactivateStep(step);
        }

        deps.deactivateActiveVisual();
        deps.boardView.setChainStartActive(false);

        for (const step of chain)
        {
            const target = deps.boardView.getCardVisualTarget(step.slot);

            if (target)
            {
                deps.scene.tweens.killTweensOf(target.wrapper);
                target.wrapper.setScale(1);
                target.wrapper.setAlpha(1);
            }
        }

        const sequence = buildCurrentSequence();
        const offChainSlots = getOffChainSlots(board, chain);
        const hazardSlots = [
            ...getUnchainedHazardSlots(board, chain),
            ...getUnchainedCurseSlots(board, chain),
        ];
        const deferredAbilityEffects = sequence.chainAbilityEffects
            .filter((effect) => !isOnStepChainAbility(effect.abilityId));
        const hasEndEffects = deferredAbilityEffects.length > 0
            || offChainSlots.length > 0
            || hazardSlots.length > 0
            || sequence.abilityPlayerDamage > 0
            || sequence.disarmResults.length > 0;

        const finishSequence = (): void =>
        {
            onComplete(sequence);
        };

        if (!hasEndEffects)
        {
            finishSequence();
            return;
        }

        playEndOfChainEffects(
            {
                ...deps,
                scheduleAttackTimer: deps.scheduleAttackTimer,
            },
            sequence,
            chain,
            board,
            offChainSlots,
            hazardSlots,
            finishSequence,
        );
    };

    const scheduleNext = (next: SlotPosition | null): void =>
    {
        current = next;

        if (!current)
        {
            deps.scheduleAttackTimer(finalize, stepMs);
            return;
        }

        deps.scheduleAttackTimer(runStep, stepMs);
    };

    const finishActiveStep = (): void =>
    {
        if (!activeStep)
        {
            return;
        }

        deps.deactivateStep(activeStep);
        activeStep = null;
    };

    /** Keeps each card's activation visual visible for at least one chain step. */
    const scheduleStepCompletion = (callback: () => void, activatedAt: number, durationMs: number): void =>
    {
        const elapsed = deps.scene.time.now - activatedAt;
        const remaining = Math.max(0, durationMs - elapsed);

        deps.scheduleAttackTimer(callback, remaining);
    };

    const grantStepArmor = (step: ActivationStep): void =>
    {
        const stepIndex = chain.indexOf(step);

        if (stepIndex < 0)
        {
            return;
        }

        const resolvedStep = resolveChainSteps(chain)[stepIndex]!;

        if (resolvedStep.armor <= 0)
        {
            return;
        }

        const grantedArmor = deps.session.getScaledArmorGain(resolvedStep.armor);

        deps.session.grantPlayerShield(resolvedStep.armor);
        deps.setDisplayedArmor(deps.session.getPlayer().shield);

        if (grantedArmor <= 0)
        {
            return;
        }

        deps.armorView.showShieldGain(grantedArmor);

        const target = deps.boardView.getCardVisualTarget(step.slot);

        if (target)
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
    };

    const dealStepDamage = (
        damage: number,
        sourceDefinitionId: string,
        resolvedStep: ActivationStep,
        onStepComplete: () => void,
    ): void =>
    {
        const maybeSwitchTargetAfterHit = (definitionId: string): void =>
        {
            const cardDefinition = getCardDefinitionOrThrow(definitionId);

            if (!cardDefinition.switchTargetAfterHit)
            {
                return;
            }

            const nextId = deps.session.cycleAttackTarget();

            if (nextId)
            {
                deps.enemySquad.setSelected(nextId);
            }
        };

        const deal = (): void =>
        {
            const livingIds = deps.session.getLivingCombatants().map((combatant) => combatant.instanceId);

            // Last enemy already dead — finish the step; don't wait forever for a target.
            if (livingIds.length === 0)
            {
                onStepComplete();
                return;
            }

            const targetId = deps.session.ensureAttackTarget();

            if (!targetId)
            {
                deps.enemySquad.requestTarget(livingIds, (pickedId) =>
                {
                    deps.session.setAttackTarget(pickedId);
                    deps.enemySquad.setSelected(pickedId);
                    deal();
                });

                return;
            }

            const result = deps.session.dealAttackDamage(
                damage,
                targetId,
                sourceDefinitionId,
                resolvedStep.behaviorId,
            );

            applyEnemyHitResult(deps, result, {
                visualId: resolvedStep.visualId,
                behaviorId: resolvedStep.behaviorId,
            });

            maybeSwitchTargetAfterHit(sourceDefinitionId);

            attackSteps.push({
                slot: resolvedStep.slot,
                card: resolvedStep.card,
                definitionId: resolvedStep.definitionId,
                damage: resolvedStep.damage,
                behaviorId: resolvedStep.behaviorId,
                visualId: resolvedStep.visualId,
            });
            deps.session.emitAttackStep(attackSteps.length - 1, buildCurrentSequence());
            onStepComplete();
        };

        deal();
    };

    const pulsePriorStep = (prevStep: ActivationStep, boostMultiplier: number, durationMs: number): void =>
    {
        const target = deps.boardView.getCardVisualTarget(prevStep.slot);

        if (!target)
        {
            return;
        }

        deps.boardView.bringCardToFront(prevStep.slot);
        getCardVisualEffectOrThrow(prevStep.visualId).activate(deps.scene, target);

        if (boostMultiplier > 1)
        {
            boostedBuffVisual.activate(deps.scene, target, boostMultiplier);
        }

        deps.scene.time.delayedCall(durationMs, () =>
        {
            getCardVisualEffectOrThrow(prevStep.visualId).deactivate(deps.scene, target);

            if (boostMultiplier > 1)
            {
                boostedBuffVisual.deactivate(deps.scene, target);
            }
        });
    };

    const applyBattleModFromStep = (
        definitionId: string,
        slot: SlotPosition,
        boostMultiplier = 1,
    ): void =>
    {
        deps.session.addBattleModifierFromCard(definitionId, boostMultiplier);
        deps.syncBattleModifierStatus();
        deps.enemySquad.showAllIntents(deps.session);

        const definition = getCardDefinitionOrThrow(definitionId);

        if (!definition.battleModifier)
        {
            return;
        }

        const visualTarget = deps.boardView.getCardVisualTarget(slot);

        if (!visualTarget)
        {
            return;
        }

        playBattleModifierFloatingLabel(
            deps.scene,
            visualTarget.wrapper,
            visualTarget.width / 2,
            visualTarget.height * 0.22,
            definition.battleModifier.stat,
            scaleBoostedDelta(definition.battleModifier.delta, boostMultiplier),
        );
    };

    const replayPriorStep = (
        replay: EchoReplayTarget,
        echoBoostMultiplier = 1,
        onStepComplete?: () => void,
    ): void =>
    {
        const { step: prevStep, resolved: prevResolved } = replay;
        const prevIndex = chain.indexOf(prevStep);
        const prevBoosted = prevIndex >= 0 && isBoostedChainStep(resolveChainSteps(chain), prevIndex);
        const prevMultiplier = prevIndex >= 0
            ? getBoostMultiplierForStep(resolveChainSteps(chain), prevIndex)
            : 1;
        const replayMs = Math.round(GAME_RULES.activationStepMs * 0.75);

        pulsePriorStep(prevStep, prevBoosted ? prevMultiplier : 1, replayMs);

        if (prevResolved.behaviorId === 'battle-mod')
        {
            // Boost on Echo scales the replayed mod (Boost → Echo → Hardwire).
            applyBattleModFromStep(prevStep.definitionId, prevStep.slot, echoBoostMultiplier);
        }

        if (prevResolved.damage > 0 && deps.session.getLivingCombatants().length > 0)
        {
            const livingIds = deps.session.getLivingCombatants().map((combatant) => combatant.instanceId);
            const targetId = deps.session.ensureAttackTarget() ?? livingIds[0]!;

            const result = deps.session.dealAttackDamage(
                prevResolved.damage,
                targetId,
                prevResolved.definitionId,
                prevResolved.behaviorId,
            );
            applyEnemyHitResult(deps, result, {
                visualId: prevResolved.visualId,
                behaviorId: prevResolved.behaviorId,
            });

            if (getCardDefinitionOrThrow(prevResolved.definitionId).switchTargetAfterHit)
            {
                const nextId = deps.session.cycleAttackTarget();

                if (nextId)
                {
                    deps.enemySquad.setSelected(nextId);
                }
            }

            attackSteps.push({
                slot: prevResolved.slot,
                card: prevResolved.card,
                definitionId: prevResolved.definitionId,
                damage: prevResolved.damage,
                behaviorId: prevResolved.behaviorId,
                visualId: prevResolved.visualId,
            });
            deps.session.emitAttackStep(attackSteps.length - 1, buildCurrentSequence());
        }

        if (prevResolved.armor > 0)
        {
            grantStepArmor(prevStep);
        }

        if (onStepComplete)
        {
            deps.scheduleAttackTimer(onStepComplete, replayMs);
        }
    };

    const runStep = (): void =>
    {
        if (!current)
        {
            finishActiveStep();
            finalize();
            return;
        }

        const step = tryBuildActivationStep(board, current, walkState);

        if (!step)
        {
            finishActiveStep();
            finalize();
            return;
        }

        chain.push(step);
        activeStep = step;
        const stepIndex = chain.length - 1;
        const resolvedChain = resolveChainSteps(chain);
        const resolvedStep = resolvedChain[stepIndex]!;
        const boosted = isBoostedChainStep(resolvedChain, stepIndex);
        const boostMultiplier = getBoostMultiplierForStep(resolvedChain, stepIndex);
        const definition = getCardDefinitionOrThrow(step.definitionId);
        const stepDurationMs = getChainStepMs(resolvedStep.behaviorId, stepMs);

        const proceedAfterStep = (): void =>
        {
            finishActiveStep();

            // No living enemies left — skip remaining chain cards.
            if (deps.session.getLivingCombatants().length === 0)
            {
                finalize();
                return;
            }

            if (chain.length >= GAME_RULES.maxChainSteps)
            {
                finalize();
                return;
            }

            scheduleNext(getNextChainSlotFromStep(board, step));
        };

        if (isEchoDefinition(definition))
        {
            const replay = getEchoReplayTarget(chain, stepIndex);

            if (replay)
            {
                const stepActivatedAt = deps.scene.time.now;

                deps.activateStep(step, boosted ? boostMultiplier : 1);
                replayPriorStep(replay, boosted ? boostMultiplier : 1, () =>
                {
                    grantStepArmor(step);
                    scheduleStepCompletion(proceedAfterStep, stepActivatedAt, stepDurationMs);
                });
                return;
            }
        }

        const stepActivatedAt = deps.scene.time.now;

        deps.activateStep(step, boosted ? boostMultiplier : 1);
        grantStepArmor(step);

        const playOnStepAbilitiesThen = (next: () => void): void =>
        {
            const onStepEffects = resolveChainAbilities(resolvedChain, board).effects
                .filter((effect: ChainAbilityEffect) =>
                    effect.stepIndex === stepIndex && isOnStepChainAbility(effect.abilityId));

            if (onStepEffects.length === 0)
            {
                next();
                return;
            }

            let effectIndex = 0;

            const playNextEffect = (): void =>
            {
                if (effectIndex >= onStepEffects.length)
                {
                    next();
                    return;
                }

                const effect = onStepEffects[effectIndex]!;
                effectIndex += 1;
                playChainAbilityEffectVisual(
                    {
                        ...deps,
                        scheduleAttackTimer: deps.scheduleAttackTimer,
                    },
                    effect,
                    playNextEffect,
                );
            };

            playNextEffect();
        };

        if (resolvedStep.damage > 0)
        {
            dealStepDamage(
                resolvedStep.damage,
                definition.id,
                resolvedStep,
                () => playOnStepAbilitiesThen(() =>
                    scheduleStepCompletion(proceedAfterStep, stepActivatedAt, stepDurationMs)),
            );
            return;
        }

        if (isJokerDefinition(definition))
        {
            deps.boardView.showJokerDirectionPicker(step.slot, (direction) =>
            {
                applyJokerChosenDirection(step, direction);
                playOnStepAbilitiesThen(() =>
                    scheduleStepCompletion(proceedAfterStep, stepActivatedAt, stepDurationMs));
            });

            return;
        }

        if (chain.length >= GAME_RULES.maxChainSteps)
        {
            playOnStepAbilitiesThen(() => scheduleStepCompletion(() =>
            {
                finishActiveStep();
                finalize();
            }, stepActivatedAt, stepDurationMs));

            return;
        }

        playOnStepAbilitiesThen(() =>
            scheduleStepCompletion(proceedAfterStep, stepActivatedAt, stepDurationMs));
    };

    runStep();
}
