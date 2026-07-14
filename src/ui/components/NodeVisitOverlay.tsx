import { NODE_KIND_INFO } from '../../game/run/nodeKinds';
import type { RunMapNode } from '../../game/run/runMap';
import { NodeKindIcon } from './NodeKindIcon';

interface NodeVisitOverlayProps {
    node: RunMapNode;
    gold: number;
    onContinue: () => void;
}

/**
 * Placeholder screen for shop nodes. Random events use `RunEventOverlay`.
 */
export const NodeVisitOverlay = ({ node, gold, onContinue }: NodeVisitOverlayProps) =>
{
    const info = NODE_KIND_INFO[node.kind];

    return (
        <div className={`node-visit node-visit--${node.kind}`}>
            <div className="node-visit__panel">
                <span className="node-visit__icon">
                    <NodeKindIcon kind={node.kind} />
                </span>
                <h1 className="node-visit__title">{info.label}</h1>
                <p className="node-visit__summary">{info.tooltip}</p>
                {node.kind === 'shop' && (
                    <p className="node-visit__gold">You carry {gold} gold.</p>
                )}
                <button type="button" className="node-visit__button" onClick={onContinue}>
                    Continue
                </button>
            </div>
        </div>
    );
};
