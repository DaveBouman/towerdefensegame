import type { CardGameSession } from '../domain/CardGameSession';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import { getChainAbilitySlots } from '../abilities/chainAbilityRegistry';
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
} from '../combat/AttackPipeline';
import { getEchoReplayTarget } from '../combat/echoReplay';
import { describeBattleModifier, formatBattleModifierDelta } from '../combat/battleModifiers';
import type { ActivationStep, AttackSequence, AttackStep, EnemyTurnAction, EnemyTurnStep, SlotPosition } from '../domain/types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';
import { boostedBuffVisual } from './visualEffects/boostedBuffVisual';
import { playFloatingText } from './visualEffects/visualEffectTweens';
import { getCardVisualEffectOrThrow } from './visualEffects/visualEffectRegistry';
import type { CardVisualTarget } from './visualEffects/types';
import type { ArmorView } from '../../board/ArmorView';
import type { CardBoardView } from '../../board/CardBoardView';
import type { CardHandView } from '../../board/CardHandView';
import type { EnemySquadView } from '../../board/EnemySquadView';
import type { BattleModifierStatusView } from '../../board/BattleModifierStatusView';

export class CardGamePresenter
{
    private activeVisual: { target: CardVisualTarget; visualId: string } | null = null;
    private activeBoostBuff: CardVisualTarget | null = null;
    private attackTimer?: Phaser.Time.TimerEvent;
    private displayedArmor = 0;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly session: CardGameSession,
        private readonly boardView: CardBoardView,
        private readonly handView: CardHandView,
        private readonly enemySquad: EnemySquadView,
        private readonly playerView: PlayerHealthView,
        private readonly armorView: ArmorView,
        private readonly battleModifierView?: BattleModifierStatusView,
    ) {}

    private syncBattleModifierStatus (): void
    {
        this.battleModifierView?.setModifiers(this.session.getBattleModifiers());
    }

    bind (): void
    {
        CardGameEventBus.on(CARD_GAME_EVENTS.ATTACK_COMPLETED, this.onAttackCompleted, this);
    }

    unbind (): void
    {
        CardGameEventBus.off(CARD_GAME_EVENTS.ATTACK_COMPLETED, this.onAttackCompleted, this);
        this.attackTimer?.remove();
        this.attackTimer = undefined;
        this.boardView.hideJokerDirectionPicker();
        this.deactivateActiveVisual();
        this.deactivateBoostBuff();
        this.boardView.setChainStartActive(false);
    }

    playAttack (chainStart: SlotPosition, onComplete: (sequence: AttackSequence) => void): void
    {
        this.attackTimer?.remove();
        this.deactivateActiveVisual();
        this.deactivateBoostBuff();
        this.boardView.setChainStartActive(false);
        this.boardView.hideJokerDirectionPicker();
        this.setDisplayedArmor(this.session.getPlayer().shield);

        const board = this.session.board;
        const chain: ActivationStep[] = [];
        const attackSteps: AttackStep[] = [];
        const walkState = createChainWalkState();
        let current: SlotPosition | null = board.getCardAt(chainStart) ? chainStart : null;
        let activeStep: ActivationStep | null = null;
        const stepMs = GAME_RULES.activationStepMs;

        const buildCurrentSequence = (): AttackSequence =>
            this.session.buildAttackSequence(chain, stepMs);

        let attackCompleted = false;

        const finalize = (): void =>
        {
            if (attackCompleted)
            {
                return;
            }

            attackCompleted = true;

            this.attackTimer?.remove();
            this.attackTimer = undefined;
            this.boardView.hideJokerDirectionPicker();

            if (activeStep)
            {
                this.deactivateStep(activeStep);
                activeStep = null;
            }

            for (const step of chain)
            {
                this.deactivateStep(step);
            }

            this.deactivateActiveVisual();
            this.boardView.setChainStartActive(false);

            for (const step of chain)
            {
                const target = this.boardView.getCardVisualTarget(step.slot);

                if (target)
                {
                    this.scene.tweens.killTweensOf(target.wrapper);
                    target.wrapper.setScale(1);
                    target.wrapper.setAlpha(1);
                }
            }

            const sequence = buildCurrentSequence();
            const offChainSlots = getOffChainSlots(board, chain);
            const hazardSlots = getUnchainedHazardSlots(board, chain);
            const abilitySlots = getChainAbilitySlots(sequence.chainAbilityEffects);
            const hasEndEffects = offChainSlots.length > 0
                || hazardSlots.length > 0
                || abilitySlots.length > 0
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

            try
            {
                for (const slot of offChainSlots)
                {
                    this.boardView.bringCardToFront(slot);
                }

                for (const slot of hazardSlots)
                {
                    this.boardView.bringCardToFront(slot);
                }

                for (const slot of abilitySlots)
                {
                    this.boardView.bringCardToFront(slot);
                }

                if (sequence.abilityArmorGain > 0)
                {
                    this.session.grantPlayerShield(sequence.abilityArmorGain);
                }

                if (sequence.offChainArmor > 0)
                {
                    this.session.grantPlayerShield(sequence.offChainArmor);
                }

                if (sequence.offChainArmor > 0 || sequence.abilityArmorGain > 0)
                {
                    this.setDisplayedArmor(this.session.getPlayer().shield);
                }

                if (sequence.offChainDamage > 0)
                {
                    this.applyEnemyHitResult(this.session.dealAttackDamage(sequence.offChainDamage));
                }

                if (sequence.abilityEnemyDamage > 0)
                {
                    this.applyEnemyHitResult(this.session.dealAttackDamage(sequence.abilityEnemyDamage));
                }

                if (sequence.abilityPoisonStacks > 0)
                {
                    const targetId = this.session.getAttackTargetId() ?? this.session.getLivingCombatants()[0]?.instanceId;
                    const enemyView = targetId ? this.enemySquad.getView(targetId) : this.enemySquad.firstView;

                    enemyView?.showPoisonApplied(sequence.abilityPoisonStacks);
                }

                const playerAbilityDamage = sequence.abilityPlayerDamage + sequence.hazardDamage;

                if (playerAbilityDamage > 0)
                {
                    const result = this.session.resolveHazardDamage(playerAbilityDamage);
                    this.playerView.setHealth(result.player);
                    this.setDisplayedArmor(result.player.shield);

                    if (result.shieldAbsorbed > 0)
                    {
                        this.armorView.showShieldAbsorb(result.shieldAbsorbed);
                    }

                    if (result.healthDamage > 0)
                    {
                        this.playerView.playHitFlash();
                        this.playerView.showDamageNumber(result.healthDamage);
                    }
                }
            }
            catch
            {
                finishSequence();
                return;
            }

            this.attackTimer = this.scene.time.delayedCall(400, finishSequence);
        };

        const scheduleNext = (next: SlotPosition | null): void =>
        {
            current = next;

            if (!current)
            {
                this.attackTimer = this.scene.time.delayedCall(stepMs, finalize);
                return;
            }

            this.attackTimer = this.scene.time.delayedCall(stepMs, runStep);
        };

        const finishActiveStep = (): void =>
        {
            if (!activeStep)
            {
                return;
            }

            this.deactivateStep(activeStep);
            activeStep = null;
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

            if (isEchoDefinition(definition))
            {
                const replay = getEchoReplayTarget(chain, stepIndex);

                if (replay)
                {
                    this.replayPriorStep(
                        replay,
                        chain,
                        attackSteps,
                        buildCurrentSequence,
                    );
                }
            }

            this.activateStep(step, boosted);
            this.grantStepArmor(step, chain);

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

            if (resolvedStep.damage > 0)
            {
                this.dealStepDamage(
                    resolvedStep.damage,
                    definition.id,
                    resolvedStep,
                    attackSteps,
                    buildCurrentSequence,
                    proceedAfterStep,
                );
                return;
            }

            if (isJokerDefinition(definition))
            {
                this.boardView.showJokerDirectionPicker(step.slot, (direction) =>
                {
                    applyJokerChosenDirection(step, direction);
                    this.attackTimer = this.scene.time.delayedCall(stepMs, proceedAfterStep);
                });

                return;
            }

            if (chain.length >= GAME_RULES.maxChainSteps)
            {
                this.attackTimer = this.scene.time.delayedCall(stepMs, () =>
                {
                    finishActiveStep();
                    finalize();
                });

                return;
            }

            this.attackTimer = this.scene.time.delayedCall(stepMs, proceedAfterStep);
        };

        runStep();
    }

    playEnemyTurn (action: EnemyTurnAction, onComplete: () => void): void
    {
        const turnMs = GAME_RULES.enemyTurnMs;
        const steps = [ ...action.steps ];
        const instanceId = action.instanceId ?? this.session.getLivingCombatants()[0]?.instanceId;
        const enemyView = instanceId ? this.enemySquad.getView(instanceId) : this.enemySquad.firstView;

        const finishTurn = (): void =>
        {
            this.session.completeEnemyTurn(action);
            onComplete();
        };

        const playStep = (): void =>
        {
            const step = steps.shift();

            if (!step)
            {
                finishTurn();
                return;
            }

            this.playEnemyTurnStep(step, turnMs, enemyView, instanceId, playStep);
        };

        if (instanceId && this.session.getEnemyPoison(instanceId) > 0)
        {
            this.scene.time.delayedCall(turnMs / 2, () =>
            {
                const result = this.session.tickPoison(instanceId);

                enemyView?.setHealth(result.enemy);
                enemyView?.showPoisonTick(result.healthDamage);
                enemyView?.playHitFlash();
                this.enemySquad.syncFromSession(this.session);

                if (this.session.isEnemyDefeated())
                {
                    finishTurn();
                    return;
                }

                playStep();
            });

            return;
        }

        playStep();
    }

    private playEnemyTurnStep (
        step: EnemyTurnStep,
        turnMs: number,
        enemyView: import('../../board/EnemyTargetView').EnemyTargetView | undefined,
        instanceId: string | undefined,
        onComplete: () => void,
    ): void
    {
        if (step.kind === 'attack')
        {
            enemyView?.playEnemyAttackPulse();

            this.scene.time.delayedCall(turnMs, () =>
            {
                const result = this.session.resolveEnemyAttack(step.amount ?? 0);
                this.playerView.setHealth(result.player);
                this.setDisplayedArmor(result.player.shield);

                if (result.shieldAbsorbed > 0)
                {
                    this.armorView.showShieldAbsorb(result.shieldAbsorbed);
                }

                if (result.healthDamage > 0)
                {
                    this.playerView.playHitFlash();
                    this.playerView.showDamageNumber(result.healthDamage);
                }

                onComplete();
            });

            return;
        }

        if (step.kind === 'place-hazard')
        {
            enemyView?.playEnemyAttackPulse();

            this.scene.time.delayedCall(turnMs, () =>
            {
                const slot = this.session.placeEnemyHazard();

                if (slot)
                {
                    this.boardView.syncFromBoard(this.session.board);
                }

                onComplete();
            });

            return;
        }

        if (step.kind === 'dampen-field')
        {
            enemyView?.playEnemyAttackPulse();

            this.scene.time.delayedCall(turnMs, () =>
            {
                const field = this.session.activateDampenField();

                if (field)
                {
                    this.boardView.setDampenedSlots(this.session.getDampenedSlots());
                }

                onComplete();
            });

            return;
        }

        if (step.kind === 'battle-mod')
        {
            enemyView?.playEnemyAttackPulse();

            this.scene.time.delayedCall(turnMs, () =>
            {
                this.session.addBattleModifierFromEnemyStep(step);
                this.syncBattleModifierStatus();

                if (step.modifierStat !== undefined && step.modifierDelta !== undefined)
                {
                    enemyView?.showIntentLabel(
                        describeBattleModifier(step.modifierStat, step.modifierDelta),
                    );
                }

                onComplete();
            });

            return;
        }

        if (step.kind === 'heal-ally' || step.kind === 'shield-ally')
        {
            const targetId = step.targetInstanceId;
            const targetView = targetId ? this.enemySquad.getView(targetId) : enemyView;

            enemyView?.playEnemyAttackPulse();

            this.scene.time.delayedCall(turnMs, () =>
            {
                if (!targetId)
                {
                    onComplete();
                    return;
                }

                if (step.kind === 'heal-ally')
                {
                    const healed = this.session.resolveAllyHeal(step.amount ?? 0, targetId);
                    targetView?.setHealth(healed);
                    targetView?.showHealGain(step.amount ?? 0);
                }
                else
                {
                    const shielded = this.session.resolveAllyShield(step.amount ?? 0, targetId);
                    targetView?.setHealth(shielded);
                    targetView?.showShieldGain(step.amount ?? 0);
                }

                this.enemySquad.syncFromSession(this.session);
                onComplete();
            });

            return;
        }

        if (step.kind === 'shield')
        {
            this.scene.time.delayedCall(turnMs / 2, () =>
            {
                const enemy = this.session.resolveEnemyShield(step.amount ?? 0, instanceId);

                enemyView?.setHealth(enemy);
                enemyView?.showShieldGain(step.amount ?? 0);
            });

            this.scene.time.delayedCall(turnMs, () =>
            {
                if (instanceId)
                {
                    enemyView?.setHealth(this.session.getEnemy(instanceId));
                }

                onComplete();
            });
        }
    }

    private dealStepDamage (
        damage: number,
        sourceDefinitionId: string,
        resolvedStep: ActivationStep,
        attackSteps: AttackStep[],
        buildCurrentSequence: () => AttackSequence,
        onComplete: () => void,
    ): void
    {
        const livingIds = this.session.getLivingCombatants().map((combatant) => combatant.instanceId);

        const deal = (): void =>
        {
            const targetId = this.session.ensureAttackTarget();

            if (!targetId)
            {
                this.enemySquad.requestTarget(livingIds, (pickedId) =>
                {
                    this.session.setAttackTarget(pickedId);
                    this.enemySquad.setSelected(pickedId);
                    deal();
                });

                return;
            }

            const result = this.session.dealAttackDamage(damage, targetId, sourceDefinitionId);

            this.applyEnemyHitResult(result);

            attackSteps.push({
                slot: resolvedStep.slot,
                card: resolvedStep.card,
                definitionId: resolvedStep.definitionId,
                damage: resolvedStep.damage,
                behaviorId: resolvedStep.behaviorId,
                visualId: resolvedStep.visualId,
            });
            this.session.emitAttackStep(attackSteps.length - 1, buildCurrentSequence());
            onComplete();
        };

        deal();
    }

    private grantStepArmor (step: ActivationStep, chain: ActivationStep[]): void
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

        const grantedArmor = this.session.getScaledArmorGain(resolvedStep.armor);

        this.session.grantPlayerShield(resolvedStep.armor);
        this.setDisplayedArmor(this.session.getPlayer().shield);

        if (grantedArmor <= 0)
        {
            return;
        }

        this.armorView.showShieldGain(grantedArmor);

        const target = this.boardView.getCardVisualTarget(step.slot);

        if (target)
        {
            playFloatingText(
                this.scene,
                target.wrapper,
                target.width / 2,
                target.height * 0.22,
                `+${grantedArmor}`,
                '#58d68d',
            );
        }
    }

    private setDisplayedArmor (armor: number): void
    {
        this.displayedArmor = armor;
        this.armorView.setArmor(armor);
    }

    private applyEnemyHitResult (result: import('../domain/types').DamageResult): void
    {
        const targetId = result.targetInstanceId ?? this.session.getAttackTargetId();
        const enemyView = targetId ? this.enemySquad.getView(targetId) : this.enemySquad.firstView;

        enemyView?.setHealth(result.enemy);
        this.enemySquad.syncFromSession(this.session);

        if (result.damageBlocked)
        {
            enemyView?.showHitBlocked();
        }

        if (result.shieldAbsorbed > 0)
        {
            enemyView?.showShieldAbsorb(result.shieldAbsorbed);
        }

        if (result.healthDamage > 0)
        {
            enemyView?.playHitFlash();
            enemyView?.showDamageNumber(result.healthDamage);
        }

        if ((result.healOnKill ?? 0) > 0)
        {
            const player = this.session.getPlayer();

            this.playerView.setHealth(player);
            playFloatingText(
                this.scene,
                this.playerView.container,
                this.playerView.container.width / 2,
                -12,
                `+${result.healOnKill}`,
                '#58d68d',
            );
        }

        if ((result.thornsDamage ?? 0) > 0)
        {
            const player = this.session.getPlayer();
            this.playerView.setHealth(player);
            this.setDisplayedArmor(player.shield);

            if ((result.thornsShieldAbsorbed ?? 0) > 0)
            {
                this.armorView.showShieldAbsorb(result.thornsShieldAbsorbed!);
            }

            if ((result.thornsHealthDamage ?? 0) > 0)
            {
                this.playerView.playHitFlash();
                this.playerView.showDamageNumber(result.thornsHealthDamage!);
            }
        }
    }

    private replayPriorStep (
        replay: import('../combat/echoReplay').EchoReplayTarget,
        chain: ActivationStep[],
        attackSteps: AttackStep[],
        buildCurrentSequence: () => AttackSequence,
    ): void
    {
        const { step: prevStep, resolved: prevResolved } = replay;
        const prevIndex = chain.indexOf(prevStep);
        const prevBoosted = prevIndex >= 0 && isBoostedChainStep(resolveChainSteps(chain), prevIndex);

        this.pulsePriorStep(prevStep, prevBoosted);

        if (prevResolved.behaviorId === 'battle-mod')
        {
            this.applyBattleModFromStep(prevStep.definitionId, prevStep.slot);
        }

        if (prevResolved.damage > 0)
        {
            const result = this.session.dealAttackDamage(
                prevResolved.damage,
                undefined,
                prevResolved.definitionId,
            );
            this.applyEnemyHitResult(result);

            attackSteps.push({
                slot: prevResolved.slot,
                card: prevResolved.card,
                definitionId: prevResolved.definitionId,
                damage: prevResolved.damage,
                behaviorId: prevResolved.behaviorId,
                visualId: prevResolved.visualId,
            });
            this.session.emitAttackStep(attackSteps.length - 1, buildCurrentSequence());
        }

        if (prevResolved.armor > 0)
        {
            this.grantStepArmor(prevStep, chain);
        }
    }

    private pulsePriorStep (prevStep: ActivationStep, boosted: boolean): void
    {
        const target = this.boardView.getCardVisualTarget(prevStep.slot);

        if (!target)
        {
            return;
        }

        this.boardView.bringCardToFront(prevStep.slot);
        getCardVisualEffectOrThrow(prevStep.visualId).activate(this.scene, target);

        if (boosted)
        {
            boostedBuffVisual.activate(this.scene, target);
        }

        this.scene.time.delayedCall(180, () =>
        {
            getCardVisualEffectOrThrow(prevStep.visualId).deactivate(this.scene, target);

            if (boosted)
            {
                boostedBuffVisual.deactivate(this.scene, target);
            }
        });
    }

    private activateStep (step: ActivationStep, boosted = false): void
    {
        const target = this.boardView.getCardVisualTarget(step.slot);

        if (!target)
        {
            return;
        }

        const chainStart = this.boardView.getChainStartSlot();

        if (step.slot.row === chainStart.row && step.slot.col === chainStart.col)
        {
            this.boardView.setChainStartActive(true);
        }
        else
        {
            this.boardView.setChainStartActive(false);
        }

        this.boardView.bringCardToFront(step.slot);
        getCardVisualEffectOrThrow(step.visualId).activate(this.scene, target);
        this.activeVisual = { target, visualId: step.visualId };

        if (step.behaviorId === 'battle-mod')
        {
            this.applyBattleModFromStep(step.definitionId, step.slot);
        }

        if (boosted)
        {
            boostedBuffVisual.activate(this.scene, target);
            this.activeBoostBuff = target;
        }
    }

    private deactivateBoostBuff (): void
    {
        if (!this.activeBoostBuff)
        {
            return;
        }

        boostedBuffVisual.deactivate(this.scene, this.activeBoostBuff);
        this.activeBoostBuff = null;
    }

    private applyBattleModFromStep (definitionId: string, slot: SlotPosition): void
    {
        this.session.addBattleModifierFromCard(definitionId);
        this.syncBattleModifierStatus();
        this.enemySquad.showAllIntents(this.session);

        const definition = getCardDefinitionOrThrow(definitionId);

        if (!definition.battleModifier)
        {
            return;
        }

        const visualTarget = this.boardView.getCardVisualTarget(slot);

        if (!visualTarget)
        {
            return;
        }

        playFloatingText(
            this.scene,
            visualTarget.wrapper,
            visualTarget.width / 2,
            visualTarget.height * 0.22,
            formatBattleModifierDelta(definition.battleModifier.delta),
            definition.battleModifier.delta > 0 ? '#fcee0a' : '#ff6b8a',
        );
    }

    private deactivateStep (step: ActivationStep): void
    {
        const target = this.boardView.getCardVisualTarget(step.slot);

        if (!target)
        {
            return;
        }

        getCardVisualEffectOrThrow(step.visualId).deactivate(this.scene, target);

        if (this.activeVisual?.target === target)
        {
            this.activeVisual = null;
        }

        if (this.activeBoostBuff === target)
        {
            this.deactivateBoostBuff();
        }
    }

    private deactivateActiveVisual (): void
    {
        if (!this.activeVisual)
        {
            return;
        }

        getCardVisualEffectOrThrow(this.activeVisual.visualId).deactivate(
            this.scene,
            this.activeVisual.target,
        );
        this.activeVisual = null;
    }

    private onAttackCompleted (): void
    {
        this.setDisplayedArmor(this.session.getPlayer().shield);
    }
}
