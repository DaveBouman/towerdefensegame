import { getBodyModDefinitionOrThrow } from '../../game/run/bodyMods';
import { CyberPanelChrome } from './CyberPanel';

interface BodyModRewardOverlayProps {
    options: string[];
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    onConfirm: (bodyModId: string | null) => void;
}

export const BodyModRewardOverlay = ({
    options,
    eyebrow = 'Body mod recovered',
    title = 'Install a body mod',
    subtitle,
    onConfirm,
}: BodyModRewardOverlayProps) =>
{
    const mods = options.map((id) => getBodyModDefinitionOrThrow(id));

    return (
        <div className="card-reward body-mod-reward">
            <div className="cp-overlay__backdrop" aria-hidden="true" />
            <div className="card-reward__panel cp-panel cp-panel--magenta">
                <CyberPanelChrome variant="magenta" />
                <p className="card-reward__eyebrow">{eyebrow}</p>
                <h1 className="card-reward__title">{title}</h1>
                {subtitle && <p className="card-reward__subtitle">{subtitle}</p>}

                <div className="body-mod-reward__choices">
                    {mods.map((mod) => (
                        <button
                            key={mod.id}
                            type="button"
                            className="body-mod-reward__choice"
                            onClick={() => onConfirm(mod.id)}
                        >
                            <span className="body-mod-reward__label">{mod.label}</span>
                            <span className="body-mod-reward__effect">{mod.effect}</span>
                            <span className="body-mod-reward__blurb">{mod.blurb}</span>
                        </button>
                    ))}
                </div>

                <div className="card-reward__actions">
                    <button
                        type="button"
                        className="card-reward__skip"
                        onClick={() => onConfirm(null)}
                    >
                        Leave it
                    </button>
                </div>
            </div>
        </div>
    );
};
