/**
 * Tracks an in-flight HTML5 drag that started from the inventory panel so we
 * do not treat stray drops on the canvas (or stale clipboard text) as equip.
 */
let activeInventoryUpgradeId: string | null = null;

export const beginInventoryDrag = (upgradeId: string): void =>
{
    activeInventoryUpgradeId = upgradeId;
};

export const endInventoryDrag = (): void =>
{
    activeInventoryUpgradeId = null;
};

export const getActiveInventoryDragId = (): string | null =>
    activeInventoryUpgradeId;
