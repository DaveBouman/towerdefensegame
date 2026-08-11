import type { CardGameSession } from '../domain/CardGameSession';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { ActivationStep, AttackSequence, EnemyTurnAction, SlotPosition } from '../domain/types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';
import { playCardAbilitySfx } from '../../audio/bindGameAudio';
import { playBattleModifierFloatingLabel } from './battleModifierFloatingLabel';
import { boostedBuffVisual } from './visualEffects/boostedBuffVisual';
import { getCardVisualEffectOrThrow } from './visualEffects/visualEffectRegistry';
import { scaleBoostedDelta } from '../combat/chainBoost';
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
    /** Live board slot — never cache destroyed wrappers across board syncs. */
    private activeVisualSlot: { slot: SlotPosition; visualId: string } | null = null;
    private activeBoostBuffSlot: SlotPosition | null = null;
    private attackTimer?: Phaser.Time.TimerEvent;
    private displayedArmor = 0;
    private pendingHitstopMs = 0;

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
        this.clearAttackTimer();
        const totalDelay = delayMs + this.pendingHitstopMs;

        this.pendingHitstopMs = 0;
        this.attackTimer = this.scene.time.delayedCall(totalDelay, callback);
    }

    private requestHitstop (ms: number): void
    {
        this.pendingHitstopMs = Math.max(this.pendingHitstopMs, ms);
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
            activateStep: (step: ActivationStep, boostMultiplier?: number) => this.activateStep(step, boostMultiplier),
            deactivateStep: (step: ActivationStep) => this.deactivateStep(step),
            requestHitstop: (ms: number) => this.requestHitstop(ms),
        };
    }

    bind (): void
    {
        CardGameEventBus.on(CARD_GAME_EVENTS.ATTACK_COMPLETED, this.onAttackCompleted, this);
    }

    unbind (): void
    {
        CardGameEventBus.off(CARD_GAME_EVENTS.ATTACK_COMPLETED, this.onAttackCompleted, this);
        this.clearAttackTimer();
        this.boardView.hideJokerDirectionPicker();
        this.dropTransientVisualRefs();
        this.boardView.setChainStartActive(false);
        this.boardView.setActiveCoordinate(null);
    }

    /** Call before board wrappers are destroyed/rebuilt so glow cleanup never hits stale objects. */
    dropTransientVisualRefs (): void
    {
        this.activeVisualSlot = null;
        this.activeBoostBuffSlot = null;
        this.boardView.setActiveCoordinate(null);
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

            if (step.decoy)
            {
                playStep();
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

    private activateStep (step: ActivationStep, boostMultiplier = 1): void
    {
        const target = this.boardView.getCardVisualTarget(step.slot);

        if (!target?.wrapper.scene)
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
        this.boardView.setActiveCoordinate(step.slot);
        getCardVisualEffectOrThrow(step.visualId).activate(this.scene, target);
        playCardAbilitySfx(step.visualId, step.behaviorId);
        this.activeVisualSlot = { slot: { ...step.slot }, visualId: step.visualId };

        if (step.behaviorId === 'battle-mod')
        {
            this.applyBattleModFromStep(step.definitionId, step.slot, boostMultiplier);
        }

        if (boostMultiplier > 1)
        {
            boostedBuffVisual.activate(this.scene, target, boostMultiplier);
            this.activeBoostBuffSlot = { ...step.slot };
        }
    }

    private deactivateBoostBuff (): void
    {
        const slot = this.activeBoostBuffSlot;

        this.activeBoostBuffSlot = null;

        if (!slot)
        {
            return;
        }

        const target = this.boardView.getCardVisualTarget(slot);

        if (!target?.wrapper.scene)
        {
            return;
        }

        boostedBuffVisual.deactivate(this.scene, target);
    }

    private applyBattleModFromStep (
        definitionId: string,
        slot: SlotPosition,
        boostMultiplier = 1,
    ): void
    {
        this.session.addBattleModifierFromCard(definitionId, boostMultiplier);
        this.syncBattleModifierStatus();
        this.enemySquad.showAllIntents(this.session);

        const definition = getCardDefinitionOrThrow(definitionId);

        if (!definition.battleModifier)
        {
            return;
        }

        const visualTarget = this.boardView.getCardVisualTarget(slot);

        if (!visualTarget?.wrapper.scene)
        {
            return;
        }

        const delta = scaleBoostedDelta(definition.battleModifier.delta, boostMultiplier);

        playBattleModifierFloatingLabel(
            this.scene,
            visualTarget.wrapper,
            visualTarget.width / 2,
            visualTarget.height * 0.22,
            definition.battleModifier.stat,
            delta,
        );
    }

    private deactivateStep (step: ActivationStep): void
    {
        const target = this.boardView.getCardVisualTarget(step.slot);

        if (!target?.wrapper.scene)
        {
            if (this.activeVisualSlot
                && this.activeVisualSlot.slot.row === step.slot.row
                && this.activeVisualSlot.slot.col === step.slot.col)
            {
                this.activeVisualSlot = null;
            }

            if (this.activeBoostBuffSlot
                && this.activeBoostBuffSlot.row === step.slot.row
                && this.activeBoostBuffSlot.col === step.slot.col)
            {
                this.activeBoostBuffSlot = null;
            }

            return;
        }

        getCardVisualEffectOrThrow(step.visualId).deactivate(this.scene, target);

        if (this.activeVisualSlot
            && this.activeVisualSlot.slot.row === step.slot.row
            && this.activeVisualSlot.slot.col === step.slot.col)
        {
            this.activeVisualSlot = null;
        }

        if (this.activeBoostBuffSlot
            && this.activeBoostBuffSlot.row === step.slot.row
            && this.activeBoostBuffSlot.col === step.slot.col)
        {
            this.deactivateBoostBuff();
        }
    }

    private deactivateActiveVisual (): void
    {
        const active = this.activeVisualSlot;

        this.activeVisualSlot = null;
        this.boardView.setActiveCoordinate(null);

        if (!active)
        {
            return;
        }

        const target = this.boardView.getCardVisualTarget(active.slot);

        if (!target?.wrapper.scene)
        {
            return;
        }

        getCardVisualEffectOrThrow(active.visualId).deactivate(this.scene, target);
    }

    private onAttackCompleted (): void
    {
        this.setDisplayedArmor(this.session.getPlayer().shield);
    }
}
