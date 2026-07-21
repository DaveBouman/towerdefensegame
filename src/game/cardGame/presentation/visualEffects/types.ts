import type { SlotPosition } from '../../domain/types';

export interface CardVisualTarget {
    slot: SlotPosition;
    wrapper: Phaser.GameObjects.Container;
    width: number;
    height: number;
}

/** Presentation hook for card activation — register new visuals without touching combat logic. */
export interface CardVisualEffect {
    id: string;
    activate (scene: Phaser.Scene, target: CardVisualTarget): Phaser.Tweens.Tween | null;
    deactivate (scene: Phaser.Scene, target: CardVisualTarget): void;
}
