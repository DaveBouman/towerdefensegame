import type { CardGameSession } from '../domain/CardGameSession';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import {
    buildAttackSequence,
    getNextChainSlot,
    getOffChainSlots,
    isJokerDefinition,
    tryBuildActivationStep,
} from '../combat/AttackPipeline';
import type { ActivationStep, AttackSequence, AttackStep, EnemyTurnAction, SlotPosition } from '../domain/types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';
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
        this.boardView.setChainStartActive(false);
    }

    playAttack (chainStart: SlotPosition, onComplete: (sequence: AttackSequence) => void): void
    {
        this.attackTimer?.remove();
        this.deactivateActiveVisual();
        this.boardView.setChainStartActive(false);
        this.boardView.hideJokerDirectionPicker();
        this.setDisplayedArmor(0);

        const board = this.session.board;
        const chain: ActivationStep[] = [];
        const attackSteps: AttackStep[] = [];
        const activationCounts = new Map<string, number>();
        let current: SlotPosition | null = board.getCardAt(chainStart) ? chainStart : null;
        let activeStep: ActivationStep | null = null;
        const stepMs = GAME_RULES.activationStepMs;

        const buildCurrentSequence = (): AttackSequence =>
            buildAttackSequence(chain, board, stepMs);

        const finalize = (): void =>
        {
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

            if (offChainSlots.length === 0)
            {
                onComplete(sequence);
                return;
            }

            for (const slot of offChainSlots)
            {
                this.boardView.bringCardToFront(slot);
            }

            if (sequence.offChainArmor > 0)
            {
                this.setDisplayedArmor(this.displayedArmor + sequence.offChainArmor);
            }

            if (sequence.offChainDamage > 0)
            {
                const result = this.session.dealAttackDamage(sequence.offChainDamage);
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

            const step = tryBuildActivationStep(board, current, activationCounts);

            if (!step)
            {
                finalize();
                return;
            }

            chain.push(step);
            activeStep = step;
            this.activateStep(step);

            if (step.armor > 0)
            {
                this.setDisplayedArmor(this.displayedArmor + step.armor);
            }

            if (step.damage > 0)
            {
                const result = this.session.dealAttackDamage(step.damage);
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

                attackSteps.push({
                    slot: step.slot,
                    card: step.card,
                    definitionId: step.definitionId,
                    damage: step.damage,
                    behaviorId: step.behaviorId,
                    visualId: step.visualId,
                });
                this.session.emitAttackStep(attackSteps.length - 1, buildCurrentSequence());
            }

            const definition = getCardDefinitionOrThrow(step.definitionId);

            if (isJokerDefinition(definition))
            {
                this.boardView.showJokerDirectionPicker(step.slot, (direction) =>
                {
                    step.arrow = direction;
                    step.card.arrow = direction;
                    scheduleNext(getNextChainSlot(board, step.slot, direction));
                });

                return;
            }

            scheduleNext(getNextChainSlot(board, step.slot, step.arrow));
        };

        runStep();
    }

    playEnemyTurn (action: EnemyTurnAction, onComplete: () => void): void
    {
        const turnMs = GAME_RULES.enemyTurnMs;

        if (action.kind === 'attack')
        {
            this.enemyView.playEnemyAttackPulse();

            this.scene.time.delayedCall(turnMs, () =>
            {
                const result = this.session.resolveEnemyAttack(action.amount);
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

                this.session.completeEnemyTurn(action);
                onComplete();
            });

            return;
        }

        this.scene.time.delayedCall(turnMs / 2, () =>
        {
            const enemy = this.session.resolveEnemyShield(action.amount);
            this.enemyView.setHealth(enemy);
            this.enemyView.showShieldGain(action.amount);
        });

        this.scene.time.delayedCall(turnMs, () =>
        {
            this.enemyView.setHealth(this.session.getEnemy());
            this.session.completeEnemyTurn(action);
            onComplete();
        });
    }

    private setDisplayedArmor (armor: number): void
    {
        this.displayedArmor = armor;
        this.armorView.setArmor(armor);
    }

    private activateStep (step: ActivationStep): void
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
