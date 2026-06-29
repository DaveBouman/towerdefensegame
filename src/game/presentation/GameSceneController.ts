import { EventBus } from '../EventBus';
import { GAME_EVENTS } from '../events/gameEvents';
import type { GameSession } from '../domain/GameSession';
import {
    ENEMY_BEAM_COLOR,
    ENEMY_IMPACT_COLOR,
    FRIENDLY_BEAM_COLOR,
    FRIENDLY_IMPACT_COLOR,
} from '../config/attackBeamColors';
import type {
    EnemyAttackPayload,
    EnemyStateSnapshot,
    TowerAttackPayload,
    TowerStateSnapshot,
} from '../domain/types';
import type { Grid } from '../grid/Grid';
import { canAddToScene } from './sceneReady';
import { EnemyPresenter } from './EnemyPresenter';
import { SelectionController } from './SelectionController';
import { AttackBeamEffect } from './AttackBeamEffect';
import { TowerPresenter } from './TowerPresenter';
import { clientPointerToWorld } from './clientPointerToWorld';

export class GameSceneController
{
    private readonly attackBeamEffect = new AttackBeamEffect();
    private readonly enemyPresenter: EnemyPresenter;
    private readonly towerPresenter: TowerPresenter;
    private readonly selection: SelectionController;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly grid: Grid,
        private readonly session: GameSession,
    )
    {
        this.enemyPresenter = new EnemyPresenter(
            (id) => this.session.enemies.getSnapshot(id),
        );
        this.towerPresenter = new TowerPresenter(
            (id) => this.session.towers.getSnapshot(id),
            () => false,
        );
        this.selection = new SelectionController(
            scene,
            grid,
            { hide: () => {}, destroy: () => {} },
            (id) => this.session.enemies.getSnapshot(id),
            (id) => this.session.towers.getSnapshot(id),
            (id) => this.towerPresenter.getDisplayPosition(id),
        );

        scene.input.on('pointerdown', this.onPointerDown, this);
    }

    bind (): void
    {
        EventBus.on(GAME_EVENTS.ENEMY_SPAWNED, this.onEnemySpawned, this);
        EventBus.on(GAME_EVENTS.ENEMY_REMOVED, this.onEnemyRemoved, this);
        EventBus.on(GAME_EVENTS.ENEMY_SELECTED, this.onEnemySelected, this);
        EventBus.on(GAME_EVENTS.ENEMY_DAMAGED, this.onEnemyDamaged, this);
        EventBus.on(GAME_EVENTS.TOWER_PLACED, this.onTowerPlaced, this);
        EventBus.on(GAME_EVENTS.TOWER_REMOVED, this.onTowerRemoved, this);
        EventBus.on(GAME_EVENTS.TOWER_SELECTED, this.onTowerSelected, this);
        EventBus.on(GAME_EVENTS.TOWER_ATTACKED, this.onTowerAttacked, this);
        EventBus.on(GAME_EVENTS.ENEMY_ATTACKED, this.onEnemyAttacked, this);
        EventBus.on(GAME_EVENTS.TOWER_DAMAGED, this.onTowerDamaged, this);
        EventBus.on(GAME_EVENTS.START_WAVE, this.onStartWave, this);
        EventBus.on(GAME_EVENTS.TOGGLE_PAUSE, this.onTogglePause, this);
    }

    unbind (): void
    {
        EventBus.off(GAME_EVENTS.ENEMY_SPAWNED, this.onEnemySpawned, this);
        EventBus.off(GAME_EVENTS.ENEMY_REMOVED, this.onEnemyRemoved, this);
        EventBus.off(GAME_EVENTS.ENEMY_SELECTED, this.onEnemySelected, this);
        EventBus.off(GAME_EVENTS.ENEMY_DAMAGED, this.onEnemyDamaged, this);
        EventBus.off(GAME_EVENTS.TOWER_PLACED, this.onTowerPlaced, this);
        EventBus.off(GAME_EVENTS.TOWER_REMOVED, this.onTowerRemoved, this);
        EventBus.off(GAME_EVENTS.TOWER_SELECTED, this.onTowerSelected, this);
        EventBus.off(GAME_EVENTS.TOWER_ATTACKED, this.onTowerAttacked, this);
        EventBus.off(GAME_EVENTS.ENEMY_ATTACKED, this.onEnemyAttacked, this);
        EventBus.off(GAME_EVENTS.TOWER_DAMAGED, this.onTowerDamaged, this);
        EventBus.off(GAME_EVENTS.START_WAVE, this.onStartWave, this);
        EventBus.off(GAME_EVENTS.TOGGLE_PAUSE, this.onTogglePause, this);
        this.scene.input.off('pointerdown', this.onPointerDown, this);
    }

    startSession (): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.session.prepare();
    }

    syncPresentation (deltaMs: number): void
    {
        for (const enemy of this.session.enemies.all)
        {
            this.enemyPresenter.setTargetPosition(enemy.id, enemy.position);
            this.enemyPresenter.setHealth(enemy.id, enemy.health, enemy.maxHealth);
        }

        for (const tower of this.session.towers.all)
        {
            this.towerPresenter.setTargetPosition(tower.id, tower.position);
            this.towerPresenter.setHealth(tower.id, tower.health, tower.maxHealth);
        }

        this.enemyPresenter.lerpFrame(deltaMs);
        this.towerPresenter.lerpFrame(deltaMs);
        this.selection.syncFrame();
    }

    destroy (): void
    {
        this.unbind();
        this.enemyPresenter.clearAll();
        this.towerPresenter.clearAll();
        this.selection.clear();
        this.attackBeamEffect.destroy();
    }

    private onPointerDown (pointer: Phaser.Input.Pointer): void
    {
        if (!canAddToScene(this.scene) || !this.session.canPlaceTowers())
        {
            return;
        }

        const world = clientPointerToWorld(this.scene, pointer.x, pointer.y);

        if (!world)
        {
            return;
        }

        const tile = this.grid.toGrid(world.x, world.y);

        if (!tile)
        {
            return;
        }

        this.session.tryPlaceTower(tile);
    }

    private onStartWave (): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.session.startWave();
    }

    private onTogglePause (): void
    {
        this.session.togglePause();
    }

    private onEnemySpawned (snapshot: EnemyStateSnapshot): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.enemyPresenter.spawn(this.scene, this.grid, snapshot);
    }

    private onEnemyRemoved ({ id }: { id: string }): void
    {
        this.selection.onEnemyRemoved(id);
        this.session.unitAttacks.clearEnemy(id);
        this.enemyPresenter.remove(id);
        this.session.checkWaveComplete();
    }

    private onEnemySelected (snapshot: EnemyStateSnapshot): void
    {
        this.selection.selectEnemy(snapshot);
    }

    private onEnemyDamaged (snapshot: EnemyStateSnapshot): void
    {
        this.selection.onEnemyDamaged(snapshot);
        this.enemyPresenter.flashHit(snapshot.id);
        this.enemyPresenter.setHealth(snapshot.id, snapshot.health, snapshot.stats.maxHealth);
    }

    private onTowerPlaced (snapshot: TowerStateSnapshot): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.towerPresenter.place(this.scene, this.grid, snapshot);
    }

    private onTowerRemoved ({ id }: { id: string }): void
    {
        this.selection.onTowerRemoved(id);
        this.session.unitAttacks.clearTower(id);
        this.towerPresenter.remove(id);
        this.session.checkWaveComplete();
    }

    private onTowerSelected (snapshot: TowerStateSnapshot): void
    {
        this.selection.selectTower(snapshot);
    }

    private onTowerDamaged (snapshot: TowerStateSnapshot): void
    {
        this.selection.onTowerDamaged(snapshot);
        this.towerPresenter.setHealth(snapshot.id, snapshot.health, snapshot.maxHealth);
    }

    private onTowerAttacked (payload: TowerAttackPayload): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.attackBeamEffect.play(
            this.scene,
            payload.towerPosition,
            payload.enemyPosition,
            { beam: FRIENDLY_BEAM_COLOR, impact: FRIENDLY_IMPACT_COLOR },
        );
        this.towerPresenter.playAttack(payload.towerId);
    }

    private onEnemyAttacked (payload: EnemyAttackPayload): void
    {
        if (!canAddToScene(this.scene))
        {
            return;
        }

        this.attackBeamEffect.play(
            this.scene,
            payload.enemyPosition,
            payload.targetPosition,
            { beam: ENEMY_BEAM_COLOR, impact: ENEMY_IMPACT_COLOR },
        );
    }
}
