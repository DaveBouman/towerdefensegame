import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { SfxKey } from './sfxManifest';

export const emitRunSfx = (key: SfxKey, options?: { volume?: number; rate?: number }): void =>
{
    EventBus.emit(GAME_EVENTS.PLAY_SFX, { key, ...options });
};
