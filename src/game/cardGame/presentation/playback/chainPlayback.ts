import { GAME_RULES, getCardDefinitionOrThrow } from '../../config/cardRegistry';
import {
    applyJokerChosenDirection,
    getNextChainSlotFromStep,
    getOffChainSlots,
    getUnchainedHazardSlots,
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
import { playEndOfChainEffects } from './chainEndEffects';
import { playBattleModifierFloatingLabel } from '../battleModifierFloatingLabel';
import { boostedBuffVisual } from '../visualEffects/boostedBuffVisual';
import { playFloatingText } from '../visualEffects/visualEffectTweens';
import { getCardVisualEffectOrThrow } from '../visualEffects/visualEffectRegistry';

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
    activateStep: (step: ActivationStep, boosted?: boolean) => void;
    deactivateStep: (step: ActivationStep) => void;
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
        const hazardSlots = getUnchainedHazardSlots(board, chain);
        const hasEndEffects = sequence.chainAbilityEffects.length > 0
            || offChainSlots.length > 0
            || hazardSlots.length > 0
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
    const scheduleStepCompletion = (callback: () => void, activatedAt: number): void =>
    {
        const elapsed = deps.scene.time.now - activatedAt;
        const remaining = Math.max(0, stepMs - elapsed);

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
        const livingIds = deps.session.getLivingCombatants().map((combatant) => combatant.instanceId);

        const deal = (): void =>
        {
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

            const result = deps.session.dealAttackDamage(damage, targetId, sourceDefinitionId);

            applyEnemyHitResult(deps, result);

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

    const pulsePriorStep = (prevStep: ActivationStep, boosted: boolean, durationMs: number): void =>
    {
        const target = deps.boardView.getCardVisualTarget(prevStep.slot);

        if (!target)
        {
            return;
        }

        deps.boardView.bringCardToFront(prevStep.slot);
        getCardVisualEffectOrThrow(prevStep.visualId).activate(deps.scene, target);

        if (boosted)
        {
            boostedBuffVisual.activate(deps.scene, target);
        }

        deps.scene.time.delayedCall(durationMs, () =>
        {
            getCardVisualEffectOrThrow(prevStep.visualId).deactivate(deps.scene, target);

            if (boosted)
            {
                boostedBuffVisual.deactivate(deps.scene, target);
            }
        });
    };

    const applyBattleModFromStep = (definitionId: string, slot: SlotPosition): void =>
    {
        deps.session.addBattleModifierFromCard(definitionId);
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
            definition.battleModifier.delta,
        );
    };

    const replayPriorStep = (
        replay: EchoReplayTarget,
        onStepComplete?: () => void,
    ): void =>
    {
        const { step: prevStep, resolved: prevResolved } = replay;
        const prevIndex = chain.indexOf(prevStep);
        const prevBoosted = prevIndex >= 0 && isBoostedChainStep(resolveChainSteps(chain), prevIndex);
        const replayMs = Math.round(GAME_RULES.activationStepMs * 0.75);

        pulsePriorStep(prevStep, prevBoosted, replayMs);

        if (prevResolved.behaviorId === 'battle-mod')
        {
            applyBattleModFromStep(prevStep.definitionId, prevStep.slot);
        }

        if (prevResolved.damage > 0)
        {
            const result = deps.session.dealAttackDamage(
                prevResolved.damage,
                undefined,
                prevResolved.definitionId,
            );
            applyEnemyHitResult(deps, result);

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
        const definition = getCardDefinitionOrThrow(step.definitionId);

        const proceedAfterStep = (): void =>
        {
            finishActiveStep();

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

                deps.activateStep(step, boosted);
                replayPriorStep(replay, () =>
                {
                    grantStepArmor(step);
                    scheduleStepCompletion(proceedAfterStep, stepActivatedAt);
                });
                return;
            }
        }

        const stepActivatedAt = deps.scene.time.now;

        deps.activateStep(step, boosted);
        grantStepArmor(step);

        if (resolvedStep.damage > 0)
        {
            dealStepDamage(
                resolvedStep.damage,
                definition.id,
                resolvedStep,
                () => scheduleStepCompletion(proceedAfterStep, stepActivatedAt),
            );
            return;
        }

        if (isJokerDefinition(definition))
        {
            deps.boardView.showJokerDirectionPicker(step.slot, (direction) =>
            {
                applyJokerChosenDirection(step, direction);
                scheduleStepCompletion(proceedAfterStep, stepActivatedAt);
            });

            return;
        }

        if (chain.length >= GAME_RULES.maxChainSteps)
        {
            scheduleStepCompletion(() =>
            {
                finishActiveStep();
                finalize();
            }, stepActivatedAt);

            return;
        }

        scheduleStepCompletion(proceedAfterStep, stepActivatedAt);
    };

    runStep();
}
