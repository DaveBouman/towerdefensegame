import { NODE_KIND_INFO } from '../../game/run/nodeKinds';
import type { RunMapNode } from '../../game/run/runMap';
import { NodeKindIcon } from './NodeKindIcon';
import { CyberPanelChrome } from './CyberPanel';

interface NodeVisitOverlayProps {
    node: RunMapNode;
    gold: number;
    onContinue: () => void;
}

/**
 * Fallback visit screen for non-shop, non-event nodes.
 * Ripperdoc shops use `ShopOverlay`; events use `RunEventOverlay`.
 */
export const NodeVisitOverlay = ({ node, gold, onContinue }: NodeVisitOverlayProps) =>
{
    const info = NODE_KIND_INFO[node.kind];

    return (
        <div className={`node-visit node-visit--${node.kind}`}>
            <div className="cp-overlay__backdrop" aria-hidden="true" />
            <div className="node-visit__panel cp-panel cp-panel--cyan">
                <CyberPanelChrome variant="cyan" />
                <span className="node-visit__icon">
                    <NodeKindIcon kind={node.kind} />
                </span>
                <h1 className="node-visit__title">{info.label}</h1>
                <p className="node-visit__summary">{info.tooltip}</p>
                {node.kind === 'shop' && (
                    <p className="node-visit__gold">You carry {gold} creds.</p>
                )}
                <button type="button" className="node-visit__button" onClick={onContinue}>
                    Continue
                </button>
            </div>
        </div>
    );
};
