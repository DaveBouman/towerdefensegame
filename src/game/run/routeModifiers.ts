import type { RouteKind } from './runMap';

/** Enemy integrity multiplier for hot/safe route nodes. */
export const getRouteEnemyHealthMultiplier = (routeKind?: RouteKind): number =>
{
    if (routeKind === 'hot')
    {
        return 1.15;
    }

    if (routeKind === 'safe')
    {
        return 0.9;
    }

    return 1;
};

/** Bonus creds granted after winning a hot-route fight. */
export const HOT_ROUTE_VICTORY_GOLD = 12;
