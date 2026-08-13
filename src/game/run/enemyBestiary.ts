import { poisonStatusNameLower } from '../copy/strings';
import { getEnemyHealthRange } from '../cardGame/domain/enemyCombatants';
import {
    CARD_GAME_ENEMY_DEFINITIONS,
    getCardGameEnemyDefinition,
    getCardGameEnemyDefinitionOrThrow,
    type LoadedCardGameEnemyDefinition,
} from '../cardGame/config/enemyCatalog';
import { resolveCombatTraitTooltip } from '../cardGame/combat/combatTraits/display';
import { resolveEnemyPassiveTooltip } from '../cardGame/presentation/tooltips/enemyPassiveTooltipRegistry';
import {
    getEnemyIdentity,
    getEnemyPortraitUrl,
} from '../cardGame/presentation/enemyIdentity';

const STORAGE_KEY = 'signal-chain-enemy-bestiary';

/** Puzzle-only / non-roster entries excluded from the collectible bestiary. */
const EXCLUDED_BESTIARY_IDS = new Set([
    'training-dummy',
]);

export type BestiaryRole = 'street' | 'lieutenant' | 'boss' | 'support';

export interface BestiaryEnemyEntry {
    id: string;
    label: string;
    role: BestiaryRole;
    unlocked: boolean;
    maxHealth: number;
    attackDamage: number;
    shieldGain: number;
    attackChance: number;
    hazardsPerTurn: number;
    summary: string;
    dossierLines: string[];
    portraitUrl: string | null;
    accentCss: string;
    labelColor: string;
}

const ENEMY_ROLE: Record<string, BestiaryRole> = {
    basic: 'street',
    thornward: 'street',
    gridlock: 'street',
    broodframe: 'street',
    'wire-drone': 'support',
    android: 'street',
    'android-arm': 'support',
    'android-core': 'support',
    'android-legs': 'support',
    saboteur: 'lieutenant',
    smokebinder: 'lieutenant',
    'field-medic': 'support',
    'cred-vulture': 'street',
    'toll-bot': 'street',
    'wire-thief': 'street',
    'null-scribe': 'street',
    'stutter-node': 'street',
    'phantom-relay': 'street',
    'vector-haunt': 'street',
    'drain-host': 'street',
    'twin-clip': 'street',
    'bulwark-runner': 'street',
    'glass-striker': 'support',
    'chrome-saint': 'support',
    warden: 'boss',
};

const ENEMY_SUMMARY: Record<string, string> = {
    basic: 'Baseline street fighter. Learn chain routing before the counters arrive.',
    thornward: `Punishes Attack-heavy chains. Cap per hit — favor armor, ${poisonStatusNameLower()}, and fewer swings.`,
    saboteur: 'Trap snowball + Burden curses. Disarm traps and clear hand clog fast.',
    smokebinder: `Smothers ${poisonStatusNameLower()} openers and casts Dead Zone on a checkerboard. Route around weak tiles.`,
    warden: 'Final gate. Hit Ward, long-chain Jammer, and Wet Blanket while shielded.',
    'field-medic': 'Low threat alone — keeps allies alive. Focus the Medic or burst through heals.',
    gridlock: 'Locks a telegraphed column each turn. Never the start column — plan around the squeeze.',
    broodframe: '80 HP nest. Starts with a Wire Drone; respawns one every 2 turns or under 50% HP. Focus fire the drone or burn the frame.',
    'wire-drone': '20 HP minion. High attack chance — kill it or eat chip damage while the Broodframe tanks.',
    android: 'Severance chassis. On death it shatters into Arm, Core, and Legs — the fight continues.',
    'android-arm': 'Shatter fragment with light Thorns. Prefer non-Attack finishers or soak the reflect.',
    'android-core': 'Shatter fragment that favors shield. Slow burn or break armor first.',
    'android-legs': 'Shatter fragment that carpets traps. Disarm or pay the board tax.',
    'cred-vulture': 'Steals 3 creds after each turn. Kill fast or shop visits hurt.',
    'toll-bot': 'Punishes hand rerolls with +attack and extra traps next turn.',
    'wire-thief': 'Steals a deck card on turn 1 and flees after 5 turns. Kill it to recover the card.',
    'null-scribe': 'Negates the first 3 skill abilities in each chain.',
    'stutter-node': 'Every other enemy phase, its attack/shield step fires twice.',
    'phantom-relay': 'Shows attack and shield in intent — only one is real.',
    'vector-haunt': 'Signal Twist scrambles hand-card arrows for the rest of the energy round. Rebuild routes or eat a broken chain.',
    'drain-host': 'Drops a Leech Node each turn. Route through it or the Host drinks 8 integrity.',
    'twin-clip': 'Link Twins duo. Killing one enrages the survivor (+6 atk, +1 trap).',
    'bulwark-runner': 'Buffer pair with Glass Striker — redirects the first hit each chain.',
    'glass-striker': '16 HP glass cannon. Often paired with Bulwark or Chrome Saint.',
    'chrome-saint': '72 HP healer tank. Keeps Glass Striker alive — focus order matters.',
};

const ROLE_ORDER: Record<BestiaryRole, number> = {
    street: 0,
    support: 1,
    lieutenant: 2,
    boss: 3,
};

const toCssHex = (value: number): string =>
    `#${value.toString(16).padStart(6, '0')}`;

const isBestiaryEnemy = (definition: LoadedCardGameEnemyDefinition): boolean =>
    !EXCLUDED_BESTIARY_IDS.has(definition.id);

/** Stable roster catalog — combat enemies only. */
export const getBestiaryCatalogIds = (): readonly string[] =>
{
    const ids = CARD_GAME_ENEMY_DEFINITIONS
        .filter(isBestiaryEnemy)
        .map((definition) => definition.id);

    return [ ...new Set(ids) ].sort((a, b) =>
    {
        const left = getCardGameEnemyDefinitionOrThrow(a);
        const right = getCardGameEnemyDefinitionOrThrow(b);
        const leftRole = ENEMY_ROLE[a] ?? 'street';
        const rightRole = ENEMY_ROLE[b] ?? 'street';

        if (ROLE_ORDER[leftRole] !== ROLE_ORDER[rightRole])
        {
            return ROLE_ORDER[leftRole] - ROLE_ORDER[rightRole];
        }

        return left.label.localeCompare(right.label);
    });
};

export const readUnlockedEnemyIds = (): Set<string> =>
{
    try
    {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw)
        {
            return new Set();
        }

        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed))
        {
            return new Set();
        }

        return new Set(
            parsed.filter((id): id is string =>
                typeof id === 'string' && Boolean(getCardGameEnemyDefinition(id)) && isBestiaryEnemy(
                    getCardGameEnemyDefinitionOrThrow(id),
                )),
        );
    }
    catch
    {
        return new Set();
    }
};

const writeUnlockedEnemyIds = (ids: Set<string>): void =>
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

export const toBestiaryEnemyId = (definitionId: string): string | null =>
{
    const definition = getCardGameEnemyDefinition(definitionId);

    if (!definition || !isBestiaryEnemy(definition))
    {
        return null;
    }

    return definition.id;
};

/** Marks enemies as unlocked (encountered). Returns how many were newly added. */
export const unlockEnemies = (definitionIds: readonly string[]): number =>
{
    const unlocked = readUnlockedEnemyIds();
    let added = 0;

    for (const definitionId of definitionIds)
    {
        const bestiaryId = toBestiaryEnemyId(definitionId);

        if (!bestiaryId || unlocked.has(bestiaryId))
        {
            continue;
        }

        unlocked.add(bestiaryId);
        added += 1;
    }

    if (added > 0)
    {
        writeUnlockedEnemyIds(unlocked);
    }

    return added;
};

const formatEnemyIntegrity = (median: number): string =>
{
    const { min, max } = getEnemyHealthRange(median);

    return min === max ? String(median) : `${min}–${max}`;
};

const buildDossierLines = (definition: LoadedCardGameEnemyDefinition): string[] =>
{
    const lines: string[] = [
        `Integrity ${formatEnemyIntegrity(definition.maxHealth)} · Atk ${definition.attackDamage} · Shield ${definition.shieldGain}`,
        `Attack bias ${Math.round(definition.attackChance * 100)}% · Traps/turn ${definition.hazardsPerTurn}`,
    ];

    for (const passive of definition.passives)
    {
        const tooltip = resolveEnemyPassiveTooltip(passive);
        lines.push(`${tooltip.title}: ${tooltip.lines[0] ?? ''}`.trim());
    }

    for (const trait of definition.combatTraits)
    {
        const tooltip = resolveCombatTraitTooltip(trait);
        lines.push(`${tooltip.title}: ${tooltip.lines[0] ?? ''}`.trim());
    }

    if (definition.allyActions && definition.allyActions.length > 0)
    {
        lines.push('Supports allies in multi-enemy fights (heal / shield).');
    }

    return lines;
};

export const getBestiaryEntries = (): BestiaryEnemyEntry[] =>
{
    const unlocked = readUnlockedEnemyIds();

    return getBestiaryCatalogIds().map((id) =>
    {
        const definition = getCardGameEnemyDefinitionOrThrow(id);
        const identity = getEnemyIdentity(id);
        const portraitFile = identity.portraitFile;

        return {
            id,
            label: definition.label,
            role: ENEMY_ROLE[id] ?? 'street',
            unlocked: unlocked.has(id),
            maxHealth: definition.maxHealth,
            attackDamage: definition.attackDamage,
            shieldGain: definition.shieldGain,
            attackChance: definition.attackChance,
            hazardsPerTurn: definition.hazardsPerTurn,
            summary: ENEMY_SUMMARY[id] ?? 'Hostile signal on the street.',
            dossierLines: buildDossierLines(definition),
            portraitUrl: portraitFile ? getEnemyPortraitUrl(portraitFile) : null,
            accentCss: toCssHex(identity.accent),
            labelColor: identity.labelColor,
        };
    });
};

export const getBestiaryProgress = (): { unlocked: number; total: number } =>
{
    const entries = getBestiaryEntries();

    return {
        unlocked: entries.filter((entry) => entry.unlocked).length,
        total: entries.length,
    };
};

export const bestiaryRoleLabel = (role: BestiaryRole): string =>
{
    switch (role)
    {
        case 'street':
            return 'Street Op';
        case 'lieutenant':
            return 'Lieutenant';
        case 'boss':
            return 'Warden';
        case 'support':
            return 'Support';
    }
};
