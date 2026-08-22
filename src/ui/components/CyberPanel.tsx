import type { MouseEvent, ReactNode, WheelEvent } from 'react';

export type CyberPanelVariant = 'cyan' | 'gold' | 'green' | 'magenta';

interface CyberPanelChromeProps {
    variant?: CyberPanelVariant;
}

/** Corner brackets + scanlines shared by modal panels. */
export const CyberPanelChrome = ({ variant = 'cyan' }: CyberPanelChromeProps) => (
    <>
        <span className={`cp-corner cp-corner--tl cp-corner--${variant}`} aria-hidden="true" />
        <span className={`cp-corner cp-corner--tr cp-corner--${variant}`} aria-hidden="true" />
        <span className={`cp-corner cp-corner--bl cp-corner--${variant}`} aria-hidden="true" />
        <span className={`cp-corner cp-corner--br cp-corner--${variant}`} aria-hidden="true" />
        <div className="cp-scan" aria-hidden="true" />
    </>
);

interface CyberPanelProps {
    variant?: CyberPanelVariant;
    className?: string;
    onClick?: (event: MouseEvent<HTMLDivElement>) => void;
    onWheel?: (event: WheelEvent<HTMLDivElement>) => void;
    children: ReactNode;
}

export const CyberPanel = ({
    variant = 'cyan',
    className = '',
    onClick,
    onWheel,
    children,
}: CyberPanelProps) => (
    <div
        className={`cp-panel cp-panel--${variant} ${className}`.trim()}
        onClick={onClick}
        onWheel={onWheel}
    >
        <CyberPanelChrome variant={variant} />
        {children}
    </div>
);

interface ModalShellProps {
    variant?: CyberPanelVariant;
    rootClassName: string;
    panelClassName: string;
    onBackdropClick?: () => void;
    role?: string;
    ariaModal?: boolean;
    ariaLabel?: string;
    children: ReactNode;
}

/** Shared backdrop + cyber panel wrapper used by modal overlays. */
export const ModalShell = ({
    variant = 'cyan',
    rootClassName,
    panelClassName,
    onBackdropClick,
    role,
    ariaModal,
    ariaLabel,
    children,
}: ModalShellProps) =>
{
    const stopPanelClick = (event: MouseEvent<HTMLDivElement>): void =>
    {
        event.stopPropagation();
    };

    const stopPanelWheel = (event: WheelEvent<HTMLDivElement>): void =>
    {
        event.stopPropagation();
    };

    return (
        <div
            className={rootClassName}
            role={role}
            aria-modal={ariaModal}
            aria-label={ariaLabel}
        >
            <div
                className="cp-overlay__backdrop"
                aria-hidden="true"
                onClick={onBackdropClick}
            />
            <CyberPanel
                variant={variant}
                className={panelClassName}
                onClick={stopPanelClick}
                onWheel={stopPanelWheel}
            >
        {children}
    </CyberPanel>
        </div>
    );
};
