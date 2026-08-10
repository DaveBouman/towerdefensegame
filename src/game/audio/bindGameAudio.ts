import { EventBus } from '../EventBus';
import { CardGameEventBus } from '../cardGame/events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../cardGame/events/cardGameEvents';
import type { DamageResult } from '../cardGame/domain/types';
import { GAME_EVENTS } from '../events/gameEvents';
import {
    playDamageSfx,
    playEnemyDamageSfx,
    playSfx,
} from './gameAudio';

let lastArmor = 0;

export const resetBattleAudioState = (): void =>
{
    lastArmor = 0;
};

export const bindGameAudioListeners = (): (() => void) =>
{
    const onCardPlaced = (): void => playSfx('card-place', { volume: 0.7 });

    const onAttackStarted = (): void => playSfx('chain-step', { volume: 0.45, rate: 0.95 });

    const onAttackStep = (): void => playSfx('chain-step', { volume: 0.55 });

    const onPlayerHealed = ({ amount }: { amount: number }): void =>
    {
        if (amount > 0)
        {
            playSfx('heal', { volume: Math.min(1, 0.5 + amount / 30) });
        }
    };

    const onArmorChanged = ({ armor }: { armor: number }): void =>
    {
        if (armor > lastArmor)
        {
            playSfx('shield', { volume: 0.65 });
        }

        lastArmor = armor;
    };

    const onEnemyTurnStarted = (): void => playSfx('ui-select', { volume: 0.35, rate: 0.85 });

    const onPlayerDefeated = (): void => playSfx('defeat', { volume: 0.85 });

    const onAttackRejected = (): void => playSfx('ui-click', { volume: 0.35, rate: 0.8 });

    const onBattleWon = (): void => playSfx('victory', { volume: 0.75 });

    const onBattleLost = (): void => playSfx('defeat', { volume: 0.8 });

    const onRunSfx = ({ key, volume, rate }: { key: Parameters<typeof playSfx>[0]; volume?: number; rate?: number }): void =>
    {
        playSfx(key, { volume, rate });
    };

    lastArmor = 0;

    CardGameEventBus.on(CARD_GAME_EVENTS.CARD_PLACED, onCardPlaced);
    CardGameEventBus.on(CARD_GAME_EVENTS.ATTACK_STARTED, onAttackStarted);
    CardGameEventBus.on(CARD_GAME_EVENTS.ATTACK_STEP, onAttackStep);
    CardGameEventBus.on(CARD_GAME_EVENTS.PLAYER_HEALED, onPlayerHealed);
    CardGameEventBus.on(CARD_GAME_EVENTS.ARMOR_CHANGED, onArmorChanged);
    CardGameEventBus.on(CARD_GAME_EVENTS.ENEMY_TURN_STARTED, onEnemyTurnStarted);
    CardGameEventBus.on(CARD_GAME_EVENTS.PLAYER_DEFEATED, onPlayerDefeated);

    EventBus.on(GAME_EVENTS.ATTACK_REJECTED, onAttackRejected);
    EventBus.on(GAME_EVENTS.BATTLE_WON, onBattleWon);
    EventBus.on(GAME_EVENTS.BATTLE_LOST, onBattleLost);
    EventBus.on(GAME_EVENTS.PLAY_SFX, onRunSfx);

    return () =>
    {
        CardGameEventBus.off(CARD_GAME_EVENTS.CARD_PLACED, onCardPlaced);
        CardGameEventBus.off(CARD_GAME_EVENTS.ATTACK_STARTED, onAttackStarted);
        CardGameEventBus.off(CARD_GAME_EVENTS.ATTACK_STEP, onAttackStep);
        CardGameEventBus.off(CARD_GAME_EVENTS.PLAYER_HEALED, onPlayerHealed);
        CardGameEventBus.off(CARD_GAME_EVENTS.ARMOR_CHANGED, onArmorChanged);
        CardGameEventBus.off(CARD_GAME_EVENTS.ENEMY_TURN_STARTED, onEnemyTurnStarted);
        CardGameEventBus.off(CARD_GAME_EVENTS.PLAYER_DEFEATED, onPlayerDefeated);

        EventBus.off(GAME_EVENTS.ATTACK_REJECTED, onAttackRejected);
        EventBus.off(GAME_EVENTS.BATTLE_WON, onBattleWon);
        EventBus.off(GAME_EVENTS.BATTLE_LOST, onBattleLost);
        EventBus.off(GAME_EVENTS.PLAY_SFX, onRunSfx);
    };
};

/** Combat hit hook — called from presentation layer with damage context. */
export const playCombatHitSfx = (result: DamageResult): void =>
{
    if (result.healthDamage > 0)
    {
        playDamageSfx(result.healthDamage);
    }

    if (result.enemyKilled)
    {
        playSfx('kill', { volume: 0.95 });
    }
};

export const playPlayerHitSfx = (healthDamage: number): void =>
{
    playEnemyDamageSfx(healthDamage);
};
