import { useState } from 'react';
import { emitRunSfx } from '../../../game/audio/emitRunSfx';
import type { AudioSettings } from '../../../game/audio/audioSettings';
import {
    setMasterVolume,
    setMusicVolume,
    setSfxMuted,
    setSfxVolume,
} from '../../../game/audio/gameAudio';
import { setGameFullscreen } from '../../../game/desktop/desktopBridge';
import {
    isSteamBridgeAvailable,
    readSteamFacesEnabled,
    writeSteamFacesEnabled,
} from '../../../game/desktop/steamAvatars';
import {
    TEXT_SCALE_SIZES,
    type TextScaleSize,
    setTextScale,
} from '../../../game/ui/textScale';
import { t } from '../../../game/copy/strings';
import { BackButton, VolumeRow } from './menuShared';

interface MainMenuSettingsProps {
    pause: boolean;
    seed: string;
    audio: AudioSettings;
    fullscreen: boolean;
    textScale: TextScaleSize;
    tutorialArmed: boolean;
    onBack: () => void;
    onFullscreenChange: (next: boolean) => void;
    onTextScaleChange: (size: TextScaleSize) => void;
    onTutorialArmed: () => void;
    onReplayTutorial: () => void;
}

export const MainMenuSettings = ({
    pause,
    seed,
    audio,
    fullscreen,
    textScale,
    tutorialArmed,
    onBack,
    onFullscreenChange,
    onTextScaleChange,
    onTutorialArmed,
    onReplayTutorial,
}: MainMenuSettingsProps) =>
{
    const steamReady = isSteamBridgeAvailable();
    const [ steamFaces, setSteamFaces ] = useState(readSteamFacesEnabled);

    const chooseTextScale = (size: TextScaleSize): void =>
    {
        if (size === textScale)
        {
            return;
        }

        emitRunSfx('ui-click', { volume: 0.64, rate: 1.06 });
        setTextScale(size);
        onTextScaleChange(size);
    };

    return (
        <>
            <BackButton onClick={onBack} />
            <p className="main-menu__eyebrow">Options</p>
            <h2 className="main-menu__screen-title">Settings</h2>

            <div className="main-menu__settings">
                {pause && (
                    <div className="main-menu__field">
                        <span className="main-menu__field-label">Current seed</span>
                        <p className="main-menu__seed-readonly" aria-label="Current run seed">
                            {seed}
                        </p>
                        <p className="main-menu__hint">
                            To play a different seed, use New run.
                        </p>
                    </div>
                )}

                <div className="main-menu__field">
                    <span className="main-menu__field-label">Audio</span>
                    <div className="main-menu__audio-panel">
                        <button
                            type="button"
                            className={`main-menu__mute${audio.muted ? ' main-menu__mute--on' : ''}`}
                            aria-pressed={audio.muted}
                            onClick={() =>
                            {
                                emitRunSfx('ui-click', { volume: 0.7 });
                                setSfxMuted(!audio.muted);
                            }}
                        >
                            {audio.muted ? 'Muted' : 'Audio on'}
                        </button>
                        <VolumeRow
                            label="Master"
                            value={audio.masterVolume}
                            disabled={audio.muted}
                            onChange={setMasterVolume}
                        />
                        <VolumeRow
                            label="Music"
                            value={audio.musicVolume}
                            disabled={audio.muted}
                            onChange={setMusicVolume}
                        />
                        <VolumeRow
                            label="SFX"
                            value={audio.sfxVolume}
                            disabled={audio.muted}
                            onChange={setSfxVolume}
                        />
                    </div>
                </div>

                <div className="main-menu__field">
                    <span className="main-menu__field-label">Display</span>
                    <div className="main-menu__display-panel">
                        <span className="main-menu__sublabel">Text size</span>
                        <div
                            className="main-menu__size-row"
                            role="radiogroup"
                            aria-label="Text size"
                        >
                            {TEXT_SCALE_SIZES.map((size) => (
                                <button
                                    key={size}
                                    type="button"
                                    role="radio"
                                    aria-checked={textScale === size}
                                    className={`main-menu__size-option${textScale === size ? ' main-menu__size-option--active' : ''}`}
                                    onClick={() => chooseTextScale(size)}
                                >
                                    {size === 'small' ? 'Small' : size === 'medium' ? 'Medium' : 'Large'}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            className={`main-menu__toggle${fullscreen ? ' main-menu__toggle--on' : ''}`}
                            aria-pressed={fullscreen}
                            onClick={() =>
                            {
                                emitRunSfx('ui-click', { volume: 0.68 });
                                void setGameFullscreen(!fullscreen).then(onFullscreenChange);
                            }}
                        >
                            {fullscreen ? 'Fullscreen on' : 'Fullscreen off'}
                        </button>
                    </div>
                </div>

                <div className="main-menu__field">
                    <span className="main-menu__field-label">Steam</span>
                    <div className="main-menu__display-panel">
                        <button
                            type="button"
                            className={`main-menu__toggle${steamFaces ? ' main-menu__toggle--on' : ''}`}
                            aria-pressed={steamFaces}
                            disabled={!steamReady}
                            onClick={() =>
                            {
                                if (!steamReady)
                                {
                                    return;
                                }

                                emitRunSfx('ui-click', { volume: 0.68 });
                                const next = !steamFaces;

                                writeSteamFacesEnabled(next);
                                setSteamFaces(next);
                            }}
                        >
                            {steamFaces ? t('settings.steam.on') : t('settings.steam.off')}
                        </button>
                        <p className="main-menu__hint">
                            {steamReady ? t('settings.steam.hint') : t('settings.steam.unavailable')}
                        </p>
                    </div>
                </div>

                <div className="main-menu__field">
                    <span className="main-menu__field-label">Teaching</span>
                    <button
                        type="button"
                        className="main-menu__secondary"
                        onClick={() =>
                        {
                            emitRunSfx('ui-select', { volume: 0.72 });
                            onReplayTutorial();
                            onTutorialArmed();
                        }}
                    >
                        Replay first-run tips
                    </button>
                    {tutorialArmed && (
                        <p className="main-menu__hint">
                            Tips will show again when you start the next run.
                        </p>
                    )}
                </div>
            </div>
        </>
    );
};
