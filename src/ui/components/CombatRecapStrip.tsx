export interface CombatRecapLine {
    label: string;
    value: string;
    tone?: 'good' | 'bad' | 'neutral';
}

interface CombatRecapStripProps {
    lines: CombatRecapLine[];
}

export const CombatRecapStrip = ({ lines }: CombatRecapStripProps) =>
{
    if (lines.length === 0)
    {
        return null;
    }

    return (
        <aside className="combat-recap" role="status" aria-live="polite">
            <p className="combat-recap__title">Last exchange</p>
            <ul className="combat-recap__list">
                {lines.map((line) => (
                    <li
                        key={line.label}
                        className={`combat-recap__item combat-recap__item--${line.tone ?? 'neutral'}`}
                    >
                        <span>{line.label}</span>
                        <strong>{line.value}</strong>
                    </li>
                ))}
            </ul>
        </aside>
    );
};
