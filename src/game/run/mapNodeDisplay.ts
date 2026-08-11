import { getCardGameEnemyDefinition } from '../cardGame/config/enemyCatalog';
import type { RunMapNode } from './runMap';
import { NODE_KIND_INFO } from './nodeKinds';

const ROUTE_LABELS: Record<string, string> = {
    hot: 'Hot route — harder fight, +12 creds on win',
    safe: 'Safe route — lighter opposition',
    standard: 'Standard route',
};

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

    const routeHint = node.routeKind && node.routeKind !== 'standard'
        ? ROUTE_LABELS[node.routeKind]
        : undefined;

    return {
        label: info.label,
        tooltipTitle: info.label,
        tooltipBody: routeHint ? `${info.tooltip} ${routeHint}.` : info.tooltip,
    };
};
