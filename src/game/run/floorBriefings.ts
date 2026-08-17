export interface FloorBriefing {
    title: string;
    body: string;
    tip: string;
}

export const FLOOR_BRIEFINGS: Record<number, FloorBriefing> = {
    1: {
        title: 'Outer Grid',
        body: 'This whole board is Floor 1. Street ops probe your routing, a lieutenant holds mid-grid, and the Warden waits at the far gate. Hand rerolls refill once after you clear the lieutenant.',
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
        tip: 'The Warden drops a unique body mod if you clear the gauntlet.',
    },
};

export const getFloorBriefing = (floor: number): FloorBriefing | undefined =>
    FLOOR_BRIEFINGS[floor];
