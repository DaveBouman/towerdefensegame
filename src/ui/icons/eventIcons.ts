import type { EventIconId } from '../../game/run/runEvents';
import { craftpixIconUrl } from './craftpixIconUrl';

/** Craftpix PNGs for run-event icons. */
export const EVENT_ICON_URL: Record<EventIconId, string> = {
    wheel: craftpixIconUrl('event-wheel.png'),
    matcher: craftpixIconUrl('event-matcher.png'),
    spring: craftpixIconUrl('event-spring.png'),
    idol: craftpixIconUrl('event-idol.png'),
    gambler: craftpixIconUrl('event-gambler.png'),
    gold: craftpixIconUrl('event-gold.png'),
    card: craftpixIconUrl('event-card.png'),
    curse: craftpixIconUrl('event-curse.png'),
    'body-mod': craftpixIconUrl('event-body-mod.png'),
    heal: craftpixIconUrl('event-heal.png'),
    trap: craftpixIconUrl('event-trap.png'),
    sun: craftpixIconUrl('event-sun.png'),
    moon: craftpixIconUrl('event-moon.png'),
    skull: craftpixIconUrl('event-skull.png'),
    sword: craftpixIconUrl('event-sword.png'),
    shield: craftpixIconUrl('event-shield.png'),
    coin: craftpixIconUrl('event-coin.png'),
    puzzle: craftpixIconUrl('event-puzzle.png'),
};
