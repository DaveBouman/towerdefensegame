import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { BgmTrack } from './bgmManifest';

export const emitRunBgm = (track: BgmTrack): void =>
{
    EventBus.emit(GAME_EVENTS.SET_BGM, { track });
};
