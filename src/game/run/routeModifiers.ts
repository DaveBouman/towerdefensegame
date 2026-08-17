import { RUN_ECONOMY } from './config/runEconomy';
import type { RouteKind } from './runMap';

/** Enemy integrity multiplier for hot/safe route nodes. */
export const getRouteEnemyHealthMultiplier = (routeKind?: RouteKind): number =>
{
    if (routeKind === 'hot')
    {
        return RUN_ECONOMY.routes.hot.enemyHealthMultiplier;
    }

    if (routeKind === 'safe')
    {
        return RUN_ECONOMY.routes.safe.enemyHealthMultiplier;
    }

    return 1;
};

/** Bonus creds granted after winning a hot-route fight. */
export const HOT_ROUTE_VICTORY_GOLD = RUN_ECONOMY.routes.hot.victoryGold;
