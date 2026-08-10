import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { BgmTrack } from './bgmManifest';
import { ensureAudioUnlocked } from './gameAudio';

export const emitRunBgm = (track: BgmTrack): void =>
{
    void ensureAudioUnlocked();
    EventBus.emit(GAME_EVENTS.SET_BGM, { track });
};
