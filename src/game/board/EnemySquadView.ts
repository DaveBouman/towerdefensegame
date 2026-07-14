import type { CardGameSession } from '../cardGame/domain/CardGameSession';
import type { EnemyCombatant, EnemyTurnAction } from '../cardGame/domain/types';
import { isCombatantAlive } from '../cardGame/domain/enemyCombatants';
import type { BoardLayout } from './boardLayout';
import { computeEnemySlots } from './enemySquadLayout';
import { EnemyTargetView } from './EnemyTargetView';

interface SquadEntry {
    combatant: EnemyCombatant;
    view: EnemyTargetView;
}

export class EnemySquadView
{
    private readonly entries: SquadEntry[] = [];
    private targetPickResolver: ((instanceId: string) => void) | null = null;
    private selectedId: string | null = null;

    constructor (
        private readonly scene: Phaser.Scene,
        layout: BoardLayout,
        combatants: readonly EnemyCombatant[],
        private readonly onSelect?: (instanceId: string) => void,
    )
    {
        const slots = computeEnemySlots(layout, combatants.length);

        combatants.forEach((combatant, index) =>
        {
            const slot = slots[index]!;
            const slotLayout: BoardLayout = {
                ...layout,
                enemyX: slot.x,
                enemyY: slot.y,
                enemySize: slot.size,
            };
            const view = new EnemyTargetView(this.scene, slotLayout, combatant.state);

            view.setEnemyLabel(combatant.definition.label);
            view.setEnemyPassives(combatant.definition.passives);
            view.reposition(slot.x, slot.y);
            view.setTargetClickHandler(() => this.onEnemyClicked(combatant.instanceId));

            this.entries.push({ combatant, view });
        });
    }

    get containers (): Phaser.GameObjects.Container[]
    {
        return this.entries.map((entry) => entry.view.container);
    }

    getView (instanceId: string): EnemyTargetView | undefined
    {
        return this.entries.find((entry) => entry.combatant.instanceId === instanceId)?.view;
    }

    get firstView (): EnemyTargetView | undefined
    {
        return this.entries[0]?.view;
    }

    forEachView (callback: (view: EnemyTargetView, instanceId: string) => void): void
    {
        for (const entry of this.entries)
        {
            callback(entry.view, entry.combatant.instanceId);
        }
    }

    applyLayout (layout: BoardLayout): void
    {
        const slots = computeEnemySlots(layout, this.entries.length);

        this.entries.forEach((entry, index) =>
        {
            const slot = slots[index]!;

            entry.view.reposition(slot.x, slot.y);
        });
    }

    syncFromSession (session: CardGameSession): void
    {
        for (const entry of this.entries)
        {
            const combatant = session.getCombatant(entry.combatant.instanceId);

            if (!combatant)
            {
                continue;
            }

            entry.combatant = combatant;
            entry.view.setHealth(combatant.state);
            entry.view.setDefeated(!isCombatantAlive(combatant));
        }

        this.setSelected(session.getAttackTargetId());
    }

    setSelected (instanceId: string | null): void
    {
        this.selectedId = instanceId;

        for (const entry of this.entries)
        {
            entry.view.setSelected(entry.combatant.instanceId === instanceId);
        }
    }

    setHealth (instanceId: string, session: CardGameSession): void
    {
        const view = this.getView(instanceId);
        const combatant = session.getCombatant(instanceId);

        if (!view || !combatant)
        {
            return;
        }

        view.setHealth(combatant.state);
        view.setDefeated(!isCombatantAlive(combatant));
    }

    showIntent (instanceId: string, action: EnemyTurnAction, phase: 'upcoming' | 'executing' = 'upcoming'): void
    {
        this.getView(instanceId)?.showIntent(action, phase);
    }

    clearIntent (instanceId?: string): void
    {
        if (instanceId)
        {
            this.getView(instanceId)?.clearIntent();
            return;
        }

        for (const entry of this.entries)
        {
            entry.view.clearIntent();
        }
    }

    showAllIntents (session: CardGameSession, phase: 'upcoming' | 'executing' = 'upcoming'): void
    {
        for (const combatant of session.getCombatants())
        {
            if (!isCombatantAlive(combatant) || !combatant.queuedTurn)
            {
                this.clearIntent(combatant.instanceId);
                continue;
            }

            this.showIntent(combatant.instanceId, combatant.queuedTurn, phase);
        }
    }

    setTargetingMode (active: boolean, allowedIds?: readonly string[]): void
    {
        const allowed = allowedIds ? new Set(allowedIds) : null;

        for (const entry of this.entries)
        {
            const alive = isCombatantAlive(entry.combatant);
            const clickable = active && alive && (!allowed || allowed.has(entry.combatant.instanceId));

            entry.view.setTargetClickHandler(
                clickable
                    ? () => this.onEnemyClicked(entry.combatant.instanceId)
                    : alive
                        ? () => this.onEnemyClicked(entry.combatant.instanceId)
                        : null,
            );
        }
    }

    requestTarget (livingIds: readonly string[], onPick: (instanceId: string) => void): void
    {
        if (livingIds.length === 1)
        {
            onPick(livingIds[0]!);
            return;
        }

        this.targetPickResolver = onPick;
        this.setTargetingMode(true, livingIds);
    }

    cancelTargetPick (): void
    {
        this.targetPickResolver = null;
        this.setTargetingMode(false);
    }

    private onEnemyClicked (instanceId: string): void
    {
        if (this.targetPickResolver)
        {
            const resolver = this.targetPickResolver;

            this.targetPickResolver = null;
            this.setTargetingMode(false);
            resolver(instanceId);
            return;
        }

        this.setSelected(instanceId);
        this.onSelect?.(instanceId);
    }

    getSelectedId (): string | null
    {
        return this.selectedId;
    }

    destroy (): void
    {
        this.cancelTargetPick();

        for (const entry of this.entries)
        {
            entry.view.destroy();
        }

        this.entries.length = 0;
    }
}
