import { useEffect, useState } from 'react';
import { emitRunSfx } from '../../../game/audio/emitRunSfx';
import type { AudioSettings } from '../../../game/audio/audioSettings';
import {
    setMasterVolume,
    setMusicVolume,
    setSfxMuted,
    setSfxVolume,
} from '../../../game/audio/gameAudio';
import { isDesktopShell, setGameFullscreen } from '../../../game/desktop/desktopBridge';
import {
    DISPLAY_PRESETS,
    applyDisplayPreset,
    readActiveDisplayPreset,
    readAvailableDisplayPresets,
    type DisplayPreset,
    type DisplayPresetId,
} from '../../../game/desktop/displaySettings';
import {
    isSteamBridgeAvailable,
    readSteamFacesEnabled,
    writeSteamFacesEnabled,
} from '../../../game/desktop/steamAvatars';
import {
    getInputPromptDeviceOverride,
    listInputPromptDevices,
    resolveActiveInputPromptDevice,
    setInputPromptDeviceOverride,
    type InputPromptDevice,
} from '../../../game/input/inputPrompts';
import {
    CURSOR_COLOR_LABELS,
    CURSOR_COLORS,
    readCursorColor,
    setCursorColor,
    type CursorColor,
} from '../../../game/ui/cursorSettings';
import {
    TEXT_SCALE_SIZES,
    type TextScaleSize,
    setTextScale,
} from '../../../game/ui/textScale';
import { t, type CopyKey } from '../../../game/copy/strings';
import { InputPromptIcon } from '../InputPromptIcon';
import { BackButton, VolumeRow } from './menuShared';

type PromptDeviceChoice = 'auto' | InputPromptDevice;

const PROMPT_DEVICE_LABEL_KEY: Record<InputPromptDevice, CopyKey> = {
    steamdeck: 'settings.controller.steamdeck',
    xbox: 'settings.controller.xbox',
    playstation5: 'settings.controller.playstation5',
    playstation4: 'settings.controller.playstation4',
    switch: 'settings.controller.switch',
    keyboard: 'settings.controller.keyboard',
};

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
    const desktop = isDesktopShell();
    const steamReady = isSteamBridgeAvailable();
    const [ steamFaces, setSteamFaces ] = useState(readSteamFacesEnabled);
    const [ cursorColor, setCursorColorState ] = useState(readCursorColor);
    const [ promptChoice, setPromptChoice ] = useState<PromptDeviceChoice>(
        () => getInputPromptDeviceOverride() ?? 'auto',
    );
    const [ displayPreset, setDisplayPreset ] = useState<DisplayPresetId>('1280x720');
    const [ availablePresets, setAvailablePresets ] = useState<DisplayPresetId[]>(
        DISPLAY_PRESETS.map((preset) => preset.id),
    );

    useEffect(() =>
    {
        if (!desktop)
        {
            return;
        }

        void Promise.all([
            readActiveDisplayPreset(),
            readAvailableDisplayPresets(),
        ]).then(([ activePreset, allowedPresets ]) =>
        {
            setDisplayPreset(activePreset);
            setAvailablePresets(allowedPresets);
        });
    }, [ desktop ]);

    const selectablePresets = DISPLAY_PRESETS.filter((preset) =>
        availablePresets.includes(preset.id));

    const previewDevice: InputPromptDevice = promptChoice === 'auto'
        ? resolveActiveInputPromptDevice()
        : promptChoice;

    const formatPresetLabel = (preset: DisplayPreset): string =>
    {
        if (preset.id === 'adaptive')
        {
            return t('settings.resolution.adaptive');
        }

        return `${preset.width} × ${preset.height}`;
    };

    const chooseDisplayPreset = (nextPreset: DisplayPresetId): void =>
    {
        if (nextPreset === displayPreset || fullscreen)
        {
            return;
        }

        emitRunSfx('ui-click', { volume: 0.64, rate: 1.02 });
        void applyDisplayPreset(nextPreset).then((appliedPreset) =>
        {
            setDisplayPreset(appliedPreset);
        });
    };

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

    const chooseCursorColor = (color: CursorColor): void =>
    {
        if (color === cursorColor)
        {
            return;
        }

        emitRunSfx('ui-click', { volume: 0.64, rate: 1.06 });
        setCursorColor(color);
        setCursorColorState(color);
    };

    const choosePromptDevice = (next: PromptDeviceChoice): void =>
    {
        if (next === promptChoice)
        {
            return;
        }

        emitRunSfx('ui-click', { volume: 0.64, rate: 1.04 });
        setInputPromptDeviceOverride(next === 'auto' ? null : next);
        setPromptChoice(next);
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
                    <span className="main-menu__field-label">Controls</span>
                    <div className="main-menu__display-panel">
                        <span className="main-menu__sublabel">{t('settings.controller.label')}</span>
                        <select
                            className="main-menu__resolution-select"
                            aria-label={t('settings.controller.label')}
                            value={promptChoice}
                            onChange={(event) =>
                            {
                                choosePromptDevice(event.target.value as PromptDeviceChoice);
                            }}
                        >
                            <option value="auto">{t('settings.controller.auto')}</option>
                            {listInputPromptDevices().map((device) => (
                                <option key={device} value={device}>
                                    {t(PROMPT_DEVICE_LABEL_KEY[device])}
                                </option>
                            ))}
                        </select>
                        <div className="main-menu__prompt-preview" aria-hidden="true">
                            <InputPromptIcon button="confirm" device={previewDevice} size={32} />
                            <InputPromptIcon button="cancel" device={previewDevice} size={32} />
                            <InputPromptIcon button="west" device={previewDevice} size={32} />
                            <InputPromptIcon button="north" device={previewDevice} size={32} />
                            <InputPromptIcon button="lb" device={previewDevice} size={32} />
                            <InputPromptIcon button="rb" device={previewDevice} size={32} />
                        </div>
                        <p className="main-menu__hint">{t('settings.controller.hint')}</p>
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
                        <span className="main-menu__sublabel">{t('settings.cursor.label')}</span>
                        <div
                            className="main-menu__cursor-row"
                            role="radiogroup"
                            aria-label={t('settings.cursor.label')}
                        >
                            {CURSOR_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    role="radio"
                                    aria-checked={cursorColor === color}
                                    className={[
                                        'main-menu__cursor-option',
                                        `main-menu__cursor-option--${color}`,
                                        cursorColor === color ? 'main-menu__cursor-option--active' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => chooseCursorColor(color)}
                                >
                                    <span className="main-menu__cursor-swatch" aria-hidden="true" />
                                    {CURSOR_COLOR_LABELS[color]}
                                </button>
                            ))}
                        </div>
                        <p className="main-menu__hint">{t('settings.cursor.hint')}</p>
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
                        {desktop && (
                            <>
                                <span className="main-menu__sublabel">{t('settings.resolution.label')}</span>
                                <select
                                    className="main-menu__resolution-select"
                                    aria-label={t('settings.resolution.label')}
                                    value={displayPreset}
                                    disabled={fullscreen}
                                    onChange={(event) =>
                                    {
                                        chooseDisplayPreset(event.target.value as DisplayPresetId);
                                    }}
                                >
                                    {selectablePresets.map((preset) => (
                                        <option key={preset.id} value={preset.id}>
                                            {formatPresetLabel(preset)}
                                        </option>
                                    ))}
                                </select>
                                <p className="main-menu__hint">
                                    {fullscreen
                                        ? t('settings.resolution.fullscreenHint')
                                        : t('settings.resolution.windowHint')}
                                </p>
                            </>
                        )}
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
