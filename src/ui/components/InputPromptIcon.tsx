import type { CSSProperties } from 'react';
import {
    DEFAULT_INPUT_PROMPT_DEVICE,
    getInputPromptSrc,
    type InputPromptButton,
    type InputPromptDevice,
} from '../../game/input/inputPrompts';

interface InputPromptIconProps
{
    button: InputPromptButton;
    /** Defaults to Steam Deck / Xbox-layout glyphs. */
    device?: InputPromptDevice;
    alt?: string;
    size?: number;
    className?: string;
    style?: CSSProperties;
}

const BUTTON_LABEL: Partial<Record<InputPromptButton, string>> = {
    confirm: 'Confirm',
    cancel: 'Cancel',
    west: 'West face button',
    north: 'North face button',
    lb: 'Left bumper',
    rb: 'Right bumper',
    lt: 'Left trigger',
    rt: 'Right trigger',
    dpad: 'D-pad',
    'left-stick-move': 'Move',
    menu: 'Menu',
};

/** Glyph for a logical button — Steam Deck layout by default. */
export const InputPromptIcon = ({
    button,
    device = DEFAULT_INPUT_PROMPT_DEVICE,
    alt,
    size = 28,
    className,
    style,
}: InputPromptIconProps) =>
    (
        <img
            className={className}
            src={getInputPromptSrc(button, device)}
            alt={alt ?? BUTTON_LABEL[button] ?? button}
            width={size}
            height={size}
            draggable={false}
            style={{
                display: 'inline-block',
                verticalAlign: 'middle',
                objectFit: 'contain',
                imageRendering: 'auto',
                ...style,
            }}
        />
    );
