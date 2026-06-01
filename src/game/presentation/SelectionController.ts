import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { Grid } from '../grid/Grid';
import type {
    EnemyStateSnapshot,
    TowerStateSnapshot,
    UnitSelection,
} from '../domain/types';
import type { WorldPosition } from '../grid/types';
import { getRangeIndicatorColor } from '../towers/towerVisuals';
import { RangeIndicator } from './RangeIndicator';
import {
    enemyAttackIndicatorRadiusPx,
    towerAttackIndicatorRadiusPx,
} from './rangeIndicatorRadius';

const ENEMY_RANGE_COLOR = 0xe74c3c;

export class SelectionController
{
    private selection: UnitSelection | null = null;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly grid: Grid,
        private readonly rangeIndicator: RangeIndicator,
        private readonly resolveEnemy: (id: string) => EnemyStateSnapshot | undefined,
        private readonly resolveTower: (id: string) => TowerStateSnapshot | undefined,
        private readonly resolveTowerDisplay: (id: string) => WorldPosition | undefined,
    ) {}

    selectEnemy (snapshot: EnemyStateSnapshot): void
    {
        this.selection = { kind: 'enemy', data: snapshot };
        this.publish();
    }

    selectTower (snapshot: TowerStateSnapshot): void
    {
        this.selection = { kind: 'tower', data: snapshot };
        this.publish();
    }

    clear (): void
    {
        if (!this.selection)
        {
            return;
        }

        this.selection = null;
        this.rangeIndicator.hide();
        EventBus.emit(GAME_EVENTS.SELECTION_CHANGED, null);
        EventBus.emit(GAME_EVENTS.SELECTION_CLEARED);
    }

    clearFromUi (): void
    {
        this.selection = null;
        this.rangeIndicator.hide();
        EventBus.emit(GAME_EVENTS.SELECTION_CHANGED, null);
    }

    getSelectedTowerId (): string | undefined
    {
        return this.selection?.kind === 'tower' ? this.selection.data.id : undefined;
    }

    onEnemyRemoved (id: string): void
    {
        if (this.selection?.kind === 'enemy' && this.selection.data.id === id)
        {
            this.clear();
        }
    }

    onTowerRemoved (id: string): void
    {
        if (this.selection?.kind === 'tower' && this.selection.data.id === id)
        {
            this.clear();
        }
    }

    onTowerDamaged (snapshot: TowerStateSnapshot): void
    {
        if (this.selection?.kind === 'tower' && this.selection.data.id === snapshot.id)
        {
            this.selection = { kind: 'tower', data: snapshot };
            EventBus.emit(GAME_EVENTS.SELECTION_CHANGED, this.selection);
            this.syncFrame();
        }
    }

    onEnemyDamaged (snapshot: EnemyStateSnapshot): void
    {
        if (this.selection?.kind === 'enemy' && this.selection.data.id === snapshot.id)
        {
            this.selection = { kind: 'enemy', data: snapshot };
            EventBus.emit(GAME_EVENTS.SELECTION_CHANGED, this.selection);
            this.syncFrame();
        }
    }

    /** Keeps range ring and React selection in sync with live simulation (runs in Phaser). */
    syncFrame (): void
    {
        if (!this.selection)
        {
            return;
        }

        if (this.selection.kind === 'enemy')
        {
            const live = this.resolveEnemy(this.selection.data.id);

            if (!live)
            {
                this.clear();
                return;
            }

            this.selection = { kind: 'enemy', data: live };
            this.rangeIndicator.show(
                this.scene,
                live.position,
                enemyAttackIndicatorRadiusPx(this.grid, live.stats.range),
                ENEMY_RANGE_COLOR,
            );

            return;
        }

        const live = this.resolveTower(this.selection.data.id);

        if (!live)
        {
            this.clear();
            return;
        }

        this.selection = { kind: 'tower', data: live };

        const ringPosition = this.resolveTowerDisplay(live.id) ?? live.position;

        this.rangeIndicator.show(
            this.scene,
            ringPosition,
            towerAttackIndicatorRadiusPx(this.grid, live.range),
            getRangeIndicatorColor(live.definitionId),
        );
    }

    private publish (): void
    {
        if (!this.selection)
        {
            return;
        }

        EventBus.emit(GAME_EVENTS.SELECTION_CHANGED, this.selection);
        this.syncFrame();
    }
}
