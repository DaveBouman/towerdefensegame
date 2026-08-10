import type { RunMapNodeKind } from '../../game/run/nodeKinds';
import { craftpixIconUrl } from './craftpixIconUrl';

/** Craftpix PNGs for run-map node kinds. */
export const NODE_KIND_ICON_URL: Record<RunMapNodeKind, string> = {
    enemy: craftpixIconUrl('node-enemy.png'),
    'semi-boss': craftpixIconUrl('node-semi-boss.png'),
    boss: craftpixIconUrl('node-boss.png'),
    shop: craftpixIconUrl('node-shop.png'),
    event: craftpixIconUrl('node-event.png'),
};
