import { NODE_KIND_INFO } from '../../game/run/nodeKinds';
import type { RunMapNode } from '../../game/run/runMap';
import { NodeKindIcon } from './NodeKindIcon';
import { ModalShell } from './CyberPanel';

interface NodeVisitOverlayProps {
    node: RunMapNode;
    gold?: number;
    onContinue: () => void;
}

/**
 * Fallback visit screen for unknown non-battle node kinds.
 * Shop → `ShopOverlay`; event → `RunEventOverlay`; rest → `RestOverlay`.
 */
export const NodeVisitOverlay = ({ node, onContinue }: NodeVisitOverlayProps) =>
{
    const info = NODE_KIND_INFO[node.kind];

    return (
        <ModalShell
            variant="cyan"
            rootClassName={`node-visit node-visit--${node.kind}`}
            panelClassName="node-visit__panel"
        >
            <span className="node-visit__icon">
                <NodeKindIcon kind={node.kind} />
            </span>
            <h1 className="node-visit__title">{info.label}</h1>
            <p className="node-visit__summary">{info.tooltip}</p>
            <button type="button" className="node-visit__button" onClick={onContinue}>
                Continue
            </button>
        </ModalShell>
    );
};
