import { ModalShell } from './CyberPanel';
import type { FloorBriefing } from '../../game/run/floorBriefings';

interface FloorBriefingOverlayProps {
    floor: number;
    briefing: FloorBriefing;
    onDismiss: () => void;
}

export const FloorBriefingOverlay = ({
    floor,
    briefing,
    onDismiss,
}: FloorBriefingOverlayProps) =>
(
    <ModalShell
        variant="cyan"
        rootClassName="floor-briefing"
        panelClassName="floor-briefing__panel"
        onBackdropClick={onDismiss}
        role="dialog"
        ariaModal
        ariaLabel={`Floor ${floor} briefing`}
    >
        <p className="floor-briefing__eyebrow">Floor {floor} briefing</p>
        <h1 className="floor-briefing__title">{briefing.title}</h1>
        <p className="floor-briefing__body">{briefing.body}</p>
        <p className="floor-briefing__tip">{briefing.tip}</p>
        <button type="button" className="floor-briefing__dismiss" onClick={onDismiss}>
            Acknowledge
        </button>
    </ModalShell>
);
