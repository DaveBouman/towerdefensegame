import type { RunMapNodeKind } from '../../game/run/nodeKinds';
import { NODE_KIND_ICON_URL } from '../icons/nodeKindIcons';
import { CraftpixIcon } from './CraftpixIcon';

interface NodeKindIconProps {
    kind: RunMapNodeKind;
    className?: string;
}

export const NodeKindIcon = ({ kind, className }: NodeKindIconProps) => (
    <CraftpixIcon src={NODE_KIND_ICON_URL[kind]} className={className} />
);
