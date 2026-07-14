import type { RunMapNodeKind } from '../../game/run/nodeKinds';
import { toCurrentColorIconSvg } from '../icons/toCurrentColorIconSvg';
import hornedSkullSvg from '../icons/000000/transparent/1x1/lorc/horned-skull.svg?raw';
import crossedSwordsSvg from '../icons/000000/transparent/1x1/lorc/crossed-swords.svg?raw';
import crownedSkullSvg from '../icons/000000/transparent/1x1/lorc/crowned-skull.svg?raw';
import shoppingBagSvg from '../icons/000000/transparent/1x1/delapouite/shopping-bag.svg?raw';
import diceRandomSvg from '../icons/000000/transparent/1x1/delapouite/perspective-dice-six-faces-random.svg?raw';

/** Icons from https://game-icons.net (see src/ui/icons/license.txt). */
const NODE_KIND_ICON_SVG: Record<RunMapNodeKind, string> = {
    enemy: toCurrentColorIconSvg(crossedSwordsSvg),
    'semi-boss': toCurrentColorIconSvg(hornedSkullSvg),
    boss: toCurrentColorIconSvg(crownedSkullSvg),
    shop: toCurrentColorIconSvg(shoppingBagSvg),
    event: toCurrentColorIconSvg(diceRandomSvg),
};

interface NodeKindIconProps {
    kind: RunMapNodeKind;
    className?: string;
}

export const NodeKindIcon = ({ kind, className }: NodeKindIconProps) => (
    <span
        className={className}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: NODE_KIND_ICON_SVG[kind] }}
    />
);
