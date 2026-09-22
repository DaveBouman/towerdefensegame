import { describeAscensionLevel } from '../../../game/run/ascension';
import { BackButton } from './menuShared';

interface NewRunConfirmProps {
    pause: boolean;
    draftSeed: string;
    ascensionLevel: number;
    onBack: () => void;
    onDraftSeedChange: (value: string) => void;
    onRandomizeSeed: () => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const NewRunConfirm = ({
    pause,
    draftSeed,
    ascensionLevel,
    onBack,
    onDraftSeedChange,
    onRandomizeSeed,
    onConfirm,
    onCancel,
}: NewRunConfirmProps) => (
    <>
        <BackButton onClick={onBack} />
        <p className="main-menu__eyebrow">{pause ? 'Confirm' : 'Jack in'}</p>
        <h2 className="main-menu__screen-title">
            {pause ? 'Start a fresh road?' : 'Start the road'}
        </h2>
        {pause && (
            <p className="main-menu__confirm-copy">
                This leaves your current session and returns you to the road gallery.
            </p>
        )}
        <label className="main-menu__field main-menu__field--seed">
            <span className="main-menu__field-label">Seed</span>
            <span className="main-menu__seed-row">
                <input
                    className="main-menu__seed-input"
                    value={draftSeed}
                    maxLength={12}
                    spellCheck={false}
                    aria-label="Run seed"
                    onChange={(event) => onDraftSeedChange(event.target.value)}
                />
                <button
                    type="button"
                    className="main-menu__seed-random"
                    title="Random seed"
                    aria-label="Random seed"
                    onClick={onRandomizeSeed}
                >
                    &#x21bb;
                </button>
            </span>
        </label>
        {ascensionLevel > 0 && (
            <div className="main-menu__field">
                <span className="main-menu__field-label">Ascension</span>
                <p className="main-menu__seed-readonly" aria-label="Ascension level">
                    {describeAscensionLevel(ascensionLevel)}
                </p>
                <p className="main-menu__hint main-menu__field-hint--muted">
                    Clear the Warden to unlock the next tier.
                </p>
            </div>
        )}
        <div className="main-menu__actions">
            <button
                type="button"
                className={`main-menu__start${pause ? ' main-menu__start--danger' : ''}`}
                onClick={onConfirm}
            >
                {pause ? 'Yes, start the road' : 'Start the road'}
            </button>
            <button
                type="button"
                className="main-menu__secondary"
                onClick={onCancel}
            >
                {pause ? 'Keep playing' : 'Back'}
            </button>
        </div>
    </>
);
