export interface FloorBriefing {
    title: string;
    body: string;
    tip: string;
}

export const FLOOR_BRIEFINGS: Record<number, FloorBriefing> = {
    1: {
        title: 'Outer Grid',
        body: 'Street ops probe your routing. Lieutenants wait in column 4 — telegraph their passives before you commit.',
        tip: 'Hot routes (marked on the map) hit harder but pay extra creds on victory.',
    },
    2: {
        title: 'District Core',
        body: 'Cred leeches, reroll taxes, and duo fights appear here. Save hand rerolls for bad draws — you only get 3 per floor.',
        tip: 'Check the bestiary after new encounters for counter-play notes.',
    },
    3: {
        title: 'Warden Spire',
        body: 'Elite pairings and column pressure dominate. Safehouse rests sit before the Warden — use them or risk limping in.',
        tip: 'The Warden drops a unique relic if you clear the gauntlet.',
    },
};

export const getFloorBriefing = (floor: number): FloorBriefing | undefined =>
    FLOOR_BRIEFINGS[floor];
