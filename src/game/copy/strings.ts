/**
 * Player-facing copy catalog.
 *
 * Internal ids stay stable. Display labels live here so a rename or a future
 * locale swap touches one object instead of scattered literals.
 * When adding i18n, replace `EN` (or wrap `t`) with a locale table.
 *
 * JSON `label` fields are fallbacks for unknown ids. Catalog wins when present.
 */
const EN = {
    // Cards
    'card.attack': 'Attack',
    'card.defend': 'Defend',
    'card.attack-special': 'Strike',
    'card.attack-leap': 'Lunge',
    'card.defend-special': 'Ward',
    'card.defend-leap': 'Bastion',
    'card.joker': 'Reroute',
    'card.loop-reset': 'Loop',
    'card.poison': 'Rad',
    'card.fire': 'Fire',
    'card.hazard': 'Trap',
    'card.siphon': 'Leech Node',
    'card.boost': 'Boost',
    'card.rupture': 'Rupture',
    'card.bulwark': 'Bulwark',
    'card.surge': 'Surge',
    'card.corner-strike': 'Corner Strike',
    'card.corner-defense': 'Corner Defense',
    'card.burden': 'Burden',
    'card.fuse': 'Fuse',
    'card.courier': 'Courier',
    'card.shiv': 'Shiv',
    'card.miasma': 'Miasma',
    'card.cinder': 'Cinder',
    'card.lacerate': 'Lacerate',
    'card.scorch': 'Scorch',
    'card.bramble': 'Bramble',
    'card.glitch': 'Glitch',
    'card.hardwire': 'Hardwire',
    'card.patch': 'Patch',
    'card.overclock': 'Overclock',
    'card.echo': 'Echo',
    'card.salvage': 'Salvage',
    'card.switchback': 'Switchback',
    'card.phase-relay': 'Phase Relay',
    'card.phase-bulwark': 'Phase Bulwark',
    'card.neurotoxin': 'Neurotoxin',
    'card.black-ichor': 'Black Ichor',
    'card.serration': 'Serration',
    'card.exsanguinate': 'Exsanguinate',
    'card.kindling': 'Kindling',
    'card.white-hot': 'White-Hot',
    'card.citadel': 'Citadel',
    'card.execution': 'Execution',
    'card.amp-core': 'Amp Core',

    // Enemies
    'enemy.basic': 'Raider',
    'enemy.thornward': 'Thornward',
    'enemy.saboteur': 'Saboteur',
    'enemy.warden': 'Warden',
    'enemy.smokebinder': 'Smokebinder',
    'enemy.field-medic': 'Field Medic',
    'enemy.gridlock': 'Gridlock',
    'enemy.broodframe': 'Broodframe',
    'enemy.wire-drone': 'Wire Drone',
    'enemy.android': 'Severance',
    'enemy.android-arm': 'Severed Arm',
    'enemy.android-core': 'Severed Core',
    'enemy.android-legs': 'Severed Legs',
    'enemy.cred-vulture': 'Cred Vulture',
    'enemy.toll-bot': 'Toll Bot',
    'enemy.wire-thief': 'Wire Thief',
    'enemy.null-scribe': 'Null Scribe',
    'enemy.stutter-node': 'Stutter Node',
    'enemy.phantom-relay': 'Phantom Relay',
    'enemy.vector-haunt': 'Vector Haunt',
    'enemy.drain-host': 'Drain Host',
    'enemy.twin-clip': 'Twin Clip',
    'enemy.bulwark-runner': 'Bulwark Runner',
    'enemy.glass-striker': 'Glass Striker',
    'enemy.chrome-saint': 'Chrome Saint',
    'enemy.training-dummy': 'Training Dummy',
    'enemy.saboteur.phase': 'Overload',
    'enemy.smokebinder.phase': 'Clearance',

    // Body mods
    'bodyMod.chrome-heart': 'Chrome Heart',
    'bodyMod.overclock-cell': 'Overclock Cell',
    'bodyMod.cred-siphon': 'Cred Siphon',
    'bodyMod.mark-five': 'Mark V',
    'bodyMod.mark-seven': 'Mark VII',
    'bodyMod.portside-gyro': 'Portside Gyro',
    'bodyMod.reactive-plating': 'Reactive Plating',
    'bodyMod.venom-latch': 'Venom Latch',
    'bodyMod.razor-feed': 'Razor Feed',
    'bodyMod.carapace-weave': 'Carapace Weave',
    'bodyMod.pyre-link': 'Pyre Link',
    'bodyMod.hemorrhage-coil': 'Hemorrhage Coil',
    'bodyMod.gatekeeper-seal': 'Gatekeeper Seal',
    'bodyMod.latch-array': 'Latch Array',
    'bodyMod.capacitor-bank': 'Capacitor Bank',

    // Map nodes
    'node.enemy': 'Street Op',
    'node.semi-boss': 'Lieutenant',
    'node.boss': 'Warden',
    'node.shop': 'Ripperdoc',
    'node.event': 'Signal',
    'node.rest': 'Safehouse',
    'node.enemy.tooltip': 'Routine chrome on the grid. Flatline them to jack a card into your deck.',
    'node.semi-boss.tooltip': 'A district lieutenant. Tougher than street ops — flatline them for a card reward.',
    'node.boss.tooltip': 'The run\u2019s final warden. Take them down to clear the district.',
    'node.shop.tooltip': 'Spend creds on cards, body mods, heals, removals, and chrome upgrades.',
    'node.event.tooltip': 'An unknown signal on the grid. Jack in for a random encounter — repeat pings may draw hostiles.',
    'node.rest.tooltip': 'A quiet stasis pod before the Warden. Rest to recover integrity or grind one card upgrade.',

    // Shop services
    'shop.heal': 'Integrity Patch',
    'shop.remove-card': 'Deck Excision',
    'shop.reroute-card': 'Signal Reroute',
    'shop.upgrade-card': 'Chrome Grind',

    // Route labels
    'route.safe': 'Safe route — lighter opposition',
    'route.standard': 'Standard route',

    // Deck archetypes
    'archetype.blade': 'Blade',
    'archetype.toxin': 'Toxin',
    'archetype.heat': 'Heat',
    'archetype.bulwark': 'Bulwark',

    // Enemy passives
    'passive.thorns': 'Thorns',
    'passive.enrage': 'Enrage',
    'passive.lastStand': 'Last Stand',
    'passive.smoke': 'Smoke',
    'passive.wetBlanket': 'Wet Blanket',
    'passive.silenceTile': 'Silence Tile',
    'passive.loopHunter': 'Loop Hunter',
    'passive.jammer': 'Jammer',
    'passive.escalate': 'Escalate',
    'passive.dampenTiles': 'Dead Zone',
    'passive.curseHand': 'Curse Hand',
    'passive.pressureColumn': 'Column Pressure',
    'passive.nullifyLane': 'Null Strip',
    'passive.spawnMinion': 'Spawn',
    'passive.shatterOnDeath': 'Shatter',
    'passive.credLeech': 'Cred Leech',
    'passive.rerollTax': 'Reroll Tax',
    'passive.cardThief': 'Card Thief',
    'passive.skillJam': 'Skill Jam',
    'passive.linkRage': 'Link Rage',
    'passive.bodyguard': 'Bodyguard',
    'passive.stutterClock': 'Stutter Clock',
    'passive.phantomIntent': 'Phantom Intent',
    'passive.handRedirect': 'Signal Twist',
    'passive.siphonNode': 'Leech Nodes',

    // Combat traits
    'trait.damageCap': 'Damage Cap',
    'trait.hitWard': 'Hit Ward',
    'status.overclock': 'Overclock',

    // Enemy intents
    'intent.shield': 'Shield',
    'intent.lock-column': 'Column Lock',
    'intent.battle-mod': 'Battle modifier',
    'intent.ally-heal': 'Ally heal',
    'intent.ally-shield': 'Ally shield',
} as const;

export type CopyKey = keyof typeof EN;

export const t = (key: CopyKey): string => EN[key];

export const hasCopy = (key: string): key is CopyKey =>
    Object.prototype.hasOwnProperty.call(EN, key);

export const copy = (key: string, fallback: string): string =>
    hasCopy(key) ? EN[key] : fallback;

export const cardLabel = (id: string, fallback = id): string =>
{
    const key = `card.${id}`;

    if (hasCopy(key))
    {
        return EN[key];
    }

    if (id.endsWith('-plus'))
    {
        return `${cardLabel(id.slice(0, -5), fallback.replace(/\+$/, ''))}+`;
    }

    return fallback;
};

export const enemyLabel = (id: string, fallback = id): string =>
    copy(`enemy.${id}`, fallback);

export const bodyModLabel = (id: string, fallback = id): string =>
    copy(`bodyMod.${id}`, fallback);

export const nodeKindLabel = (kind: string, fallback = kind): string =>
    copy(`node.${kind}`, fallback);

export const nodeKindTooltip = (kind: string, fallback = ''): string =>
    copy(`node.${kind}.tooltip`, fallback);

export const shopLabel = (id: string, fallback = id): string =>
    copy(`shop.${id}`, fallback);

export const archetypeLabel = (id: string, fallback = id): string =>
    copy(`archetype.${id}`, fallback);

export const passiveLabel = (id: string, fallback = id): string =>
    copy(`passive.${id}`, fallback);

export const traitLabel = (id: string, fallback = id): string =>
    copy(`trait.${id}`, fallback);

export const intentLabel = (id: string, fallback = id): string =>
    copy(`intent.${id}`, fallback);

/** Display name for the poison status and its starter card. */
export const poisonStatusName = (): string => cardLabel('poison');

export const poisonStatusNameLower = (): string => poisonStatusName().toLowerCase();

export const poisonStatusNameUpper = (): string => poisonStatusName().toUpperCase();

export const overclockStatusName = (): string => t('status.overclock');
