import type { TowerStateSnapshot } from '../../game/domain/types';
import { SidePanel, SP } from './SidePanel';
import { TowerTargetingPanel } from './TowerTargetingPanel';

const formatLabel = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

interface TowerControlPanelProps {
    tower: TowerStateSnapshot;
}

export const TowerControlPanel = ({ tower }: TowerControlPanelProps) => (
    <>
        <TowerTargetingPanel tower={tower} />
        <SidePanel.Section>
            <SidePanel.SectionTitle>Race links</SidePanel.SectionTitle>
            <ul className={SP.tags}>
                {(tower.raceAuraTags.length > 0 ? tower.raceAuraTags : [ 'No active links' ]).map((tag) => (
                    <li key={tag} className={SP.tag}>
                        {tag}
                    </li>
                ))}
            </ul>
        </SidePanel.Section>
        {tower.weaknesses.length > 0 && (
            <SidePanel.Section>
                <SidePanel.SectionTitle>Weaknesses</SidePanel.SectionTitle>
                <ul className={SP.tags}>
                    {tower.weaknesses.map((weakness) => (
                        <li key={weakness} className={SP.tag}>
                            {formatLabel(weakness)}
                        </li>
                    ))}
                </ul>
            </SidePanel.Section>
        )}
    </>
);
