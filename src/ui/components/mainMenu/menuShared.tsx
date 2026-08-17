import type { ReactNode } from 'react';
import { emitRunSfx } from '../../../game/audio/emitRunSfx';

export type MenuMode = 'boot' | 'pause';
export type MenuScreen = 'home' | 'archives' | 'settings' | 'how-to-play' | 'credits' | 'changelog' | 'confirm-new-run';

export type ProgressCount = { unlocked: number; total: number };

const percent = (value: number): number => Math.round(value * 100);

export const VolumeRow = ({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: number;
    disabled?: boolean;
    onChange: (next: number) => void;
}) => (
    <label className="main-menu__volume-row">
        <span className="main-menu__volume-label">{label}</span>
        <input
            className="main-menu__volume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={percent(value)}
            disabled={disabled}
            aria-label={`${label} volume`}
            onChange={(event) => onChange(Number(event.target.value) / 100)}
        />
        <span className="main-menu__volume-value" aria-hidden="true">
            {disabled ? '—' : `${percent(value)}%`}
        </span>
    </label>
);

export const MenuSection = ({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) => (
    <div className="main-menu__section">
        <p className="main-menu__section-label">{label}</p>
        <div className="main-menu__section-actions">{children}</div>
    </div>
);

export const ProgressBadge = ({ unlocked, total }: { unlocked: number; total: number }) => (
    <span className="main-menu__collection-count">{unlocked}/{total}</span>
);

export const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
        type="button"
        className="main-menu__nav-back"
        onClick={() =>
        {
            emitRunSfx('ui-click', { volume: 0.66, rate: 0.94 });
            onClick();
        }}
    >
        ← Back
    </button>
);
