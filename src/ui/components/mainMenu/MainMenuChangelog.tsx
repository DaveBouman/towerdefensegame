import type { ReactNode } from 'react';
import { CHANGELOG, formatChangelogDate } from '../../../game/meta/changelog';
import { BackButton } from './menuShared';

interface MainMenuChangelogProps {
    onBack: () => void;
}

const renderInlineBold = (text: string): ReactNode =>
{
    const parts = text.split(/\*\*(.+?)\*\*/g);

    if (parts.length === 1)
    {
        return text;
    }

    return parts.map((part, index) =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
    );
};

export const MainMenuChangelog = ({ onBack }: MainMenuChangelogProps) => (
    <>
        <BackButton onClick={onBack} />
        <p className="main-menu__eyebrow">Patch feed</p>
        <h2 className="main-menu__screen-title">What&apos;s new</h2>
        {CHANGELOG.length === 0 ? (
            <p className="main-menu__changelog-empty">No updates posted yet.</p>
        ) : (
            <ol className="main-menu__changelog">
                {CHANGELOG.map((entry) => (
                    <li key={`${entry.date}-${entry.title}`} className="main-menu__changelog-entry">
                        <p className="main-menu__changelog-date">{formatChangelogDate(entry.date)}</p>
                        <h3 className="main-menu__changelog-title">{entry.title}</h3>
                        {entry.paragraphs.map((paragraph) => (
                            <p key={paragraph} className="main-menu__changelog-body">
                                {renderInlineBold(paragraph)}
                            </p>
                        ))}
                    </li>
                ))}
            </ol>
        )}
    </>
);
