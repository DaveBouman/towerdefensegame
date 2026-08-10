import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import { ensureAudioUnlocked } from './gameAudio';
import type { SfxKey } from './sfxManifest';

export const emitRunSfx = (key: SfxKey, options?: { volume?: number; rate?: number }): void =>
{
    void ensureAudioUnlocked();
    EventBus.emit(GAME_EVENTS.PLAY_SFX, { key, ...options });
};
