import { resolveCombatTraitTooltip } from '../cardGame/combat/combatTraits/display';
import {
    BODY_MOD_DEFINITIONS,
    getBodyModDefinition,
    getBodyModDefinitionOrThrow,
    LIEUTENANT_RELIC_POOL,
    type BodyModDefinition,
} from './bodyMods';

const STORAGE_KEY = 'signal-chain-body-mod-bestiary';
const LEGACY_STORAGE_KEY = 'signal-chain-relic-bestiary';

export type BodyModTier = 'common' | 'elite' | 'boss';

export interface BestiaryBodyModEntry {
    id: string;
    label: string;
    tier: BodyModTier;
    unlocked: boolean;
    blurb: string;
    effect: string;
    summary: string;
    acquisition: string;
    dossierLines: string[];
    accentCss: string;
    labelColor: string;
    glyph: string;
}

const BODY_MOD_TIER: Record<string, BodyModTier> = {
    'chrome-heart': 'common',
    'overclock-cell': 'common',
    'cred-siphon': 'common',
    'mark-seven': 'elite',
    'reactive-plating': 'elite',
    'venom-latch': 'elite',
    'razor-feed': 'elite',
    'carapace-weave': 'elite',
    'pyre-link': 'elite',
    'hemorrhage-coil': 'elite',
    'latch-array': 'elite',
    'gatekeeper-seal': 'boss',
};

const BODY_MOD_SUMMARY: Record<string, string> = {
    'chrome-heart': 'Flat max integrity — survive longer between fights.',
    'overclock-cell': 'Extra energy each round — more attacks per board wipe.',
    'cred-siphon': 'Passive cred drip after every victory.',
    'mark-seven': 'Burst windows every seventh attack across the whole run.',
    'reactive-plating': 'Opening hits bounce off — great vs multi-hit enemies.',
    'venom-latch': 'Doubles rad stacks — toxin builds hit harder.',
    'razor-feed': 'Flat +2 on all your damage — simple and always on.',
    'carapace-weave': '50% stronger armor — defend chains and fortify scale up.',
    'pyre-link': 'Fire alternation payoff — heat decks spike harder.',
    'hemorrhage-coil': 'Bleed ability multiplier — rupture lanes love this.',
    'gatekeeper-seal': 'Boss trophy — big integrity bump plus extra energy.',
    'latch-array': 'Board persistence — keep your opening attack, defend, and skill through wipes.',
};

const BODY_MOD_ACQUISITION: Record<string, string> = {
    'chrome-heart': 'Ripperdoc shop, Signal events, or Fate wheel.',
    'overclock-cell': 'Ripperdoc, events, wheel, or lieutenant reward.',
    'cred-siphon': 'Ripperdoc shop, Signal events, or Fate wheel.',
    'mark-seven': 'Lieutenant victory body mod reward.',
    'reactive-plating': 'Lieutenant victory body mod reward.',
    'venom-latch': 'Lieutenant victory body mod reward.',
    'razor-feed': 'Lieutenant victory body mod reward.',
    'carapace-weave': 'Lieutenant victory body mod reward.',
    'pyre-link': 'Lieutenant victory body mod reward.',
    'hemorrhage-coil': 'Lieutenant victory body mod reward.',
    'latch-array': 'Lieutenant victory body mod reward.',
    'gatekeeper-seal': 'Warden victory — unique boss body mod.',
};

const BODY_MOD_IDENTITY: Record<string, { accent: number; labelColor: string; glyph: string }> = {
    'chrome-heart': { accent: 0xff2d95, labelColor: '#ff8ec4', glyph: '♥' },
    'overclock-cell': { accent: 0xfcee0a, labelColor: '#fff9b0', glyph: '⚡' },
    'cred-siphon': { accent: 0xffd166, labelColor: '#ffe8a0', glyph: '¢' },
    'mark-seven': { accent: 0xff6b35, labelColor: '#ffb088', glyph: 'VII' },
    'reactive-plating': { accent: 0x5dade2, labelColor: '#8ec8ff', glyph: '▣' },
    'venom-latch': { accent: 0x00ff9d, labelColor: '#b8ffe0', glyph: '☠' },
    'razor-feed': { accent: 0xff7675, labelColor: '#ffb8b8', glyph: '†' },
    'carapace-weave': { accent: 0x00e8ff, labelColor: '#7af0ff', glyph: '⛨' },
    'pyre-link': { accent: 0xff9f43, labelColor: '#ffd4b8', glyph: '🔥' },
    'hemorrhage-coil': { accent: 0xff3b6b, labelColor: '#ffb8c8', glyph: '⦿' },
    'gatekeeper-seal': { accent: 0xa855f7, labelColor: '#d4a8ff', glyph: '⬡' },
    'latch-array': { accent: 0x3dffb0, labelColor: '#b8ffe0', glyph: '⊞' },
};

const TIER_ORDER: Record<BodyModTier, number> = {
    common: 0,
    elite: 1,
    boss: 2,
};

const toCssHex = (value: number): string =>
    `#${value.toString(16).padStart(6, '0')}`;

const lieutenantSet = new Set(LIEUTENANT_RELIC_POOL);

const parseStoredIds = (raw: string | null): Set<string> =>
{
    if (!raw)
    {
        return new Set();
    }

    try
    {
        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed))
        {
            return new Set();
        }

        return new Set(
            parsed.filter((id): id is string =>
                typeof id === 'string' && Boolean(getBodyModDefinition(id))),
        );
    }
    catch
    {
        return new Set();
    }
};

export const getBodyModCatalogIds = (): readonly string[] =>
    [ ...BODY_MOD_DEFINITIONS ]
        .map((mod) => mod.id)
        .sort((a, b) =>
        {
            const leftTier = BODY_MOD_TIER[a] ?? 'common';
            const rightTier = BODY_MOD_TIER[b] ?? 'common';

            if (TIER_ORDER[leftTier] !== TIER_ORDER[rightTier])
            {
                return TIER_ORDER[leftTier] - TIER_ORDER[rightTier];
            }

            return getBodyModDefinitionOrThrow(a).label.localeCompare(getBodyModDefinitionOrThrow(b).label);
        });

export const readUnlockedBodyModIds = (): Set<string> =>
{
    try
    {
        const current = parseStoredIds(localStorage.getItem(STORAGE_KEY));

        if (current.size > 0)
        {
            return current;
        }

        const legacy = parseStoredIds(localStorage.getItem(LEGACY_STORAGE_KEY));

        if (legacy.size > 0)
        {
            writeUnlockedBodyModIds(legacy);
        }

        return legacy;
    }
    catch
    {
        return new Set();
    }
};

const writeUnlockedBodyModIds = (ids: Set<string>): void =>
{
    try
    {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([ ...ids ].sort()));
    }
    catch
    {
        // Ignore private-mode / blocked storage.
    }
};

export const toBodyModBestiaryId = (bodyModId: string): string | null =>
{
    const definition = getBodyModDefinition(bodyModId);

    return definition ? definition.id : null;
};

/** Marks body mods as unlocked (collected). Returns how many were newly added. */
export const unlockBodyMods = (bodyModIds: readonly string[]): number =>
{
    const unlocked = readUnlockedBodyModIds();
    let added = 0;

    for (const bodyModId of bodyModIds)
    {
        const catalogId = toBodyModBestiaryId(bodyModId);

        if (!catalogId || unlocked.has(catalogId))
        {
            continue;
        }

        unlocked.add(catalogId);
        added += 1;
    }

    if (added > 0)
    {
        writeUnlockedBodyModIds(unlocked);
    }

    return added;
};

const buildDossierLines = (definition: BodyModDefinition): string[] =>
{
    const lines: string[] = [
        definition.effect,
        BODY_MOD_ACQUISITION[definition.id] ?? 'Found during runs.',
    ];

    if (lieutenantSet.has(definition.id))
    {
        lines.push('Elite pool — offered after lieutenant victories.');
    }

    for (const trait of definition.combatTraits ?? [])
    {
        const tooltip = resolveCombatTraitTooltip(trait);
        lines.push(`${tooltip.title}: ${tooltip.lines[0] ?? ''}`.trim());
    }

    return lines;
};

export const getBodyModBestiaryEntries = (): BestiaryBodyModEntry[] =>
{
    const unlocked = readUnlockedBodyModIds();

    return getBodyModCatalogIds().map((id) =>
    {
        const definition = getBodyModDefinitionOrThrow(id);
        const identity = BODY_MOD_IDENTITY[id] ?? {
            accent: 0x7af0ff,
            labelColor: '#b8f0ff',
            glyph: '◆',
        };

        return {
            id,
            label: definition.label,
            tier: BODY_MOD_TIER[id] ?? 'common',
            unlocked: unlocked.has(id),
            blurb: definition.blurb,
            effect: definition.effect,
            summary: BODY_MOD_SUMMARY[id] ?? definition.blurb,
            acquisition: BODY_MOD_ACQUISITION[id] ?? 'Found during runs.',
            dossierLines: buildDossierLines(definition),
            accentCss: toCssHex(identity.accent),
            labelColor: identity.labelColor,
            glyph: identity.glyph,
        };
    });
};

export const getBodyModBestiaryProgress = (): { unlocked: number; total: number } =>
{
    const entries = getBodyModBestiaryEntries();

    return {
        unlocked: entries.filter((entry) => entry.unlocked).length,
        total: entries.length,
    };
};

export const bodyModTierLabel = (tier: BodyModTier): string =>
{
    switch (tier)
    {
        case 'common':
            return 'Standard';
        case 'elite':
            return 'Lieutenant';
        case 'boss':
            return 'Warden';
    }
};
