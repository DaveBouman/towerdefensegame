import type { TowerStateSnapshot } from '../../game/domain/types';
import { TowerTargetingPanel } from './TowerTargetingPanel';

const formatLabel = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

interface TowerControlPanelProps {
    tower: TowerStateSnapshot;
}

export const TowerControlPanel = ({ tower }: TowerControlPanelProps) => (
    <>
        <TowerTargetingPanel tower={tower} />
        <section className="unit-info-bar__section">
            <h3 className="unit-info-bar__section-title">Race links</h3>
            <ul className="unit-info-bar__tags">
                {(tower.raceAuraTags.length > 0 ? tower.raceAuraTags : [ 'No active links' ]).map((tag) => (
                    <li key={tag} className="unit-info-bar__tag">
                        {tag}
                    </li>
                ))}
            </ul>
        </section>
        {tower.weaknesses.length > 0 && (
            <section className="unit-info-bar__section">
                <h3 className="unit-info-bar__section-title">Weaknesses</h3>
                <ul className="unit-info-bar__tags">
                    {tower.weaknesses.map((weakness) => (
                        <li key={weakness} className="unit-info-bar__tag">
                            {formatLabel(weakness)}
                        </li>
                    ))}
                </ul>
            </section>
        )}
    </>
);
