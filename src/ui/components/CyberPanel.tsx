import type { MouseEvent, ReactNode } from 'react';

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
    children: ReactNode;
}

export const CyberPanel = ({
    variant = 'cyan',
    className = '',
    onClick,
    children,
}: CyberPanelProps) => (
    <div className={`cp-panel cp-panel--${variant} ${className}`.trim()} onClick={onClick}>
        <CyberPanelChrome variant={variant} />
        {children}
    </div>
);

interface CyberOverlayProps {
    variant?: CyberPanelVariant;
    overlayClassName?: string;
    panelClassName?: string;
    onBackdropClick?: () => void;
    children: ReactNode;
}

export const CyberOverlay = ({
    variant = 'cyan',
    overlayClassName = '',
    panelClassName = '',
    onBackdropClick,
    children,
}: CyberOverlayProps) =>
{
    const stopPanelClick = (event: MouseEvent<HTMLDivElement>): void =>
    {
        event.stopPropagation();
    };

    return (
        <div
            className={`cp-overlay cp-overlay--${variant} ${overlayClassName}`.trim()}
            onClick={onBackdropClick}
        >
            <div className="cp-overlay__backdrop" aria-hidden="true" />
            <CyberPanel variant={variant} className={panelClassName} onClick={stopPanelClick}>
                {children}
            </CyberPanel>
        </div>
    );
};
