import { useState } from 'react';
import type { CardDirection } from '../../game/cardGame/domain/cardDirections';
import { cardNeedsDirectionPick } from '../../game/run/runDeck';
import { CardDirectionPicker } from './CardDirectionPicker';
import { ModalShell } from './CyberPanel';

interface PendingCardDirectionOverlayProps {
    definitionIds: string[];
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    onComplete: (cards: RunDeckCard[]) => void;
}

/** Resolves direction for each queued card before adding to the run deck. */
export const PendingCardDirectionOverlay = ({
    definitionIds,
    eyebrow = 'Deck routing',
    title = 'Choose chain direction',
    subtitle,
    onComplete,
}: PendingCardDirectionOverlayProps) =>
{
    const [ index, setIndex ] = useState(0);
    const [ resolved, setResolved ] = useState<RunDeckCard[]>([]);
    const currentId = definitionIds[index];

    if (!currentId)
    {
        return null;
    }

    const pickDirection = (arrow: CardDirection): void =>
    {
        const card: RunDeckCard = { definitionId: currentId, arrow };
        const nextResolved = [ ...resolved, card ];
        const nextIndex = index + 1;

        if (nextIndex >= definitionIds.length)
        {
            onComplete(nextResolved);
            return;
        }

        setResolved(nextResolved);
        setIndex(nextIndex);
    };

    return (
        <ModalShell
            variant="cyan"
            rootClassName="card-reward"
            panelClassName="card-reward__panel"
        >
            <div className="card-reward__scroll">
                <p className="card-reward__eyebrow">{eyebrow}</p>
                <h1 className="card-reward__title">{title}</h1>
                {subtitle && <p className="card-reward__subtitle">{subtitle}</p>}
                <CardDirectionPicker
                    definitionId={currentId}
                    progress={`${index + 1} / ${definitionIds.filter(cardNeedsDirectionPick).length}`}
                    onPick={pickDirection}
                />
            </div>
        </ModalShell>
    );
};
