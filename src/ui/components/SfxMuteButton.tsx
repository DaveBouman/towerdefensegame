import { useEffect, useState } from 'react';
import { subscribeSfxSettings, toggleSfxMuted } from '../../game/audio/gameAudio';

export const SfxMuteButton = () =>
{
    const [ muted, setMuted ] = useState(false);

    useEffect(() => subscribeSfxSettings((settings) => setMuted(settings.muted)), []);

    return (
        <button
            type="button"
            className="sfx-mute-btn"
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            aria-pressed={muted}
            title={muted ? 'Unmute audio' : 'Mute audio'}
            onClick={() => toggleSfxMuted()}
        >
            {muted ? 'MUTE' : 'AUDIO'}
        </button>
    );
};
