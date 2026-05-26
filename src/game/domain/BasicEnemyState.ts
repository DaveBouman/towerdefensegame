import {
    BASIC_ENEMY_BASE_STATS,
    BASIC_ENEMY_PERKS,
    BASIC_ENEMY_UNIT_TYPE,
} from '../config/basicEnemyStats';
import { BASIC_ENEMY_CONFIG } from '../config/enemyConfig';
import { bodyHalfExtent } from '../config/entityBodies';
import { GRID_CONFIG } from '../config/gridConfig';
import { BASIC_ENEMY_SPAWN } from '../config/spawnConfig';
import { tileCenterWorld } from '../grid/worldPosition';
import { EnemyState } from './EnemyState';

export class BasicEnemyState extends EnemyState
{
    constructor ()
    {
        const half = bodyHalfExtent(GRID_CONFIG, BASIC_ENEMY_CONFIG.sizeScale);

        super(
            tileCenterWorld(GRID_CONFIG, BASIC_ENEMY_SPAWN),
            BASIC_ENEMY_UNIT_TYPE,
            BASIC_ENEMY_BASE_STATS,
            half,
            half,
            BASIC_ENEMY_PERKS,
        );
    }

    tick (_gameTick: number): void
    {
        // Stationary — continuous movement will be added with pathing later.
    }
}
