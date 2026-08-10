import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { BgmTrack } from './bgmManifest';
import { crossfadeTo } from './gameBgm';

export const bindGameBgmListeners = (): (() => void) =>
{
    const onSetBgm = ({ track }: { track: BgmTrack }): void =>
    {
        crossfadeTo(track);
    };

    EventBus.on(GAME_EVENTS.SET_BGM, onSetBgm);

    return () =>
    {
        EventBus.off(GAME_EVENTS.SET_BGM, onSetBgm);
    };
};
