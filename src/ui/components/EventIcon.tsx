import type { EventIconId } from '../../game/run/runEvents';
import { toCurrentColorIconSvg } from '../icons/toCurrentColorIconSvg';
import wheelSvg from '../icons/000000/transparent/1x1/caro-asercion/spinning-wheel.svg?raw';
import matcherSvg from '../icons/000000/transparent/1x1/delapouite/eye-target.svg?raw';
import springSvg from '../icons/000000/transparent/1x1/sbed/water-drop.svg?raw';
import idolSvg from '../icons/000000/transparent/1x1/lorc/gem-pendant.svg?raw';
import gamblerSvg from '../icons/000000/transparent/1x1/lorc/hood.svg?raw';
import goldSvg from '../icons/000000/transparent/1x1/delapouite/coins.svg?raw';
import cardSvg from '../icons/000000/transparent/1x1/quoting/card-play.svg?raw';
import curseSvg from '../icons/000000/transparent/1x1/sbed/death-skull.svg?raw';
import trinketSvg from '../icons/000000/transparent/1x1/lorc/gem-chain.svg?raw';
import healSvg from '../icons/000000/transparent/1x1/zeromancer/heart-plus.svg?raw';
import trapSvg from '../icons/000000/transparent/1x1/lorc/land-mine.svg?raw';
import sunSvg from '../icons/000000/transparent/1x1/lorc/sundial.svg?raw';
import moonSvg from '../icons/000000/transparent/1x1/lorc/moon.svg?raw';
import skullSvg from '../icons/000000/transparent/1x1/lorc/skull-crossed-bones.svg?raw';
import swordSvg from '../icons/000000/transparent/1x1/lorc/crossed-swords.svg?raw';
import shieldSvg from '../icons/000000/transparent/1x1/willdabeast/round-shield.svg?raw';
import coinSvg from '../icons/000000/transparent/1x1/delapouite/two-coins.svg?raw';

const EVENT_ICON_SVG: Record<EventIconId, string> = {
    wheel: toCurrentColorIconSvg(wheelSvg),
    matcher: toCurrentColorIconSvg(matcherSvg),
    spring: toCurrentColorIconSvg(springSvg),
    idol: toCurrentColorIconSvg(idolSvg),
    gambler: toCurrentColorIconSvg(gamblerSvg),
    gold: toCurrentColorIconSvg(goldSvg),
    card: toCurrentColorIconSvg(cardSvg),
    curse: toCurrentColorIconSvg(curseSvg),
    trinket: toCurrentColorIconSvg(trinketSvg),
    heal: toCurrentColorIconSvg(healSvg),
    trap: toCurrentColorIconSvg(trapSvg),
    sun: toCurrentColorIconSvg(sunSvg),
    moon: toCurrentColorIconSvg(moonSvg),
    skull: toCurrentColorIconSvg(skullSvg),
    sword: toCurrentColorIconSvg(swordSvg),
    shield: toCurrentColorIconSvg(shieldSvg),
    coin: toCurrentColorIconSvg(coinSvg),
};

interface EventIconProps {
    icon: EventIconId;
    className?: string;
}

export const EventIcon = ({ icon, className }: EventIconProps) => (
    <span
        className={className}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: EVENT_ICON_SVG[icon] }}
    />
);
