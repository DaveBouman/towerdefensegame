import { getSkirmishEncounter, getSkirmishEncounterPreview } from '../../game/run/skirmishEncounters';

interface SkirmishResultOverlayProps {
    encounterId: string;
    success: boolean;
    onContinue: () => void;
}

export const SkirmishResultOverlay = ({
    encounterId,
    success,
    onContinue,
}: SkirmishResultOverlayProps) =>
{
    const encounter = getSkirmishEncounter(encounterId);
    const preview = getSkirmishEncounterPreview(encounter);

    return (
        <div className="run-event">
            <div className="run-event__panel" style={{ padding: 24 }}>
                <header className="run-event__header">
                    <h1 className="run-event__title">
                        {success ? 'Enemy down' : 'You fell'}
                    </h1>
                    <p className="run-event__intro">
                        {encounter.title} ({preview.enemyLabel})
                        {success
                            ? ' — your chain held.'
                            : ' — pack a different kit and try again.'}
                    </p>
                </header>
                <button type="button" className="main-menu__start" onClick={onContinue}>
                    Back to enemies
                </button>
            </div>
        </div>
    );
};
