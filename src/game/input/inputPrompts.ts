/**
 * Controller / keyboard prompt glyphs for HUD hints.
 *
 * **Steam Deck is the primary target.** Built-in Deck controls and most Steam Input
 * configs use an Xbox-style A/B/X/Y layout (`steamdeck` / `xbox` art).
 *
 * If someone plugs a DualSense, DualShock, Switch Pro, or Xbox pad into a Deck or PC,
 * we swap glyph sets from the Gamepad.id (unless Steam Input virtualizes the pad as
 * Xbox — then Xbox glyphs are correct because the layout was remapped).
 *
 * Manual override: `setInputPromptDeviceOverride` (settings) wins over auto-detect.
 *
 * Assets: `public/assets/input-prompts/<device>/<button>.png`
 */

export type InputPromptDevice =
    | 'steamdeck'
    | 'xbox'
    | 'playstation4'
    | 'playstation5'
    | 'switch'
    | 'keyboard';

/** Logical buttons shared across devices (Western confirm = bottom face). */
export type InputPromptButton =
    | 'confirm'
    | 'cancel'
    | 'west'
    | 'north'
    | 'lb'
    | 'rb'
    | 'lt'
    | 'rt'
    | 'dpad'
    | 'dpad-up'
    | 'dpad-down'
    | 'dpad-left'
    | 'dpad-right'
    | 'left-stick'
    | 'right-stick'
    | 'left-stick-move'
    | 'right-stick-move'
    | 'left-stick-click'
    | 'right-stick-click'
    | 'menu'
    | 'mouse-left'
    | 'mouse-right'
    | 'space';

const PROMPT_ROOT = 'assets/input-prompts';
const OVERRIDE_STORAGE_KEY = 'signal-chain.inputPromptDevice';

/** In-memory override (also mirrored to localStorage when available). */
let deviceOverride: InputPromptDevice | null = null;

/** Default device for prompts until a pad is detected — Deck/Xbox layout. */
export const DEFAULT_INPUT_PROMPT_DEVICE: InputPromptDevice = 'steamdeck';

const DEVICE_FOLDER: Record<InputPromptDevice, string> = {
    steamdeck: 'steamdeck',
    xbox: 'xbox',
    playstation4: 'playstation4',
    playstation5: 'playstation5',
    switch: 'switch',
    keyboard: 'keyboard',
};

const ALL_DEVICES = new Set<string>(Object.keys(DEVICE_FOLDER));

/** Buttons that exist on every gamepad set (keyboard may omit mouse-only). */
const CORE_BUTTONS: readonly InputPromptButton[] = [
    'confirm',
    'cancel',
    'west',
    'north',
    'lb',
    'rb',
    'lt',
    'rt',
    'dpad',
    'dpad-up',
    'dpad-down',
    'dpad-left',
    'dpad-right',
    'left-stick',
    'right-stick',
    'left-stick-move',
    'right-stick-move',
    'left-stick-click',
    'right-stick-click',
    'menu',
];

export const getInputPromptSrc = (
    button: InputPromptButton,
    device: InputPromptDevice = DEFAULT_INPUT_PROMPT_DEVICE,
): string =>
{
    const folder = DEVICE_FOLDER[device];

    // Mouse-only art lives under keyboard; fall back for other devices.
    if (
        (button === 'mouse-left' || button === 'mouse-right' || button === 'space')
        && device !== 'keyboard'
    )
    {
        return `${PROMPT_ROOT}/keyboard/${button}.png`;
    }

    return `${PROMPT_ROOT}/${folder}/${button}.png`;
};

const isInputPromptDevice = (value: string): value is InputPromptDevice =>
    ALL_DEVICES.has(value);

/** Settings override — `null` clears and returns to auto-detect. */
export const setInputPromptDeviceOverride = (device: InputPromptDevice | null): void =>
{
    deviceOverride = device;

    if (typeof localStorage === 'undefined')
    {
        return;
    }

    if (!device)
    {
        localStorage.removeItem(OVERRIDE_STORAGE_KEY);

        return;
    }

    localStorage.setItem(OVERRIDE_STORAGE_KEY, device);
};

export const getInputPromptDeviceOverride = (): InputPromptDevice | null =>
{
    if (deviceOverride)
    {
        return deviceOverride;
    }

    if (typeof localStorage === 'undefined')
    {
        return null;
    }

    const raw = localStorage.getItem(OVERRIDE_STORAGE_KEY);

    if (raw && isInputPromptDevice(raw))
    {
        deviceOverride = raw;

        return raw;
    }

    return null;
};

/**
 * Map a Gamepad.id string to a prompt device.
 * Order: PlayStation / Switch first (specific), then Deck / Xbox / Steam virtual.
 */
export const detectInputPromptDevice = (gamepadId: string | null | undefined): InputPromptDevice =>
{
    if (!gamepadId)
    {
        return DEFAULT_INPUT_PROMPT_DEVICE;
    }

    const id = gamepadId.toLowerCase();

    // Native PS / Switch ids (Steam Input off, or direct USB/BT on Deck/PC).
    if (id.includes('dualsense'))
    {
        return 'playstation5';
    }

    if (
        id.includes('dualshock')
        || id.includes('playstation')
        || (id.includes('wireless controller') && id.includes('054c'))
        || id.includes('sony')
    )
    {
        // DualShock 4 often reports as "Wireless Controller (STANDARD GAMEPAD Vendor: 054c …)"
        return id.includes('dualsense') ? 'playstation5' : 'playstation4';
    }

    if (
        id.includes('switch')
        || id.includes('joy-con')
        || id.includes('joycon')
        || id.includes('pro controller')
        || id.includes('nintendo')
    )
    {
        return 'switch';
    }

    // Built-in Deck controls / Steam virtual Xbox pad / real Xbox pads.
    if (
        id.includes('steam deck')
        || id.includes('steamdeck')
        || id.includes('valve')
    )
    {
        return 'steamdeck';
    }

    if (
        id.includes('steam virtual')
        || id.includes('xinput')
        || id.includes('xbox')
        || id.includes('microsoft')
        || id.includes('8bitdo') // most 8BitDo X-input modes
    )
    {
        return 'xbox';
    }

    // Unknown: Deck-first Xbox layout (safe Steam default).
    return DEFAULT_INPUT_PROMPT_DEVICE;
};

const padActivityScore = (pad: Gamepad): number =>
{
    let score = 0;

    for (const button of pad.buttons)
    {
        if (button.pressed || button.value > 0.15)
        {
            score += 2;
        }
    }

    for (const axis of pad.axes)
    {
        if (Math.abs(axis) > 0.25)
        {
            score += 1;
        }
    }

    return score;
};

/**
 * Active glyph set: settings override → most-active connected pad → Deck default.
 * With several pads (Deck + DualSense docked), the one being used wins.
 */
export const resolveActiveInputPromptDevice = (): InputPromptDevice =>
{
    const override = getInputPromptDeviceOverride();

    if (override)
    {
        return override;
    }

    if (typeof navigator === 'undefined' || !navigator.getGamepads)
    {
        return DEFAULT_INPUT_PROMPT_DEVICE;
    }

    const pads = [ ...navigator.getGamepads() ].filter((pad): pad is Gamepad => pad !== null);

    if (pads.length === 0)
    {
        return DEFAULT_INPUT_PROMPT_DEVICE;
    }

    let best = pads[0]!;
    let bestScore = padActivityScore(best);

    for (let i = 1; i < pads.length; i++)
    {
        const pad = pads[i]!;
        const score = padActivityScore(pad);

        if (score > bestScore)
        {
            best = pad;
            bestScore = score;
        }
    }

    return detectInputPromptDevice(best.id);
};

export const listCoreInputPromptButtons = (): readonly InputPromptButton[] => CORE_BUTTONS;

export const listInputPromptDevices = (): readonly InputPromptDevice[] =>
    [
        'steamdeck',
        'xbox',
        'playstation5',
        'playstation4',
        'switch',
        'keyboard',
    ];
