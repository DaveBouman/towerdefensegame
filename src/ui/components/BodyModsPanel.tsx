import {
    BODY_MOD_IDS,
    INTERVAL_STRIKE_BODY_MOD_INTERVALS,
    getIntervalStrikeProgress,
    getBodyModDefinitionOrThrow,
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
                    const interval = INTERVAL_STRIKE_BODY_MOD_INTERVALS[modId];
                    const intervalProgress = interval !== undefined
                        ? getIntervalStrikeProgress(runAttackCount, interval)
                        : null;

                    return (
                        <li
                            key={modId}
                            className={
                                intervalProgress?.nextAttackIsProc
                                    ? 'body-mods-panel__item body-mods-panel__item--ready'
                                    : 'body-mods-panel__item'
                            }
                            title={definition.blurb}
                        >
                            <div className="body-mods-panel__header">
                                <span className="body-mods-panel__label">{definition.label}</span>
                                {intervalProgress && (
                                    <span
                                        className="body-mods-panel__counter"
                                        title="Run attacks toward the next double-damage swing"
                                    >
                                        {intervalProgress.attacksInCycle}/{intervalProgress.interval}
                                    </span>
                                )}
                            </div>
                            <p className="body-mods-panel__effect">{definition.effect}</p>
                            {intervalProgress?.nextAttackIsProc && (
                                <p className="body-mods-panel__ready">Next attack deals double damage</p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};
