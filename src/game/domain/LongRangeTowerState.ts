import { LONG_RANGE_TOWER_PROFILE } from '../config/towerProfiles';
import type { Grid } from '../grid/Grid';
import type { GridPosition } from '../grid/types';
import { TowerState } from './TowerState';

export class LongRangeTowerState extends TowerState
{
    constructor (grid: Grid, position: GridPosition)
    {
        super(grid, position, LONG_RANGE_TOWER_PROFILE, [
            'spyglass',
            'bracers-of-haste',
        ]);
    }
}
