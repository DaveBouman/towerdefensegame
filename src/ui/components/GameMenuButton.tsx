import { emitRunSfx } from '../../game/audio/emitRunSfx';

interface GameMenuButtonProps {
    open: boolean;
    onClick: () => void;
}

const MenuGlyph = ({ open }: { open: boolean }) => (
    <svg
        className="game-menu-btn__icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        focusable="false"
    >
        {open ? (
            <path
                fill="currentColor"
                d="M6.2 5.1 12 10.9l5.8-5.8 1.1 1.1L13.1 12l5.8 5.8-1.1 1.1L12 13.1l-5.8 5.8-1.1-1.1L10.9 12 5.1 6.2z"
            />
        ) : (
            <path
                fill="currentColor"
                d="M4 6.5h16v1.8H4zm0 4.6h16v1.8H4zm0 4.6h16v1.8H4z"
            />
        )}
    </svg>
);

export const GameMenuButton = ({ open, onClick }: GameMenuButtonProps) => (
    <button
        type="button"
        className={`game-menu-btn${open ? ' game-menu-btn--open' : ''}`}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        title={open ? 'Close menu' : 'Menu'}
        onClick={() =>
        {
            emitRunSfx('ui-click', { volume: 0.7 });
            onClick();
        }}
    >
        <MenuGlyph open={open} />
    </button>
);
