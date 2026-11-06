import { useEffect, useMemo, useState } from 'react';
import type { AutoBattlerController } from '../../autoBattlerController/useAutoBattlerController';
import type { BattleEvent, Team, UnitInstance } from '../../game/autoBattler';
import { getUnitDefinitionOrThrow } from '../../game/autoBattler';
import { CyberPanel } from '../components/CyberPanel';
import { UnitCard, unitFromInstance } from './UnitCard';

interface BattleScreenProps {
    controller: AutoBattlerController;
}

interface TeamsView {
    player: (UnitInstance | null)[];
    enemy: (UnitInstance | null)[];
}

const cloneVisibleTeam = (team: Team): (UnitInstance | null)[] =>
    team.map((slot) => (slot ? { ...slot } : null));

const applyEventToTeams = (teams: TeamsView, event: BattleEvent): TeamsView =>
{
    const player = cloneVisibleTeam(teams.player);
    const enemy = cloneVisibleTeam(teams.enemy);
    const sideTeam = (side: 'a' | 'b') => (side === 'a' ? player : enemy);

    if (event.type === 'damage')
    {
        const unit = sideTeam(event.side).find((slot) => slot?.uid === event.uid);

        if (unit)
        {
            unit.health = event.healthAfter;
        }
    }

    if (event.type === 'heal')
    {
        const unit = sideTeam(event.side).find((slot) => slot?.uid === event.uid);

        if (unit)
        {
            unit.health = event.healthAfter;
        }
    }

    if (event.type === 'buff')
    {
        const unit = sideTeam(event.side).find((slot) => slot?.uid === event.uid);

        if (unit)
        {
            unit.attack = Math.max(0, unit.attack + event.attackDelta);
            unit.health += event.healthDelta;
            unit.maxHealth += Math.max(0, event.healthDelta);
        }
    }

    if (event.type === 'faint')
    {
        const team = sideTeam(event.side);
        const index = team.findIndex((slot) => slot?.uid === event.uid);

        if (index >= 0)
        {
            team[index] = null;
        }
    }

    if (event.type === 'summon')
    {
        const team = sideTeam(event.side);
        const packed = team.filter((slot): slot is UnitInstance => slot !== null);
        packed.splice(event.slot, 0, {
            uid: event.uid,
            definitionId: event.definitionId,
            attack: event.attack,
            health: event.health,
            maxHealth: event.health,
        });

        for (let i = 0; i < team.length; i++)
        {
            team[i] = packed[i] ?? null;
        }
    }

    return { player, enemy };
};

const describeEvent = (event: BattleEvent): string =>
{
    switch (event.type)
    {
        case 'start':
            return 'Battle start';
        case 'startOfBattle':
            return `${getUnitDefinitionOrThrow(event.definitionId).label} start trigger`;
        case 'attack':
            return `Attack for ${event.damage}`;
        case 'damage':
            return `Took ${event.amount} → ${event.healthAfter} HP`;
        case 'heal':
            return `Healed ${event.amount}`;
        case 'buff':
            return `Buff +${event.attackDelta}/+${event.healthDelta}`;
        case 'summon':
            return `Summon ${getUnitDefinitionOrThrow(event.definitionId).label}`;
        case 'faint':
            return `${getUnitDefinitionOrThrow(event.definitionId).label} fainted`;
        case 'move':
            return 'Repositioned';
        case 'end':
            return event.winner === 'a'
                ? 'You win'
                : event.winner === 'b'
                    ? 'Enemy wins'
                    : 'Draw';
        default:
            return '';
    }
};

const delayForEvent = (event: BattleEvent): number =>
    event.type === 'attack' || event.type === 'damage' ? 420 : 280;

export const BattleScreen = ({ controller }: BattleScreenProps) =>
{
    const { state, onBattleContinue } = controller;
    const battle = state.battle!;
    const log = battle.result.log;

    const [ step, setStep ] = useState(0);
    const [ teams, setTeams ] = useState<TeamsView>(() => ({
        player: cloneVisibleTeam(battle.playerTeam),
        enemy: cloneVisibleTeam(battle.enemyTeam),
    }));
    const [ caption, setCaption ] = useState('Ready');

    useEffect(() =>
    {
        setStep(0);
        setTeams({
            player: cloneVisibleTeam(battle.playerTeam),
            enemy: cloneVisibleTeam(battle.enemyTeam),
        });
        setCaption('Ready');
    }, [ battle ]);

    useEffect(() =>
    {
        if (step >= log.length)
        {
            return;
        }

        const event = log[step]!;
        const timer = window.setTimeout(() =>
        {
            setTeams((prev) => applyEventToTeams(prev, event));
            setCaption(describeEvent(event));
            setStep((prev) => prev + 1);
        }, delayForEvent(event));

        return () => window.clearTimeout(timer);
    }, [ step, log ]);

    const done = step >= log.length;
    const winnerLabel = useMemo(() =>
    {
        if (battle.result.winner === 'a')
        {
            return 'Victory';
        }

        if (battle.result.winner === 'b')
        {
            return 'Defeat';
        }

        return 'Draw';
    }, [ battle.result.winner ]);

    return (
        <div className="ab-screen ab-battle">
            <CyberPanel variant="magenta" className="ab-panel">
                <header className="ab-header">
                    <div>
                        <p className="ab-eyebrow">Auto battle</p>
                        <h2 className="ab-title">{done ? winnerLabel : 'Resolving…'}</h2>
                    </div>
                    <p className="ab-caption">{caption}</p>
                </header>

                <section className="ab-row-block">
                    <h3 className="ab-row-label">Enemy</h3>
                    <div className="ab-row ab-row--team">
                        {teams.enemy.map((slot, index) => (
                            <div key={`e-${index}`} className="ab-slot">
                                {slot && slot.health > 0 ? (
                                    <UnitCard {...unitFromInstance(slot)} />
                                ) : (
                                    <div className="ab-empty ab-empty--dead">—</div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="ab-row-block">
                    <h3 className="ab-row-label">You</h3>
                    <div className="ab-row ab-row--team">
                        {teams.player.map((slot, index) => (
                            <div key={`p-${index}`} className="ab-slot">
                                {slot && slot.health > 0 ? (
                                    <UnitCard {...unitFromInstance(slot)} />
                                ) : (
                                    <div className="ab-empty ab-empty--dead">—</div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <footer className="ab-actions">
                    <button
                        type="button"
                        className="ab-btn ab-btn--primary"
                        disabled={!done}
                        onClick={onBattleContinue}
                    >
                        {done ? 'Continue' : 'Watching…'}
                    </button>
                </footer>
            </CyberPanel>
        </div>
    );
};
