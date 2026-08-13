import { getCardArchetypeBaseId, getCardDefinition } from '../cardGame/config/cardRegistry';

/** Soft specializations the run can weave toward via rewards. */
export type DeckArchetypeId = 'blade' | 'toxin' | 'heat' | 'bulwark';

/** How strongly a card pulls toward each archetype (0 = none). */
const CARD_ARCHETYPE_WEIGHTS: Record<string, Partial<Record<DeckArchetypeId, number>>> = {
    attack: { blade: 0.35 },
    'attack-special': { blade: 0.7 },
    'attack-leap': { blade: 0.55 },
    'corner-strike': { blade: 0.6 },
    rupture: { blade: 1 },
    shiv: { blade: 1 },
    lacerate: { blade: 1 },
    serration: { blade: 1 },
    exsanguinate: { blade: 1 },
    execution: { blade: 0.9 },
    switchback: { blade: 0.85 },
    'phase-relay': { blade: 0.5, bulwark: 0.35 },
    salvage: { blade: 0.5 },
    poison: { toxin: 1 },
    miasma: { toxin: 1 },
    neurotoxin: { toxin: 1 },
    'black-ichor': { toxin: 1 },
    fire: { heat: 1 },
    cinder: { heat: 1 },
    scorch: { heat: 1 },
    kindling: { heat: 1 },
    'white-hot': { heat: 1 },
    defend: { bulwark: 0.35 },
    'defend-special': { bulwark: 0.7 },
    'defend-leap': { bulwark: 0.55 },
    'corner-defense': { bulwark: 0.6 },
    bulwark: { bulwark: 1 },
    bramble: { bulwark: 1 },
    citadel: { bulwark: 1 },
    surge: { blade: 0.45, heat: 0.35 },
    'amp-core': { blade: 0.4, heat: 0.5 },
    overclock: { blade: 0.4 },
    hardwire: { bulwark: 0.4 },
    patch: { bulwark: 0.25 },
    glitch: { toxin: 0.2, heat: 0.2 },
};

export interface DeckArchetypeScores {
    blade: number;
    toxin: number;
    heat: number;
    bulwark: number;
    /** Strongest archetype, if any specialty weight exists. */
    dominant: DeckArchetypeId | null;
    /** 0–1 commitment from how lopsided the deck already is. */
    commitment: number;
}

const EMPTY_SCORES: DeckArchetypeScores = {
    blade: 0,
    toxin: 0,
    heat: 0,
    bulwark: 0,
    dominant: null,
    commitment: 0,
};

/** Scores the run deck so rewards can reinforce an emerging specialty. */
export const scoreDeckArchetypes = (
    deckDefinitionIds: readonly string[],
): DeckArchetypeScores =>
{
    const scores: DeckArchetypeScores = { ...EMPTY_SCORES };
    let counted = 0;

    for (const definitionId of deckDefinitionIds)
    {
        const definition = getCardDefinition(definitionId);

        if (!definition || definition.behaviorId === 'curse')
        {
            continue;
        }

        const weights = CARD_ARCHETYPE_WEIGHTS[getCardArchetypeBaseId(definitionId)];

        if (!weights)
        {
            continue;
        }

        counted += 1;

        for (const [ archetype, weight ] of Object.entries(weights) as [ DeckArchetypeId, number ][])
        {
            scores[archetype] += weight;
        }
    }

    const specialty = [
        { id: 'blade' as const, value: scores.blade },
        { id: 'toxin' as const, value: scores.toxin },
        { id: 'heat' as const, value: scores.heat },
        { id: 'bulwark' as const, value: scores.bulwark },
    ].sort((a, b) => b.value - a.value);

    const lead = specialty[0]!;
    const runnerUp = specialty[1]!;
    const total = specialty.reduce((sum, entry) => sum + entry.value, 0);

    if (total <= 0 || counted === 0)
    {
        return scores;
    }

    scores.dominant = lead.value > 0 ? lead.id : null;
    // Commitment rises as the lead pulls away from a hybrid soup.
    const leadShare = lead.value / total;
    const gap = lead.value - runnerUp.value;
    scores.commitment = Math.max(0, Math.min(1, leadShare * 0.65 + Math.min(1, gap / 3) * 0.35));

    return scores;
};

/** Relative offer weight for a reward card given the current deck. */
export const getCardRewardWeight = (
    definitionId: string,
    scores: DeckArchetypeScores,
): number =>
{
    const tags = CARD_ARCHETYPE_WEIGHTS[getCardArchetypeBaseId(definitionId)];

    if (!tags)
    {
        return 1;
    }

    let affinity = 0;

    for (const [ archetype, cardPull ] of Object.entries(tags) as [ DeckArchetypeId, number ][])
    {
        affinity += scores[archetype] * cardPull;
    }

    // Soft floor so you can still pivot; commitment tightens the weave.
    const bias = 0.55 + scores.commitment * 1.35;
    const weight = 1 + affinity * bias * 0.45;

    if (scores.dominant && tags[scores.dominant])
    {
        return weight * (1.15 + scores.commitment * 0.55);
    }

    // Off-lane specialty cards get squeezed as you lock in.
    const isSpecialty = Object.values(tags).some((value) => value >= 0.7);

    if (isSpecialty && scores.commitment > 0.35)
    {
        return Math.max(0.28, weight * (1 - scores.commitment * 0.55));
    }

    return Math.max(0.4, weight);
};
