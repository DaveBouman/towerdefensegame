import type { CardGameSession } from '../domain/CardGameSession';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import { getChainAbilitySlots } from '../abilities/chainAbilityRegistry';
import {
    applyJokerChosenDirection,
    getNextChainSlotFromStep,
    getOffChainSlots,
    getUnchainedHazardSlots,
    isBoostedChainStep,
    isJokerDefinition,
    resolveChainSteps,
    tryBuildActivationStep,
    createChainWalkState,
} from '../combat/AttackPipeline';
import type { ActivationStep, AttackSequence, AttackStep, EnemyTurnAction, EnemyTurnStep, SlotPosition } from '../domain/types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';
import { boostedBuffVisual } from './visualEffects/boostedBuffVisual';
import { getCardVisualEffectOrThrow } from './visualEffects/visualEffectRegistry';
import type { CardVisualTarget } from './visualEffects/types';
import type { ArmorView } from '../../board/ArmorView';
import type { CardBoardView } from '../../board/CardBoardView';
import type { CardHandView } from '../../board/CardHandView';
import type { EnemyTargetView } from '../../board/EnemyTargetView';
import type { PlayerHealthView } from '../../board/PlayerHealthView';

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
        private readonly enemyView: EnemyTargetView,
        private readonly playerView: PlayerHealthView,
        private readonly armorView: ArmorView,
    ) {}

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
        this.setDisplayedArmor(0);

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

            if (!hasEndEffects)
            {
                onComplete(sequence);
                return;
            }

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

            if (sequence.offChainArmor > 0 || sequence.abilityArmorGain > 0)
            {
                this.setDisplayedArmor(this.displayedArmor + sequence.offChainArmor + sequence.abilityArmorGain);
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
                this.enemyView.showPoisonApplied(sequence.abilityPoisonStacks);
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

            this.scene.time.delayedCall(400, () => onComplete(sequence));
        };

        const scheduleNext = (next: SlotPosition | null): void =>
        {
            current = next;

            if (!current)
            {
                this.scene.time.delayedCall(stepMs, finalize);
                return;
            }

            this.attackTimer = this.scene.time.delayedCall(stepMs, runStep);
        };

        const runStep = (): void =>
        {
            if (activeStep)
            {
                this.deactivateStep(activeStep);
                activeStep = null;
            }

            if (!current)
            {
                finalize();
                return;
            }

            const step = tryBuildActivationStep(board, current, walkState);

            if (!step)
            {
                finalize();
                return;
            }

            chain.push(step);
            activeStep = step;
            const stepIndex = chain.length - 1;
            const resolvedChain = resolveChainSteps(chain);
            const resolvedStep = resolvedChain[stepIndex]!;
            const boosted = isBoostedChainStep(resolvedChain, stepIndex);

            this.activateStep(step, boosted);

            if (resolvedStep.armor > 0)
            {
                this.setDisplayedArmor(this.displayedArmor + resolvedStep.armor);
            }

            if (resolvedStep.damage > 0)
            {
                const result = this.session.dealAttackDamage(resolvedStep.damage);
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
            }

            const definition = getCardDefinitionOrThrow(step.definitionId);

            if (isJokerDefinition(definition))
            {
                this.boardView.showJokerDirectionPicker(step.slot, (direction) =>
                {
                    applyJokerChosenDirection(step, direction);
                    scheduleNext(getNextChainSlotFromStep(board, step));
                });

                return;
            }

            if (chain.length >= GAME_RULES.maxChainSteps)
            {
                finalize();
                return;
            }

            scheduleNext(getNextChainSlotFromStep(board, step));
        };

        runStep();
    }

    playEnemyTurn (action: EnemyTurnAction, onComplete: () => void): void
    {
        const turnMs = GAME_RULES.enemyTurnMs;
        const steps = [ ...action.steps ];

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

            this.playEnemyTurnStep(step, turnMs, playStep);
        };

        // Poison ticks first, before the enemy acts — it may finish the enemy off.
        if (this.session.getEnemyPoison() > 0)
        {
            this.scene.time.delayedCall(turnMs / 2, () =>
            {
                const result = this.session.tickPoison();

                this.enemyView.setHealth(result.enemy);
                this.enemyView.showPoisonTick(result.healthDamage);
                this.enemyView.playHitFlash();

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
        onComplete: () => void,
    ): void
    {
        if (step.kind === 'attack')
        {
            this.enemyView.playEnemyAttackPulse();

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
            this.enemyView.playEnemyAttackPulse();

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
            this.enemyView.playEnemyAttackPulse();

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

        this.scene.time.delayedCall(turnMs / 2, () =>
        {
            const enemy = this.session.resolveEnemyShield(step.amount ?? 0);
            this.enemyView.setHealth(enemy);
            this.enemyView.showShieldGain(step.amount ?? 0);
        });

        this.scene.time.delayedCall(turnMs, () =>
        {
            this.enemyView.setHealth(this.session.getEnemy());
            onComplete();
        });
    }

    private setDisplayedArmor (armor: number): void
    {
        this.displayedArmor = armor;
        this.armorView.setArmor(armor);
    }

    private applyEnemyHitResult (result: import('../domain/types').DamageResult): void
    {
        this.enemyView.setHealth(result.enemy);

        if (result.shieldAbsorbed > 0)
        {
            this.enemyView.showShieldAbsorb(result.shieldAbsorbed);
        }

        if (result.healthDamage > 0)
        {
            this.enemyView.playHitFlash();
            this.enemyView.showDamageNumber(result.healthDamage);
        }

        if ((result.thornsDamage ?? 0) > 0)
        {
            const player = this.session.getPlayer();
            this.playerView.setHealth(player);
            this.setDisplayedArmor(player.shield);
            this.playerView.playHitFlash();
            this.playerView.showDamageNumber(result.thornsDamage!);
        }
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
