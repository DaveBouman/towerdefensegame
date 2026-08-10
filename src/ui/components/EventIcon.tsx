import type { EventIconId } from '../../game/run/runEvents';
import { EVENT_ICON_URL } from '../icons/eventIcons';
import { CraftpixIcon } from './CraftpixIcon';

interface EventIconProps {
    icon: EventIconId;
    className?: string;
}

export const EventIcon = ({ icon, className }: EventIconProps) => (
    <CraftpixIcon src={EVENT_ICON_URL[icon]} className={className} />
);
