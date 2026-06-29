import type { CardGameSession } from '../domain/CardGameSession';
import { GAME_RULES } from '../config/cardRegistry';
import type { ActivationStep, AttackSequence, EnemyTurnAction } from '../domain/types';
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
        this.deactivateActiveVisual();
        this.boardView.setChainStartActive(false);
    }

    playAttack (sequence: AttackSequence, onComplete: () => void): void
    {
        this.attackTimer?.remove();
        this.deactivateActiveVisual();
        this.boardView.setChainStartActive(false);
        this.setDisplayedArmor(0);

        if (sequence.chain.length === 0)
        {
            onComplete();
            return;
        }

        const stepMs = sequence.stepMs > 0 ? sequence.stepMs : GAME_RULES.activationStepMs;
        let index = 0;
        let attackStepIndex = 0;

        const showNext = (): void =>
        {
            if (index > 0)
            {
                this.deactivateStep(sequence.chain[index - 1]);
            }

            if (index >= sequence.chain.length)
            {
                this.finishAttack(sequence, onComplete);
                return;
            }

            const step = sequence.chain[index];

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

                this.session.emitAttackStep(attackStepIndex, sequence);
                attackStepIndex++;
            }

            index++;

            if (index >= sequence.chain.length)
            {
                this.scene.time.delayedCall(stepMs, () => this.finishAttack(sequence, onComplete));
                return;
            }

            this.attackTimer = this.scene.time.delayedCall(stepMs, showNext);
        };

        showNext();
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

    private finishAttack (sequence: AttackSequence, onComplete: () => void): void
    {
        this.attackTimer?.remove();
        this.attackTimer = undefined;

        for (const step of sequence.chain)
        {
            this.deactivateStep(step);
        }

        this.deactivateActiveVisual();
        this.boardView.setChainStartActive(false);
        onComplete();
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
