import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AutoBattlerSocket,
    type ConnectionStatus,
} from '../game/autoBattler/net/AutoBattlerSocket';
import { emptyClientRunView } from '../game/autoBattler/net/clientView';
import type { ClientRunView } from '../game/autoBattler/net/protocol';

export const useAutoBattlerController = () =>
{
    const [ state, setState ] = useState<ClientRunView>(() => emptyClientRunView());
    const [ status, setStatus ] = useState<ConnectionStatus>('connecting');
    const [ statusDetail, setStatusDetail ] = useState('');
    const [ queuePosition, setQueuePosition ] = useState<number | null>(null);
    const socketRef = useRef<AutoBattlerSocket | null>(null);

    useEffect(() =>
    {
        const socket = new AutoBattlerSocket({
            onStatus: (next, detail) =>
            {
                setStatus(next);
                setStatusDetail(detail ?? '');
            },
            onState: (run) =>
            {
                setState(run);
                if (run.mode !== 'menu' || run.phase !== 'menu')
                {
                    setQueuePosition(null);
                }
            },
            onQueued: (position) => setQueuePosition(position),
            onMatchFound: () => setQueuePosition(null),
            onError: (message) => setStatusDetail(message),
        });

        socketRef.current = socket;
        socket.connect();

        return () =>
        {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const send = useCallback((fn: (socket: AutoBattlerSocket) => void) =>
    {
        const socket = socketRef.current;

        if (!socket)
        {
            setStatusDetail('Not connected to server.');

            return;
        }

        fn(socket);
    }, []);

    const onStartRun = useCallback(() =>
    {
        send((socket) => socket.send({ type: 'start_vs_ai' }));
    }, [ send ]);

    const onQueuePvp = useCallback(() =>
    {
        send((socket) => socket.send({ type: 'queue_pvp' }));
    }, [ send ]);

    const onCancelQueue = useCallback(() =>
    {
        send((socket) => socket.send({ type: 'cancel_queue' }));
        setQueuePosition(null);
    }, [ send ]);

    const onBuy = useCallback((offerUid: string) =>
    {
        send((socket) => socket.send({ type: 'shop_buy', offerUid }));
    }, [ send ]);

    const onSell = useCallback((unitUid: string) =>
    {
        send((socket) => socket.send({ type: 'shop_sell', unitUid }));
    }, [ send ]);

    const onReroll = useCallback(() =>
    {
        send((socket) => socket.send({ type: 'shop_reroll' }));
    }, [ send ]);

    const onFreeze = useCallback((offerUid: string) =>
    {
        send((socket) => socket.send({ type: 'shop_freeze', offerUid }));
    }, [ send ]);

    const onMove = useCallback((fromIndex: number, toIndex: number) =>
    {
        send((socket) => socket.send({ type: 'shop_move', from: fromIndex, to: toIndex }));
    }, [ send ]);

    const onEndTurn = useCallback(() =>
    {
        send((socket) => socket.send({ type: 'end_turn' }));
    }, [ send ]);

    const onBattleContinue = useCallback(() =>
    {
        send((socket) => socket.send({ type: 'battle_continue' }));
    }, [ send ]);

    const onBackToMenu = useCallback(() =>
    {
        send((socket) => socket.send({ type: 'leave_run' }));
    }, [ send ]);

    const onReconnect = useCallback(() =>
    {
        socketRef.current?.disconnect();
        socketRef.current?.connect();
    }, []);

    return {
        state,
        status,
        statusDetail,
        queuePosition,
        guestId: socketRef.current?.getGuestId() ?? null,
        onStartRun,
        onQueuePvp,
        onCancelQueue,
        onBuy,
        onSell,
        onReroll,
        onFreeze,
        onMove,
        onEndTurn,
        onBattleContinue,
        onBackToMenu,
        onReconnect,
    };
};

export type AutoBattlerController = ReturnType<typeof useAutoBattlerController>;
