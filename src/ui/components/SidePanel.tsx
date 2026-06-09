import type { HTMLAttributes, LiHTMLAttributes, ReactNode } from 'react';

export type SidePanelSide = 'left' | 'right';
export type SidePanelAccent = 'default' | 'enemy' | 'tower';

/** Shared BEM class names — import where JSX helpers are not used. */
export const SP = {
    panel: 'side-panel',
    body: 'side-panel__body',
    header: 'side-panel__header',
    kind: 'side-panel__kind',
    title: 'side-panel__title',
    subtitle: 'side-panel__subtitle',
    content: 'side-panel__content',
    scrollable: 'side-panel__scrollable',
    footer: 'side-panel__footer',
    section: 'side-panel__section',
    sectionTitle: 'side-panel__section-title',
    hint: 'side-panel__hint',
    empty: 'side-panel__empty',
    list: 'side-panel__list',
    listItem: 'side-panel__list-item',
    listItemQueued: 'side-panel__list-item side-panel__list-item--queued',
    itemName: 'side-panel__item-name',
    itemMeta: 'side-panel__item-meta',
    unitIcon: 'side-panel__unit-icon',
    actionBtn: 'side-panel__action-btn',
    actionBtnDanger: 'side-panel__action-btn side-panel__action-btn--danger',
    closeBtn: 'side-panel__close-btn',
    toolBtn: 'side-panel__tool-btn',
    toolBtnActive: 'side-panel__tool-btn side-panel__tool-btn--active',
    toolIcon: 'side-panel__tool-icon',
    toolLabel: 'side-panel__tool-label',
    statGrid: 'side-panel__stat-grid',
    stat: 'side-panel__stat',
    statLabel: 'side-panel__stat-label',
    statValue: 'side-panel__stat-value',
    tags: 'side-panel__tags',
    tag: 'side-panel__tag',
    healthRow: 'side-panel__health-row',
    healthLabel: 'side-panel__health-label',
    healthBar: 'side-panel__health-bar',
    healthBarFill: 'side-panel__health-bar-fill',
    healthBarFillPlayer: 'side-panel__health-bar-fill side-panel__health-bar-fill--player',
    healthBarFillEnemy: 'side-panel__health-bar-fill side-panel__health-bar-fill--enemy',
    healthBarText: 'side-panel__health-bar-text',
    healthValue: 'side-panel__health-value',
    targetingGrid: 'side-panel__targeting-grid',
    targetingBtn: 'side-panel__targeting-btn',
    targetingBtnActive: 'side-panel__targeting-btn side-panel__targeting-btn--active',
} as const;

const panelClass = (side: SidePanelSide, accent: SidePanelAccent): string =>
{
    const classes = [ SP.panel, `${SP.panel}--${side}` ];

    if (accent !== 'default')
    {
        classes.push(`${SP.panel}--accent-${accent}`);
    }

    return classes.join(' ');
};

interface SidePanelProps {
    side: SidePanelSide;
    accent?: SidePanelAccent;
    ariaLabel: string;
    children: ReactNode;
    className?: string;
}

const SidePanelRoot = ({
    side,
    accent = 'default',
    ariaLabel,
    children,
    className,
}: SidePanelProps) => (
    <aside
        className={[ panelClass(side, accent), className ].filter(Boolean).join(' ')}
        role="region"
        aria-label={ariaLabel}
    >
        {children}
    </aside>
);

const Body = ({
    children,
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) => (
    <div className={[ SP.body, className ].filter(Boolean).join(' ')} {...props}>
        {children}
    </div>
);

const Header = ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={[ SP.header, className ].filter(Boolean).join(' ')} {...props}>
        {children}
    </div>
);

const Content = ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={[ SP.content, className ].filter(Boolean).join(' ')} {...props}>
        {children}
    </div>
);

const Scrollable = ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={[ SP.scrollable, className ].filter(Boolean).join(' ')} {...props}>
        {children}
    </div>
);

const Footer = ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={[ SP.footer, className ].filter(Boolean).join(' ')} {...props}>
        {children}
    </div>
);

const Section = ({ children, className, ...props }: HTMLAttributes<HTMLElement>) => (
    <section className={[ SP.section, className ].filter(Boolean).join(' ')} {...props}>
        {children}
    </section>
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
    <h3 className={SP.sectionTitle}>{children}</h3>
);

const Hint = ({ children }: { children: ReactNode }) => (
    <p className={SP.hint}>{children}</p>
);

const Empty = ({ children }: { children: ReactNode }) => (
    <p className={SP.empty}>{children}</p>
);

const List = ({
    children,
    className,
    ...props
}: HTMLAttributes<HTMLUListElement>) => (
    <ul className={[ SP.list, className ].filter(Boolean).join(' ')} {...props}>
        {children}
    </ul>
);

const ListItem = ({
    children,
    className,
    queued = false,
    ...props
}: LiHTMLAttributes<HTMLLIElement> & { queued?: boolean }) => (
    <li
        className={[ queued ? SP.listItemQueued : SP.listItem, className ].filter(Boolean).join(' ')}
        {...props}
    >
        {children}
    </li>
);

const ItemName = ({ children }: { children: ReactNode }) => (
    <span className={SP.itemName}>{children}</span>
);

const ItemMeta = ({ children }: { children: ReactNode }) => (
    <span className={SP.itemMeta}>{children}</span>
);

const UnitIcon = ({ color }: { color: string }) => (
    <span
        className={SP.unitIcon}
        style={{ backgroundColor: color, borderColor: color }}
        aria-hidden="true"
    />
);

const ActionButton = ({
    children,
    danger = false,
    ...props
}: HTMLAttributes<HTMLButtonElement> & { danger?: boolean }) => (
    <button
        type="button"
        className={danger ? SP.actionBtnDanger : SP.actionBtn}
        {...props}
    >
        {children}
    </button>
);

const CloseButton = (props: HTMLAttributes<HTMLButtonElement>) => (
    <button type="button" className={SP.closeBtn} aria-label="Close" {...props}>
        ×
    </button>
);

const ToolButton = ({
    children,
    active = false,
    ...props
}: HTMLAttributes<HTMLButtonElement> & { active?: boolean }) => (
    <button
        type="button"
        className={active ? SP.toolBtnActive : SP.toolBtn}
        {...props}
    >
        {children}
    </button>
);

export const SidePanel = Object.assign(SidePanelRoot, {
    Body,
    Header,
    Content,
    Scrollable,
    Footer,
    Section,
    SectionTitle,
    Hint,
    Empty,
    List,
    ListItem,
    ItemName,
    ItemMeta,
    UnitIcon,
    ActionButton,
    CloseButton,
    ToolButton,
});
