import { useGameViewModel } from '../viewmodels/useGameViewModel';

const RACE_LABELS = {
    'aether-dominion': 'Aether Dominion',
    'swarmforge-brood': 'Swarmforge Brood',
    'iron-covenant': 'Iron Covenant',
} as const;

const RACE_ORDER = [
    'aether-dominion',
    'swarmforge-brood',
    'iron-covenant',
] as const;

export const RaceLegendPanel = () =>
{
    const { raceDraftBias } = useGameViewModel();

    return (
        <section className="race-legend" aria-label="Race draft bias">
            <span className="race-legend__title">Race Draft Bias</span>
            <ul className="race-legend__list">
                {RACE_ORDER.map((race) => (
                    <li key={race} className="race-legend__row">
                        <span className="race-legend__name">{RACE_LABELS[race]}</span>
                        <span className="race-legend__value">x{(raceDraftBias[race] ?? 1).toFixed(2)}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
};

