import type { RunDeckCard } from './runDeck';

/** Icons used across run events (wheel, matcher, choices). */
export type EventIconId =
    | 'wheel'
    | 'matcher'
    | 'spring'
    | 'idol'
    | 'gambler'
    | 'gold'
    | 'card'
    | 'curse'
    | 'body-mod'
    | 'heal'
    | 'trap'
    | 'sun'
    | 'moon'
    | 'skull'
    | 'sword'
    | 'shield'
    | 'coin'
    | 'puzzle';

export type RunEventEffect =
    | { kind: 'heal'; amount: number }
    | { kind: 'damage'; amount: number }
    | { kind: 'gold'; amount: number }
    | { kind: 'lose-gold'; amount: number }
    | { kind: 'add-card'; cardId: string }
    | { kind: 'add-curse'; cardId: string; count: number }
    | { kind: 'add-random-card' }
    | { kind: 'add-random-body-mod' }
    | { kind: 'body-mod'; bodyModId: string }
    | { kind: 'open-wheel' }
    | { kind: 'open-icon-match' }
    | { kind: 'open-puzzle'; puzzleId: string }
    | { kind: 'open-random-puzzle' };

export interface RunEventChoice {
    id: string;
    label: string;
    description: string;
    icon: EventIconId;
    effects: RunEventEffect[];
}

export interface RunEventDefinition {
    id: string;
    title: string;
    intro: string;
    icon: EventIconId;
    choices: RunEventChoice[];
}

export interface WheelSegment {
    id: string;
    label: string;
    icon: EventIconId;
    effects: RunEventEffect[];
}

export interface IconMatchGrid {
    /** Shuffled face-down tiles — length 16, eight icon pairs. */
    tiles: EventIconId[];
}

export interface AppliedEventMessage {
    text: string;
    tone: 'good' | 'bad' | 'neutral';
    /** Concrete card awarded/cursed — UI can show a chip beside the text. */
    cardId?: string;
    cardCount?: number;
}

export interface AppliedEventResult {
    playerHealth: number;
    gold: number;
    deck: RunDeckCard[];
    bodyMods: string[];
    messages: AppliedEventMessage[];
}
