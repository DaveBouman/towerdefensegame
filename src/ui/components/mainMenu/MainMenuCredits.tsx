import { BackButton } from './menuShared';

interface MainMenuCreditsProps {
    onBack: () => void;
}

export const MainMenuCredits = ({ onBack }: MainMenuCreditsProps) => (
    <>
        <BackButton onClick={onBack} />
        <p className="main-menu__eyebrow">Transmission</p>
        <h2 className="main-menu__screen-title">Credits</h2>
        <div className="main-menu__credits">
            <p>
                Temporary art (to be replaced):
            </p>
            <p>
                UI icons — Craftpix free cyberpunk icon packs
                (craftpix-net-172155, craftpix-net-507528).
            </p>
            <p>
                Enemy portraits — Craftpix free cyberpunk avatar packs
                (craftpix-net-108089, craftpix-net-969033).
            </p>
            <p className="main-menu__hint">
                License: <a href="https://craftpix.net/file-licenses/" target="_blank" rel="noreferrer">craftpix.net/file-licenses</a>
            </p>
        </div>
    </>
);
