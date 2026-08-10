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
    const onCardPlaced = (): void => playSfx('card-place', { volume: 1 });

    const onAttackStarted = (): void => playSfx('chain-step', { volume: 0.85, rate: 0.95 });

    const onAttackStep = (): void => playSfx('chain-step', { volume: 0.95 });

    const onPlayerHealed = ({ amount }: { amount: number }): void =>
    {
        if (amount > 0)
        {
            playSfx('heal', { volume: Math.min(1, 0.72 + amount / 25) });
        }
    };

    const onArmorChanged = ({ armor }: { armor: number }): void =>
    {
        if (armor > lastArmor)
        {
            playDefendProcSfx();
        }

        lastArmor = armor;
    };

    const onEnemyTurnStarted = (): void => playSfx('enemy-move', { volume: 0.72, rate: 0.92 });

    const onPlayerDefeated = (): void => playSfx('defeat', { volume: 1 });

    const onAttackRejected = (): void => playSfx('ui-click', { volume: 0.58, rate: 0.8 });

    const onBattleWon = (): void => playSfx('victory', { volume: 1 });

    const onBattleLost = (): void => playSfx('defeat', { volume: 1 });

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
        playSfx('kill', { volume: 1 });
    }
};

export const playPlayerHitSfx = (healthDamage: number): void =>
{
    playEnemyDamageSfx(healthDamage);
};

/** Behaviors whose payoff resolves after the chain (sound plays at proc time). */
const END_RESOLVED_BEHAVIORS = new Set([ 'fire', 'poison' ]);

/** Card ability / special behavior activation during a chain. */
export const playCardAbilitySfx = (visualId: string, behaviorId?: string): void =>
{
    const behavior = behaviorId?.toLowerCase() ?? '';
    const visual = visualId.toLowerCase();

    if (behavior === 'attack' || behavior === 'defend')
    {
        return;
    }

    if (END_RESOLVED_BEHAVIORS.has(behavior))
    {
        return;
    }

    let rate = 1;

    if (behavior === 'boost' || visual === 'boost' || visual === 'patch')
    {
        rate = 1.06;
    }
    else if (behavior === 'echo' || visual === 'echo')
    {
        rate = 0.94;
    }
    else if (behavior === 'joker' || visual === 'joker' || visual === 'glitch')
    {
        rate = 1.12;
    }
    else if (behavior === 'hazard' || behavior === 'curse')
    {
        rate = 0.88;
    }

    playSfx('ability-cast', { volume: 0.98, rate });
};

/** End-of-chain ability proc (fire, poison, etc.). */
export const playAbilityProcSfx = (visualId: string, abilityId?: string): void =>
{
    const visual = visualId.toLowerCase();
    const ability = abilityId?.toLowerCase() ?? '';
    let rate = 1;

    if (ability.includes('fire') || visual.includes('fire') || visual === 'cinder' || visual === 'scorch')
    {
        rate = 1.04;
    }
    else if (ability.includes('poison') || visual.includes('poison') || visual === 'miasma')
    {
        rate = 0.9;
    }
    else if (ability.includes('boost') || visual.includes('boost'))
    {
        rate = 1.08;
    }

    playSfx('ability-cast', { volume: 1, rate });
};

export const playShieldAbsorbSfx = (): void =>
{
    playSfx('shield', { volume: 0.78, rate: 0.92 });
};

export const playDefendProcSfx = (): void =>
{
    playSfx('defend-proc', { volume: 0.82, rate: 0.96 });
};
