/**
 * Run events public API — content definitions + apply engine.
 * Prefer importing types from `runEventTypes` and apply helpers from
 * `applyRunEventEffects` when adding new call sites.
 */
export type {
    EventIconId,
    RunEventEffect,
    RunEventChoice,
    RunEventDefinition,
    WheelSegment,
    IconMatchGrid,
    AppliedEventMessage,
    AppliedEventResult,
} from './runEventTypes';

export {
    ICON_MATCH_GRID_SIZE,
    ICON_MATCH_GRID_COLS,
    ICON_MATCH_ATTEMPTS,
    ICON_MATCH_PAIR_COUNT,
    WHEEL_SPIN_COST,
    WHEEL_SEGMENTS,
    RUN_EVENTS,
    rollRunEventId,
    rollRunEventIdExcluding,
    getRunEvent,
    rollWheelSegment,
    buildIconMatchGrid,
    getWheelSegmentIndex,
} from './runEventDefinitions';

export {
    getChoiceCardPreviews,
    applyRunEventEffects,
    resolveIconMatchResult,
    getWheelSpinEffects,
} from './applyRunEventEffects';
