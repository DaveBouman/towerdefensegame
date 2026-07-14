import { getCardGameEnemyDefinition } from '../cardGame/config/enemyCatalog';
import type { RunMapNode } from './runMap';
import { NODE_KIND_INFO } from './nodeKinds';

/** Enemy ids whose names are shown on the map instead of the generic node-kind label. */
const MAP_VISIBLE_ENEMY_IDS = new Set([ 'saboteur', 'warden' ]);

export interface MapNodeDisplay {
    label: string;
    tooltipTitle: string;
    tooltipBody: string;
}

export const getMapNodeDisplay = (node: RunMapNode): MapNodeDisplay =>
{
    const info = NODE_KIND_INFO[node.kind];
    const enemy = node.enemyId ? getCardGameEnemyDefinition(node.enemyId) : undefined;
    const showEnemyName = enemy !== undefined
        && MAP_VISIBLE_ENEMY_IDS.has(enemy.id)
        && node.kind !== 'semi-boss';

    if (showEnemyName)
    {
        return {
            label: enemy.label,
            tooltipTitle: enemy.label,
            tooltipBody: `${enemy.label}. ${info.tooltip}`,
        };
    }

    return {
        label: info.label,
        tooltipTitle: info.label,
        tooltipBody: info.tooltip,
    };
};
