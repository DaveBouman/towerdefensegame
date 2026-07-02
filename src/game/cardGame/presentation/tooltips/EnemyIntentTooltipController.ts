import type { EnemyTurnStep } from '../../domain/types';
import { resolveEnemyIntentTooltip } from './enemyIntentTooltipRegistry';

const TOOLTIP_ID = 'enemy-intent-tooltip';
const OFFSET_X = 14;
const OFFSET_Y = 16;

export class EnemyIntentTooltipController
{
    private readonly element: HTMLDivElement;
    private readonly titleElement: HTMLParagraphElement;
    private readonly bodyElement: HTMLDivElement;
    private visible = false;

    constructor (private readonly boundScene: Phaser.Scene)
    {
        this.element = document.createElement('div');
        this.element.id = TOOLTIP_ID;
        this.element.className = 'card-tooltip';
        this.element.hidden = true;

        this.titleElement = document.createElement('p');
        this.titleElement.className = 'card-tooltip__title';

        this.bodyElement = document.createElement('div');
        this.bodyElement.className = 'card-tooltip__body';

        this.element.append(this.titleElement, this.bodyElement);
        document.body.append(this.element);
    }

    show (
        step: EnemyTurnStep,
        phase: 'upcoming' | 'executing',
        clientX: number,
        clientY: number,
    ): void
    {
        if (!this.boundScene.sys.isActive())
        {
            return;
        }

        const content = resolveEnemyIntentTooltip(step, phase);

        this.titleElement.textContent = content.title;
        this.bodyElement.replaceChildren(
            ...content.lines.map((line) =>
            {
                const paragraph = document.createElement('p');

                paragraph.className = 'card-tooltip__line';
                paragraph.textContent = line;

                return paragraph;
            }),
        );

        this.element.hidden = false;
        this.visible = true;
        this.position(clientX, clientY);
    }

    hide (): void
    {
        if (!this.visible)
        {
            return;
        }

        this.element.hidden = true;
        this.visible = false;
    }

    destroy (): void
    {
        this.hide();
        this.element.remove();
    }

    matchesScene (scene: Phaser.Scene): boolean
    {
        return this.boundScene === scene;
    }

    private position (clientX: number, clientY: number): void
    {
        const margin = 8;
        const rect = this.element.getBoundingClientRect();
        let left = clientX + OFFSET_X;
        let top = clientY + OFFSET_Y;

        if (left + rect.width > window.innerWidth - margin)
        {
            left = clientX - rect.width - OFFSET_X;
        }

        if (top + rect.height > window.innerHeight - margin)
        {
            top = clientY - rect.height - OFFSET_Y;
        }

        left = Math.max(margin, left);
        top = Math.max(margin, top);

        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
    }
}

let activeController: EnemyIntentTooltipController | null = null;

export const getEnemyIntentTooltipController = (scene: Phaser.Scene): EnemyIntentTooltipController =>
{
    if (!activeController || !activeController.matchesScene(scene))
    {
        activeController?.destroy();
        activeController = new EnemyIntentTooltipController(scene);
    }

    return activeController;
};

export const destroyEnemyIntentTooltipController = (): void =>
{
    activeController?.destroy();
    activeController = null;
};

export const attachEnemyIntentTooltip = (
    scene: Phaser.Scene,
    hitArea: Phaser.GameObjects.Rectangle,
    step: EnemyTurnStep,
    phase: 'upcoming' | 'executing',
): void =>
{
    const controller = getEnemyIntentTooltipController(scene);

    hitArea.setInteractive({ useHandCursor: true });

    const showFromPointer = (
        pointer: Phaser.Input.Pointer,
        event?: Phaser.Types.Input.EventData,
    ): void =>
    {
        const domEvent = event?.event as MouseEvent | undefined;

        controller.show(
            step,
            phase,
            domEvent?.clientX ?? pointer.x,
            domEvent?.clientY ?? pointer.y,
        );
    };

    hitArea.on('pointerover', showFromPointer);
    hitArea.on('pointerout', () => controller.hide());
    hitArea.on('pointerdown', () => controller.hide());
};
