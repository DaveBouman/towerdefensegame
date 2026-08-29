import { isTrapPlacementColumn } from '../../config/gridConfig';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { AttackSequence } from './types';
import { getUnchainedHazardSlots } from '../combat/attackSequence';
import { slotsCanTypeStack } from '../combat/typeStack';
import {
    applyLaneNullify,
    applyTileDampening,
    isDampenedTile,
    isNullifiedSlot,
    placeSilenceTiles,
    type DampenField,
    type NullifyLane,
} from '../enemyPassives/applyEnemyPassives';
import { getEnemyPassive } from '../enemyPassives/defaults';
import type { EnemyPassiveConfig } from '../enemyPassives/types';
import { slotKey } from './cardDirections';
import type { BoardModel } from './BoardModel';
import { createCardInstance } from './createCardInstance';
import { pickFieldCardArrow, reconcileFieldCardArrows } from './fieldCardArrows';
import type { SlotPosition } from './types';
import { pickRandom } from '../../random/rng';

export class FieldEffects
{
    private dampenField: (DampenField & { turnsRemaining: number }) | null = null;
    private readonly silencedSlots = new Set<string>();
    private readonly bombDisabledSlots = new Set<string>();
    private lockedColumn: number | null = null;
    private nullifyLane: NullifyLane | null = null;

    constructor (private readonly board: BoardModel) {}

    getSilencedSlots (): SlotPosition[]
    {
        return this.board.slotsInOrder().filter((slot) => this.silencedSlots.has(slotKey(slot)));
    }

    getBombDisabledSlots (): SlotPosition[]
    {
        return this.board.slotsInOrder().filter((slot) => this.bombDisabledSlots.has(slotKey(slot)));
    }

    isSlotSilenced (slot: SlotPosition): boolean
    {
        return this.silencedSlots.has(slotKey(slot));
    }

    isSlotBombDisabled (slot: SlotPosition): boolean
    {
        return this.bombDisabledSlots.has(slotKey(slot));
    }

    isSlotBlockedForPlayer (slot: SlotPosition): boolean
    {
        return this.isSlotSilenced(slot)
            || this.isSlotBombDisabled(slot)
            || (this.lockedColumn !== null && slot.col === this.lockedColumn);
    }

    getLockedColumn (): number | null
    {
        return this.lockedColumn;
    }

    getLockedColumnSlots (): SlotPosition[]
    {
        if (this.lockedColumn === null)
        {
            return [];
        }

        const column = this.lockedColumn;
        const slots: SlotPosition[] = [];

        for (const slot of this.board.slotsInOrder())
        {
            if (slot.col === column)
            {
                slots.push(slot);
            }
        }

        return slots;
    }

    /** Locks a board column (replaces any previous lock). Returns the locked column. */
    lockColumn (column: number): number
    {
        this.lockedColumn = column;

        return column;
    }

    getNullifyLane (): NullifyLane | null
    {
        return this.nullifyLane ? { ...this.nullifyLane } : null;
    }

    isSlotNullified (slot: SlotPosition): boolean
    {
        return this.nullifyLane !== null && isNullifiedSlot(slot, this.nullifyLane);
    }

    getNullifiedSlots (): SlotPosition[]
    {
        if (!this.nullifyLane)
        {
            return [];
        }

        const lane = this.nullifyLane;

        return this.board.slotsInOrder().filter((slot) => isNullifiedSlot(slot, lane));
    }

    /** Nullifies a board column or row (replaces any previous strip). */
    setNullifyLane (lane: NullifyLane): NullifyLane
    {
        this.nullifyLane = { ...lane };

        return this.nullifyLane;
    }

    applyDampeningToSequence (sequence: AttackSequence): AttackSequence
    {
        let next = this.dampenField ? applyTileDampening(sequence, this.dampenField) : sequence;

        if (this.nullifyLane)
        {
            next = applyLaneNullify(next, this.nullifyLane);
        }

        return next;
    }

    activateDampenField (passives: readonly EnemyPassiveConfig[]): DampenField | null
    {
        for (const passive of passives)
        {
            const dampen = getEnemyPassive([ passive ], 'dampenTiles');

            if (!dampen)
            {
                continue;
            }

            this.dampenField = {
                parity: dampen.parity,
                multiplier: dampen.multiplier,
                turnsRemaining: Math.max(1, dampen.duration),
            };

            return { parity: dampen.parity, multiplier: dampen.multiplier };
        }

        return null;
    }

    getDampenField (): DampenField | null
    {
        return this.dampenField
            ? { parity: this.dampenField.parity, multiplier: this.dampenField.multiplier }
            : null;
    }

    tickDampenField (): void
    {
        if (!this.dampenField)
        {
            return;
        }

        this.dampenField.turnsRemaining -= 1;

        if (this.dampenField.turnsRemaining <= 0)
        {
            this.dampenField = null;
        }
    }

    getDampenedSlots (): SlotPosition[]
    {
        if (!this.dampenField)
        {
            return [];
        }

        const slots: SlotPosition[] = [];

        for (const slot of this.board.slotsInOrder())
        {
            if (isDampenedTile(slot, this.dampenField.parity))
            {
                slots.push({ ...slot });
            }
        }

        return slots;
    }

    /**
     * After an attack: scorch tiles of traps that exploded (not in the chain),
     * and remove every enemy trap from the board (disarmed or detonated).
     */
    resolveHazardsAfterAttack (chain: AttackSequence['chain']): void
    {
        this.bombDisabledSlots.clear();

        for (const slot of getUnchainedHazardSlots(this.board, chain))
        {
            this.bombDisabledSlots.add(slotKey(slot));
        }

        this.removeEnemyFieldNodesFromBoard();
    }

    private removeEnemyFieldNodesFromBoard (): void
    {
        const fieldIds = new Set([
            GAME_RULES.hazard.definitionId,
            GAME_RULES.siphon.definitionId,
        ]);

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (card && fieldIds.has(card.definitionId) && card.owner === 'enemy')
            {
                this.board.removeCard(slot);
            }
        }
    }

    applySilenceTiles (passives: readonly EnemyPassiveConfig[]): void
    {
        placeSilenceTiles(this.board, this.silencedSlots, passives);
    }

    /** Test hook — marks a slot silenced without enemy passives. */
    markSlotSilencedForTest (slot: SlotPosition): void
    {
        this.silencedSlots.add(slotKey(slot));
    }

    placeEnemyHazard (): SlotPosition | null
    {
        return this.placeEnemyFieldCard(GAME_RULES.hazard.definitionId);
    }

    placeEnemySiphon (): SlotPosition | null
    {
        return this.placeEnemyFieldCard(GAME_RULES.siphon.definitionId);
    }

    private placeEnemyFieldCard (definitionId: string): SlotPosition | null
    {
        const emptySlots: SlotPosition[] = [];
        const neighborSlots: SlotPosition[] = [];
        const fieldIds = new Set([
            GAME_RULES.hazard.definitionId,
            GAME_RULES.siphon.definitionId,
        ]);

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (card === null)
            {
                if (isTrapPlacementColumn(slot.col))
                {
                    emptySlots.push({ ...slot });
                }
            }
            else if (fieldIds.has(card.definitionId))
            {
                neighborSlots.push({ ...slot });
            }
        }

        if (emptySlots.length === 0)
        {
            return null;
        }

        const isAdjacentToFieldNode = (candidate: SlotPosition): boolean =>
            neighborSlots.some((occupied) => slotsCanTypeStack(occupied, candidate));

        const spacedSlots = emptySlots.filter((candidate) => !isAdjacentToFieldNode(candidate));
        const candidates = spacedSlots.length > 0 ? spacedSlots : emptySlots;

        const slot = pickRandom(candidates);
        const definition = getCardDefinitionOrThrow(definitionId);
        const arrow = pickFieldCardArrow(this.board, slot, definition.arrowPool);
        const card = createCardInstance(definitionId, arrow, 'enemy');

        this.board.placeCard(slot, card);
        reconcileFieldCardArrows(this.board, slot);

        return slot;
    }

    placeFieldBoost (): SlotPosition | null
    {
        const emptySlots: SlotPosition[] = [];

        for (const slot of this.board.slotsInOrder())
        {
            if (this.board.isEmpty(slot))
            {
                emptySlots.push({ ...slot });
            }
        }

        if (emptySlots.length === 0)
        {
            return null;
        }

        const slot = pickRandom(emptySlots);
        const boostDefinition = getCardDefinitionOrThrow(GAME_RULES.fieldBoost.definitionId);
        const boostArrow = pickFieldCardArrow(this.board, slot, boostDefinition.arrowPool);
        const card = createCardInstance(GAME_RULES.fieldBoost.definitionId, boostArrow, 'field');

        this.board.placeCard(slot, card);
        reconcileFieldCardArrows(this.board, slot);

        return slot;
    }
}
