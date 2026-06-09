import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { EventBus } from '../../game/EventBus';
import { GAME_EVENTS } from '../../game/events/gameEvents';
import type { TowerUpgradeDefinition } from '../../game/config/towerUpgradeCatalog';
import type { GameStateSnapshot } from '../../game/domain/types';

type InventoryPanelContextValue = {
    open: boolean;
    items: TowerUpgradeDefinition[];
    toggle: () => void;
    close: () => void;
};

const InventoryPanelContext = createContext<InventoryPanelContextValue | null>(null);

export const InventoryPanelProvider = ({ children }: { children: ReactNode }) =>
{
    const [ open, setOpen ] = useState(false);
    const [ items, setItems ] = useState<TowerUpgradeDefinition[]>([]);
    const awaitingSnapshot = useRef(false);

    const close = useCallback(() =>
    {
        awaitingSnapshot.current = false;
        setOpen(false);
    }, []);

    const toggle = useCallback(() =>
    {
        if (open)
        {
            close();

            return;
        }

        awaitingSnapshot.current = true;
        EventBus.emit(GAME_EVENTS.REQUEST_INVENTORY);
    }, [ close, open ]);

    const onSnapshot = useCallback(({ unused }: { unused: TowerUpgradeDefinition[] }) =>
    {
        setItems(unused);

        if (awaitingSnapshot.current)
        {
            awaitingSnapshot.current = false;
            setOpen(true);
        }
    }, []);

    useEffect(() =>
    {
        EventBus.on(GAME_EVENTS.INVENTORY_SNAPSHOT, onSnapshot);

        return () => EventBus.off(GAME_EVENTS.INVENTORY_SNAPSHOT, onSnapshot);
    }, [ onSnapshot ]);

    useEffect(() =>
    {
        const onStateChanged = (snapshot: GameStateSnapshot): void =>
        {
            if (!snapshot.upgradePick?.choices.length)
            {
                return;
            }

            awaitingSnapshot.current = true;
            EventBus.emit(GAME_EVENTS.REQUEST_INVENTORY);
        };

        EventBus.on(GAME_EVENTS.STATE_CHANGED, onStateChanged);

        return () => EventBus.off(GAME_EVENTS.STATE_CHANGED, onStateChanged);
    }, []);

    useEffect(() =>
    {
        const onKeyDown = (e: KeyboardEvent): void =>
        {
            const target = e.target as HTMLElement | null;

            if (target?.closest('input, textarea, select, [contenteditable="true"]'))
            {
                return;
            }

            if (e.key === 'Escape')
            {
                if (open)
                {
                    e.preventDefault();
                    close();
                }

                return;
            }

            if (e.key !== 'i' && e.key !== 'I')
            {
                return;
            }

            e.preventDefault();
            toggle();
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [ close, open, toggle ]);

    return (
        <InventoryPanelContext.Provider value={{ open, items, toggle, close }}>
            {children}
        </InventoryPanelContext.Provider>
    );
};

export const useInventoryPanel = (): InventoryPanelContextValue =>
{
    const context = useContext(InventoryPanelContext);

    if (!context)
    {
        throw new Error('useInventoryPanel must be used within InventoryPanelProvider');
    }

    return context;
};
