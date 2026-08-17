import { getCardGameEnemyDefinition } from '../cardGame/config/enemyCatalog';
import { copy } from '../copy/strings';
import type { RunMapNode } from './runMap';
import { NODE_KIND_INFO } from './nodeKinds';
import { HOT_ROUTE_VICTORY_GOLD } from './routeModifiers';

const routeLabel = (routeKind: string): string =>
{
    if (routeKind === 'hot')
    {
        return `Hot route — harder fight, +${HOT_ROUTE_VICTORY_GOLD} creds on win`;
    }

    return copy(`route.${routeKind}`, 'Standard route');
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
        ? routeLabel(node.routeKind)
        : undefined;

    return {
        label: info.label,
        tooltipTitle: info.label,
        tooltipBody: routeHint ? `${info.tooltip} ${routeHint}.` : info.tooltip,
    };
};
