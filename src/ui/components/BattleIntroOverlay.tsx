import { useEffect } from 'react';
import type { RunMapNodeKind } from '../../game/run/nodeKinds';

const INTRO_COPY: Partial<Record<RunMapNodeKind, { eyebrow: string; title: string }>> = {
    'semi-boss': { eyebrow: 'Lieutenant on grid', title: 'District enforcer engaged' },
    boss: { eyebrow: 'Final node', title: 'The Warden blocks your path' },
};

interface BattleIntroOverlayProps {
    nodeKind: RunMapNodeKind;
    onDone: () => void;
}

export const BattleIntroOverlay = ({ nodeKind, onDone }: BattleIntroOverlayProps) =>
{
    const copy = INTRO_COPY[nodeKind];

    useEffect(() =>
    {
        const timer = window.setTimeout(onDone, 2600);

        return () => window.clearTimeout(timer);
    }, [ nodeKind, onDone ]);

    if (!copy)
    {
        return null;
    }

    return (
        <div className={`battle-intro battle-intro--${nodeKind}`} role="status">
            <p className="battle-intro__eyebrow">{copy.eyebrow}</p>
            <h2 className="battle-intro__title">{copy.title}</h2>
        </div>
    );
};
