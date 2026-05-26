import { CLOSE_RANGE_TOWER_PROFILE } from '../config/towerProfiles';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
import { TowerState } from './TowerState';

export class CloseRangeTowerState extends TowerState
{
    constructor (grid: Grid, position: GridPosition)
    {
        super(grid, position, CLOSE_RANGE_TOWER_PROFILE, [
            'boots-of-speed',
            'hands-of-fire',
        ]);
    }
}
