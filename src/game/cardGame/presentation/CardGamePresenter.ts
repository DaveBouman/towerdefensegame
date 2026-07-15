import type { CardGameSession } from '../domain/CardGameSession';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import { formatBattleModifierDelta } from '../combat/battleModifiers';
import type { ActivationStep, AttackSequence, EnemyTurnAction, SlotPosition } from '../domain/types';
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
import type { PlayerHealthView } from '../../board/PlayerHealthView';
import { playEnemyTurnStep } from './playback/enemyTurnPlayback';
import { runChainPlayback } from './playback/chainPlayback';
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

    private scheduleAttackTimer (callback: () => void, delayMs: number): void
    {
        this.attackTimer = this.scene.time.delayedCall(delayMs, callback);
    }

    private clearAttackTimer (): void
    {
        this.attackTimer?.remove();
        this.attackTimer = undefined;
    }

    private getChainPlaybackDeps ()
    {
        return {
            scene: this.scene,
            session: this.session,
            boardView: this.boardView,
            enemySquad: this.enemySquad,
            playerView: this.playerView,
            armorView: this.armorView,
            setDisplayedArmor: (armor: number) => this.setDisplayedArmor(armor),
            scheduleAttackTimer: (callback: () => void, delayMs: number) => this.scheduleAttackTimer(callback, delayMs),
            clearAttackTimer: () => this.clearAttackTimer(),
            syncBattleModifierStatus: () => this.syncBattleModifierStatus(),
            deactivateActiveVisual: () => this.deactivateActiveVisual(),
            deactivateBoostBuff: () => this.deactivateBoostBuff(),
            activateStep: (step: ActivationStep, boosted?: boolean) => this.activateStep(step, boosted),
            deactivateStep: (step: ActivationStep) => this.deactivateStep(step),
        };
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
        runChainPlayback(this.getChainPlaybackDeps(), chainStart, onComplete);
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

            playEnemyTurnStep(
                {
                    scene: this.scene,
                    session: this.session,
                    boardView: this.boardView,
                    enemySquad: this.enemySquad,
                    playerView: this.playerView,
                    armorView: this.armorView,
                    battleModifierView: this.battleModifierView,
                    setDisplayedArmor: (armor) => this.setDisplayedArmor(armor),
                    syncBattleModifierStatus: () => this.syncBattleModifierStatus(),
                },
                step,
                turnMs,
                enemyView,
                instanceId,
                playStep,
            );
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

    private setDisplayedArmor (armor: number): void
    {
        this.displayedArmor = armor;
        this.armorView.setArmor(armor);
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
