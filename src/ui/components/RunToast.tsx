import { useEffect } from 'react';

interface RunToastProps {
    message: string;
    tone?: 'good' | 'warn' | 'neutral';
    onDone?: () => void;
    durationMs?: number;
}

export const RunToast = ({
    message,
    tone = 'neutral',
    onDone,
    durationMs = 2200,
}: RunToastProps) =>
{
    useEffect(() =>
    {
        const timer = window.setTimeout(() => onDone?.(), durationMs);

        return () => window.clearTimeout(timer);
    }, [ message, durationMs, onDone ]);

    return (
        <div className={`run-toast run-toast--${tone}`} role="status">
            {message}
        </div>
    );
};
