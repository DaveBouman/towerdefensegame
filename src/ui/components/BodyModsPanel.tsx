import {
    BODY_MOD_IDS,
    getBodyModDefinitionOrThrow,
    getMarkSevenProgress,
} from '../../game/run/bodyMods';

interface BodyModsPanelProps {
    bodyMods: readonly string[];
    runAttackCount: number;
    className?: string;
}

export const BodyModsPanel = ({
    bodyMods,
    runAttackCount,
    className = '',
}: BodyModsPanelProps) =>
{
    if (bodyMods.length === 0)
    {
        return null;
    }

    return (
        <section
            className={`body-mods-panel ${className}`.trim()}
            role="region"
            aria-label="Installed body mods"
        >
            <h2 className="body-mods-panel__title">Body Mods</h2>
            <ul className="body-mods-panel__list">
                {bodyMods.map((modId) =>
                {
                    const definition = getBodyModDefinitionOrThrow(modId);
                    const isMarkSeven = modId === BODY_MOD_IDS.markSeven;
                    const markSevenProgress = isMarkSeven
                        ? getMarkSevenProgress(runAttackCount)
                        : null;

                    return (
                        <li
                            key={modId}
                            className={
                                markSevenProgress?.nextAttackIsProc
                                    ? 'body-mods-panel__item body-mods-panel__item--ready'
                                    : 'body-mods-panel__item'
                            }
                            title={definition.blurb}
                        >
                            <div className="body-mods-panel__header">
                                <span className="body-mods-panel__label">{definition.label}</span>
                                {markSevenProgress && (
                                    <span
                                        className="body-mods-panel__counter"
                                        title="Run attacks toward the next double-damage swing"
                                    >
                                        {markSevenProgress.attacksInCycle}/{markSevenProgress.interval}
                                    </span>
                                )}
                            </div>
                            <p className="body-mods-panel__effect">{definition.effect}</p>
                            {markSevenProgress?.nextAttackIsProc && (
                                <p className="body-mods-panel__ready">Next attack deals double damage</p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};
