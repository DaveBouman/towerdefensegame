import type { AutoBattlerController } from '../../autoBattlerController/useAutoBattlerController';
import { BattleScreen } from './BattleScreen';
import { MenuScreen } from './MenuScreen';
import { RunEndScreen } from './RunEndScreen';
import { ShopScreen } from './ShopScreen';
import { WaitingScreen } from './WaitingScreen';

interface AutoBattlerScreensProps {
    controller: AutoBattlerController;
}

export const AutoBattlerScreens = ({ controller }: AutoBattlerScreensProps) =>
{
    const phase = controller.state.phase;

    if (phase === 'menu')
    {
        return <MenuScreen controller={controller} />;
    }

    if (phase === 'shop')
    {
        return <ShopScreen controller={controller} />;
    }

    if (phase === 'waiting')
    {
        return <WaitingScreen controller={controller} />;
    }

    if (phase === 'battle' && controller.state.battle)
    {
        return <BattleScreen controller={controller} />;
    }

    if (phase === 'victory' || phase === 'defeat')
    {
        return <RunEndScreen controller={controller} />;
    }

    return <MenuScreen controller={controller} />;
};
