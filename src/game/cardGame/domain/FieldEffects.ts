import { isTrapPlacementColumn } from '../../config/gridConfig';
import { GAME_RULES, getCardDefinitionOrThrow } from '../config/cardRegistry';
import type { AttackSequence } from './types';
import { getUnchainedHazardSlots } from '../combat/AttackPipeline';
import {
    applyTileDampening,
    isDampenedTile,
    placeSilenceTiles,
    type DampenField,
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
        return this.isSlotSilenced(slot) || this.isSlotBombDisabled(slot);
    }

    applyDampeningToSequence (sequence: AttackSequence): AttackSequence
    {
        return this.dampenField ? applyTileDampening(sequence, this.dampenField) : sequence;
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

    markUnchainedHazardsAfterAttack (chain: AttackSequence['chain']): void
    {
        this.bombDisabledSlots.clear();

        for (const slot of getUnchainedHazardSlots(this.board, chain))
        {
            this.bombDisabledSlots.add(slotKey(slot));
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
        const hazardId = GAME_RULES.hazard.definitionId;
        const emptySlots: SlotPosition[] = [];
        const hazardSlots: SlotPosition[] = [];

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
            else if (card.definitionId === hazardId)
            {
                hazardSlots.push({ ...slot });
            }
        }

        if (emptySlots.length === 0)
        {
            return null;
        }

        const isAdjacentToHazard = (candidate: SlotPosition): boolean =>
            hazardSlots.some((hazard) =>
                Math.abs(hazard.row - candidate.row) <= 1
                && Math.abs(hazard.col - candidate.col) <= 1);

        const spacedSlots = emptySlots.filter((candidate) => !isAdjacentToHazard(candidate));
        const candidates = spacedSlots.length > 0 ? spacedSlots : emptySlots;

        const slot = pickRandom(candidates);
        const hazardDefinition = getCardDefinitionOrThrow(GAME_RULES.hazard.definitionId);
        const hazardArrow = pickFieldCardArrow(this.board, slot, hazardDefinition.arrowPool);
        const card = createCardInstance(GAME_RULES.hazard.definitionId, hazardArrow, 'enemy');

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
