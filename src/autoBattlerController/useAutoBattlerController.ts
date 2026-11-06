import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AutoBattlerSocket,
    DEFAULT_PUBLIC_RULES,
    emptyClientRunView,
    type ClientRunView,
    type ConnectionStatus,
    type PublicRules,
} from '../game/autoBattler';

export const useAutoBattlerController = () =>
{
    const [ state, setState ] = useState<ClientRunView>(() => emptyClientRunView());
    const [ rules, setRules ] = useState<PublicRules>(DEFAULT_PUBLIC_RULES);
    const [ status, setStatus ] = useState<ConnectionStatus>('connecting');
    const [ statusDetail, setStatusDetail ] = useState('');
    const [ queuePosition, setQueuePosition ] = useState<number | null>(null);
    const [ guestId, setGuestId ] = useState<string | null>(null);
    const socketRef = useRef<AutoBattlerSocket | null>(null);

    useEffect(() =>
    {
        const socket = new AutoBattlerSocket({
            onStatus: (next, detail) =>
            {
                setStatus(next);
                setStatusDetail(detail ?? '');
            },
            onWelcome: (id, publicRules) =>
            {
                setGuestId(id);
                setRules(publicRules);
            },
            onState: (run) =>
            {
                setState(run);
                if (run.mode === 'menu' && run.phase === 'menu')
                {
                    // keep queue position until cancel/match
                }
                else
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
        rules,
        status,
        statusDetail,
        queuePosition,
        guestId,
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
