import type { CardGameSession } from '../domain/CardGameSession';
import type { ActivationStep, AttackSequence } from '../domain/types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';
import { getCardVisualEffectOrThrow } from './visualEffects/visualEffectRegistry';
import type { CardVisualTarget } from './visualEffects/types';
import type { ArmorView } from '../../board/ArmorView';
import type { CardBoardView } from '../../board/CardBoardView';
import type { CardHandView } from '../../board/CardHandView';
import type { EnemyTargetView } from '../../board/EnemyTargetView';

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
        this.clearActiveVisual();
        this.setDisplayedArmor(0);
    }

    playAttack (sequence: AttackSequence, onComplete: () => void): void
    {
        this.attackTimer?.remove();
        this.deactivateChain(sequence.chain);
        this.setDisplayedArmor(0);

        if (sequence.chain.length === 0)
        {
            onComplete();
            return;
        }

        const stepMs = sequence.durationMs / sequence.chain.length;
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
                this.session.emitAttackStep(attackStepIndex, sequence);
                attackStepIndex++;
            }

            index++;
            this.attackTimer = this.scene.time.delayedCall(stepMs, showNext);
        };

        showNext();
    }

    private finishAttack (sequence: AttackSequence, onComplete: () => void): void
    {
        this.attackTimer?.remove();
        this.attackTimer = undefined;
        this.deactivateChain(sequence.chain);
        this.setDisplayedArmor(0);
        onComplete();
    }

    private deactivateChain (chain: ActivationStep[]): void
    {
        for (const step of chain)
        {
            this.deactivateStep(step);
        }

        this.clearActiveVisual();
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

    private clearActiveVisual (): void
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

    private onAttackCompleted ({ enemy }: { enemy: import('../domain/types').EnemyState }): void
    {
        this.setDisplayedArmor(0);
        this.enemyView.setHealth(enemy);
    }
}
