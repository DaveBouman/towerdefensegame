import { BODY_MOD_IDS } from '../../run/bodyMods';
import type { RunDeckCard } from '../../run/runDeck';
import { getBattleEnergyBonus, getRunMaxHealth } from '../../run/runResources';
import { getTutorialWizardPhaseSpec } from '../../run/tutorialWizardPhases';
import { EnemyOverclockTracker, getEnemyDamageRamp as computeEnemyDamageRamp } from './enemyOverclock';
import { GRID_CONFIG } from '../../config/gridConfig';
import {
    GAME_RULES,
    getCardDefinitionOrThrow,
    getCardHandEndPenalty,
} from '../config/cardRegistry';
import {
    type LoadedCardGameEnemyDefinition,
} from '../config/enemyCatalog';
import { buildAttackSequence as buildRawAttackSequence, planAttack } from '../combat/AttackPipeline';
import {
    aggregateBattleModifiers,
    scaleIncomingDamage,
    type BattleModifier,
    type BattleModifierDuration,
    type BattleModifierStat,
} from '../combat/battleModifiers';
import { collectBattleModifierApplications } from '../combat/chainBattleModifiers';
import { scaleBoostedDelta } from '../combat/chainBoost';
import {
    applyEnemyPassivesToSequence,
    type DampenField,
} from '../enemyPassives/applyEnemyPassives';
import { getEnemyPassive } from '../enemyPassives/defaults';
import { collectCombatTraitsFromBodyMods } from '../combat/combatTraits/collect';
import { getCombatTrait } from '../combat/combatTraits/defaults';
import type { CombatTraitConfig } from '../combat/combatTraits/types';
import { BoardEditController } from './BoardEditController';
import { BoardModel, createEmptyBoard } from './BoardModel';
import { CombatResolver } from './CombatResolver';
import { DeckHand } from './DeckHand';
import { EnemyPhaseController } from './EnemyPhaseController';
import { EnemySquadManager } from './EnemySquadManager';
import { EnergyRoundController } from './EnergyRoundController';
import { FieldEffects } from './FieldEffects';
import { HandRedirectController } from './HandRedirectController';
import { isPlayerOwnedCard } from './cardOwnership';
import {
    clearLatchSlots,
    getLatchKeepInstanceIds,
    noteLatchPlacement,
    noteLatchRemoval,
    type LatchSlots,
} from './boardPersist';
import { createCardInstance } from './createCardInstance';
import { applyRerollTaxToCombatants } from '../enemyPassives/interactionPassives';
import type {
    ActivationStep,
    AttackReadiness,
    AttackSequence,
    CardInstance,
    DamageResult,
    EnemyCombatant,
    EnemyState,
    EnemyTurnAction,
    PlayerState,
    PlayerDamageResult,
    SlotPosition,
    HandPenaltyResult,
} from './types';
import { CardGameEventBus } from '../events/CardGameEventBus';
import { CARD_GAME_EVENTS } from '../events/cardGameEvents';
import type { CardDirection } from './cardDirections';

export interface PuzzleModeConfig {
    handCards: readonly {
        definitionId: string;
        arrow?: CardDirection;
        loopArrow?: CardDirection;
    }[];
    /** When set, cards are placed on the grid at battle start (showcase / capture). */
    boardCards?: readonly {
        row: number;
        col: number;
        definitionId: string;
        arrow?: CardDirection;
        loopArrow?: CardDirection;
    }[];
    chainStart?: SlotPosition;
    damageTarget: number;
    /** Guided first-run tutorial — multi-attack, no enemy counter, phased hands. */
    tutorialWizard?: boolean;
    maxEnergy?: number;
}

export class CardGameSession
{
    readonly board: BoardModel;
    private readonly deckHand: DeckHand;
    private readonly fieldEffects: FieldEffects;
    private readonly combat: CombatResolver;
    private readonly enemyPhase: EnemyPhaseController;
    private readonly boardEdit: BoardEditController;
    private readonly squad: EnemySquadManager;
    private readonly energyRound: EnergyRoundController;
    private readonly handRedirect: HandRedirectController;
    /** Definition ids exhausted (played) this battle — battle-scoped only. */
    private readonly exhaustedDefinitionIds: string[] = [];
    private player: PlayerState;
    private readonly overclock: EnemyOverclockTracker;
    private readonly battleModifiers: BattleModifier[] = [];
    private playerThorns = 0;
    private readonly puzzleMode: PuzzleModeConfig | null;
    private puzzleFinished = false;
    private tutorialPhaseId: import('../../run/tutorialWizard').TutorialWizardStep | null = null;
    private readonly bodyMods: readonly string[];
    private readonly latchSlots: LatchSlots = {};
    private chainStart: SlotPosition = {
        row: GAME_RULES.activationStart.row,
        col: GAME_RULES.activationStartColumn,
    };

    constructor (
        enemyIds: string | readonly string[] = GAME_RULES.defaultEnemyId,
        startHealth?: number,
        runDeck?: readonly RunDeckCard[],
        bodyMods: readonly string[] = [],
        puzzleMode: PuzzleModeConfig | null = null,
        runAttackCount = 0,
        rerollsRemaining?: number,
        runGold = 0,
        enemyHealthMultiplier = 1,
    )
    {
        this.puzzleMode = puzzleMode;
        this.overclock = new EnemyOverclockTracker(puzzleMode !== null);
        this.bodyMods = bodyMods;

        const healthMultiplier = Math.max(0.5, enemyHealthMultiplier);

        this.squad = new EnemySquadManager(
            {
                returnStolenCardToDeck: (definitionId) => this.deckHand.returnStolenCardToDeck(definitionId),
                stealRandomDeckCard: () => this.deckHand.stealRandomDeckCard(),
            },
            enemyIds,
            healthMultiplier,
            runGold,
        );

        const maxHealth = getRunMaxHealth(bodyMods);
        this.player = {
            health: startHealth !== undefined
                ? Math.min(maxHealth, Math.max(1, Math.round(startHealth)))
                : maxHealth,
            maxHealth,
            shield: 0,
        };

        this.board = new BoardModel(createEmptyBoard(GRID_CONFIG.rows, GRID_CONFIG.cols));
        this.fieldEffects = new FieldEffects(this.board);
        this.deckHand = new DeckHand(
            runDeck,
            puzzleMode ? 0 : (rerollsRemaining ?? GAME_RULES.rerollsPerFloor),
        );
        this.combat = new CombatResolver({
            board: this.board,
            fieldEffects: this.fieldEffects,
            bodyMods: this.bodyMods,
            puzzleMode: this.puzzleMode,
            battleModifiers: this.battleModifiers,
            player: this.player,
            getCombatants: () => this.squad.combatants,
            getLivingCombatants: () => this.squad.getLivingCombatants(),
            getCombatant: (instanceId) => this.squad.getCombatant(instanceId),
            getCombatantOrThrow: (instanceId) => this.squad.getCombatantOrThrow(instanceId),
            getTargetCombatant: () => this.squad.getTargetCombatant(),
            getAttackTargetId: () => this.squad.getAttackTargetId(),
            setAttackTargetId: (instanceId) => this.squad.setAttackTargetId(instanceId),
            ensureAttackTarget: () => this.squad.ensureAttackTarget(),
            resolveAttackTargetId: (explicit) => this.squad.resolveAttackTargetId(explicit),
            shatterCombatantIfNeeded: (instanceId) => this.squad.shatterCombatantIfNeeded(instanceId),
            onCombatantKilled: (instanceId) => this.squad.onCombatantKilled(instanceId),
            tryTriggerPhaseShift: (combatant) => this.squad.tryTriggerPhaseShift(combatant),
            getPlayerThorns: () => this.playerThorns,
        }, runAttackCount);
        this.enemyPhase = new EnemyPhaseController({
            combatants: this.squad.combatants,
            getLivingCombatants: () => this.squad.getLivingCombatants(),
            getCombatant: (instanceId) => this.squad.getCombatant(instanceId),
            isEnemyDefeated: () => this.isEnemyDefeated(),
            isPlayerDefeated: () => this.isPlayerDefeated(),
            getPlayer: () => this.getPlayer(),
            getEnemy: (instanceId) => this.squad.getEnemy(instanceId),
            rampEnemyAction: (action) => this.rampEnemyAction(action),
            tickEnemyOverclock: () => this.tickEnemyOverclock(),
            applySilenceTilesFromPassives: () =>
            {
                const passives = this.squad.getLivingCombatants().flatMap((entry) => entry.definition.passives);
                this.fieldEffects.applySilenceTiles(passives);
            },
        });
        this.boardEdit = new BoardEditController({
            board: this.board,
            deckHand: this.deckHand,
            isBusy: () => this.isBusy(),
            isPuzzleFinished: () => this.puzzleFinished,
            isSlotBlockedForPlayer: (slot) => this.isSlotBlockedForPlayer(slot),
            onCardExhausted: (definitionId) =>
            {
                this.exhaustedDefinitionIds.push(definitionId);
            },
        });

        const hitWard = getCombatTrait(collectCombatTraitsFromBodyMods(bodyMods), 'hitWard');

        if (hitWard)
        {
            this.combat.initPlayerHitWard(hitWard.hitsBlocked);
        }

        const bonusEnergy = getBattleEnergyBonus(bodyMods);
        const maxEnergy = puzzleMode?.tutorialWizard
            ? Math.max(0, puzzleMode.maxEnergy ?? GAME_RULES.energyPerTurn)
            : puzzleMode
                ? 1
                : Math.max(1, Math.round(GAME_RULES.energyPerTurn) + bonusEnergy);
        this.energyRound = new EnergyRoundController({
            isPlayerDefeated: () => this.isPlayerDefeated(),
            isEnemyDefeated: () => this.isEnemyDefeated(),
            refillHand: () => this.refillHand(),
            renewHand: () => this.renewHand(),
            clearTransientBattleModifiers: () => this.clearTransientBattleModifiers(),
            clearBattleModifiers: () => this.clearBattleModifiers(),
            applyEnemyCurseHand: () => this.applyEnemyCurseHand(),
            isHandRedirectActiveThisRound: () => this.handRedirect.isActiveThisRound(),
            scrambleHandArrows: () => this.handRedirect.scrambleHandArrows(),
            clearHandRedirect: () => this.handRedirect.clearHandRedirect(),
            activatePendingHandRedirectAfterRenew: () => this.handRedirect.activatePendingAfterRenew(),
            completeEnemyPhase: () => this.enemyPhase.completeEnemyPhase(),
            completeSingleEnemyTurn: (action) => this.completeSingleEnemyTurn(action),
            hasMoreEnemyTurnsInPhase: () => this.enemyPhase.hasMoreEnemyTurnsInPhase(),
        }, maxEnergy);
        this.handRedirect = new HandRedirectController({
            board: this.board,
            deckHand: this.deckHand,
            getEnergy: () => this.energyRound.getEnergy(),
        });

        if (puzzleMode)
        {
            if (puzzleMode.handCards.length > 0)
            {
                this.deckHand.initPuzzleHand(
                    puzzleMode.handCards.map((spec) => createCardInstance(
                        spec.definitionId,
                        spec.arrow,
                        'player',
                        spec.loopArrow,
                    )),
                );
            }

            if (puzzleMode.boardCards?.length)
            {
                for (const spec of puzzleMode.boardCards)
                {
                    this.board.placeCard(
                        { row: spec.row, col: spec.col },
                        createCardInstance(
                            spec.definitionId,
                            spec.arrow,
                            'player',
                            spec.loopArrow,
                        ),
                    );
                }
            }

            if (puzzleMode.chainStart)
            {
                this.setChainStartSlot(puzzleMode.chainStart);
            }

            this.enemyPhase.clearQueuedTurn();
        }
        else
        {
            this.renewHand();
            this.enemyPhase.queueNextEnemyTurn();
        }

        this.deckHand.emitRerollsChanged();
    }

    getDeckSize (): number
    {
        return this.deckHand.getDeckSize();
    }

    getDiscardSize (): number
    {
        return this.deckHand.getDiscardSize();
    }

    getPileCounts (): { deckSize: number; discardSize: number; exhaustSize: number }
    {
        return this.deckHand.getPileCounts();
    }

    /** Draw-pile card definition ids. */
    getDeckDefinitionIds (): string[]
    {
        return this.deckHand.getDeckDefinitionIds();
    }

    /** Draw pile cards (includes arrow / loopArrow for inspectors). */
    getDeckCards (): readonly CardInstance[]
    {
        return this.deckHand.getDeckCards();
    }

    /** Discard-pile card definition ids. */
    getDiscardDefinitionIds (): string[]
    {
        return this.deckHand.getDiscardDefinitionIds();
    }

    /** Discard pile cards (includes arrow / loopArrow for inspectors). */
    getDiscardCards (): readonly CardInstance[]
    {
        return this.deckHand.getDiscardCards();
    }

    /** Next card that would be drawn (`deck.pop()`). */
    getDeckTopCard (): CardInstance | undefined
    {
        return this.deckHand.getDeckTopCard();
    }

    /** Most recently discarded card. */
    getDiscardTopCard (): CardInstance | undefined
    {
        return this.deckHand.getDiscardTopCard();
    }

    getExhaustSize (): number
    {
        return this.deckHand.getExhaustSize();
    }

    getExhaustedCards (): readonly CardInstance[]
    {
        return this.deckHand.getExhaustedCards();
    }

    getExhaustTopCard (): CardInstance | undefined
    {
        return this.deckHand.getExhaustTopCard();
    }

    /** Single-use cards played this battle (for tests and debugging). */
    getExhaustedDefinitionIds (): readonly string[]
    {
        return [ ...this.exhaustedDefinitionIds ];
    }

    /** Run-wide attack counter (increments each time the player starts an attack). */
    getRunAttackCount (): number
    {
        return this.combat.getRunAttackCount();
    }

    /** Whether the current attack has Mark VII double damage active. */
    isDoubleDamageThisAttack (): boolean
    {
        return this.combat.isDoubleDamageThisAttack();
    }

    getEnergy (): number
    {
        return this.energyRound.getEnergy();
    }

    getMaxEnergy (): number
    {
        return this.energyRound.getMaxEnergy();
    }

    hasEnergy (): boolean
    {
        return this.energyRound.hasEnergy();
    }

    /** Attacks the player has taken so far this round (one energy spent per attack). */
    getAttacksThisRound (): number
    {
        return this.energyRound.getAttacksThisRound();
    }

    /** Bonus damage the enemy gains for the player's escalating attacks this round. */
    getEnemyDamageRamp (): number
    {
        return computeEnemyDamageRamp(this.getAttacksThisRound());
    }

    /** Fight-long attack bonus: +N after each enemy response. */
    getEnemyOverclock (): number
    {
        return this.overclock.getBonus();
    }

    getEnemyOverclockPerTurn (): number
    {
        return this.overclock.getPerTurn();
    }

    /** Overclock the next Attack will lock in after the enemy responds. */
    getNextEnemyOverclock (): number
    {
        return this.overclock.getNextBonus();
    }

    /** Called once after all enemies finish responding to a player Attack. */
    tickEnemyOverclock (): void
    {
        if (this.isPlayerDefeated() || this.isEnemyDefeated())
        {
            return;
        }

        this.overclock.tick();
    }

    /** Applies intra-round ramp and fight-long overclock to enemy attack steps. */
    private rampEnemyAction (action: EnemyTurnAction): EnemyTurnAction
    {
        const bonus = this.getEnemyDamageRamp() + this.getEnemyOverclock();
        const totals = aggregateBattleModifiers(this.battleModifiers);

        return {
            ...action,
            steps: action.steps.map((step) =>
            {
                if (step.kind !== 'attack')
                {
                    return { ...step };
                }

                const base = (step.amount ?? 0) + bonus;

                return {
                    ...step,
                    amount: scaleIncomingDamage(base, totals.enemyAttack, totals.playerDamageTaken),
                };
            }),
        };
    }

    addBattleModifier (
        stat: BattleModifierStat,
        delta: number,
        source: BattleModifier['source'],
        duration: BattleModifierDuration = 'energy-round',
    ): void
    {
        if (delta === 0)
        {
            return;
        }

        this.battleModifiers.push({ stat, delta, source, duration });
    }

    addBattleModifierFromCard (definitionId: string, boostMultiplier = 1): void
    {
        const definition = getCardDefinitionOrThrow(definitionId);

        if (!definition.battleModifier)
        {
            return;
        }

        this.addBattleModifier(
            definition.battleModifier.stat,
            scaleBoostedDelta(definition.battleModifier.delta, boostMultiplier),
            'player',
            definition.battleModifier.duration ?? 'energy-round',
        );
    }

    addPlayerThorns (amount: number): void
    {
        if (amount <= 0)
        {
            return;
        }

        this.playerThorns += amount;
    }

    getPlayerThorns (): number
    {
        return this.playerThorns;
    }

    applyBattleModifiersFromChain (chain: readonly ActivationStep[]): void
    {
        for (const definitionId of collectBattleModifierApplications(chain))
        {
            this.addBattleModifierFromCard(definitionId);
        }
    }

    addBattleModifierFromEnemyStep (step: import('../domain/types').EnemyTurnStep): void
    {
        if (step.kind !== 'battle-mod' || step.modifierStat === undefined || step.modifierDelta === undefined)
        {
            return;
        }

        this.addBattleModifier(step.modifierStat, step.modifierDelta, 'enemy', 'energy-round');
    }

    getBattleModifiers (): readonly BattleModifier[]
    {
        return [ ...this.battleModifiers ];
    }

    getPlayerCombatTraits (): readonly CombatTraitConfig[]
    {
        return this.combat.getPlayerCombatTraits();
    }

    resolveAllyHeal (amount: number, targetInstanceId: string): EnemyState
    {
        return this.combat.resolveAllyHeal(amount, targetInstanceId);
    }

    resolveAllyShield (amount: number, targetInstanceId: string): EnemyState
    {
        return this.combat.resolveAllyShield(amount, targetInstanceId);
    }

    clearBattleModifiers (): void
    {
        this.battleModifiers.length = 0;
        this.playerThorns = 0;
    }

    clearTransientBattleModifiers (): void
    {
        // All battle modifiers last the full energy round.
    }

    /** Enemy turn telegraph with ramp + active battle modifiers baked in. */
    getTelegraphedEnemyTurn (instanceId: string): EnemyTurnAction | null
    {
        return this.enemyPhase.getTelegraphedEnemyTurn(instanceId);
    }

    getScaledArmorGain (armor: number): number
    {
        return this.combat.getScaledArmorGain(armor);
    }

    registerCapacitorDefendStep (): void
    {
        this.combat.registerCapacitorDefendStep();
    }

    isCapacitorChargeReady (): boolean
    {
        return this.combat.isCapacitorChargeReady();
    }

    scalePoisonStacks (stacks: number): number
    {
        return this.combat.scalePoisonStacks(stacks);
    }

    scaleAbilityEnemyDamage (abilityId: string, damage: number): number
    {
        return this.combat.scaleAbilityEnemyDamage(abilityId, damage);
    }

    /** Spends one energy for an attack. Returns false when none remains. */
    spendEnergy (): boolean
    {
        return this.energyRound.spendEnergy();
    }

    /** Tops the hand back up to the full hand size without discarding held cards. */
    refillHand (): void
    {
        this.deckHand.refillHand();
    }

    /** Adds a card to the hand (used by curse passives and future events). */
    addCardToHand (definitionId: string, ignoreHandLimit = false): boolean
    {
        return this.deckHand.addCardToHand(definitionId, ignoreHandLimit);
    }

    /**
     * Damages the player for each hand card with a hand-end penalty still held
     * when the turn ends, then exhausts those cards (battle-scoped removal).
     */
    resolveHandEndPenalties (): HandPenaltyResult
    {
        const penalizedCards: { definitionId: string; damage: number }[] = [];
        const penalizedIndices: number[] = [];
        let totalDamage = 0;

        for (let handIndex = 0; handIndex < this.deckHand.getHandLength(); handIndex++)
        {
            const card = this.deckHand.getHand()[handIndex]!;
            const definition = getCardDefinitionOrThrow(card.definitionId);
            const damage = getCardHandEndPenalty(definition);

            if (damage <= 0)
            {
                continue;
            }

            penalizedCards.push({ definitionId: card.definitionId, damage });
            penalizedIndices.push(handIndex);
            totalDamage += damage;
        }

        if (totalDamage > 0)
        {
            this.resolveEnemyAttack(totalDamage);
        }

        for (const card of this.deckHand.exhaustHandCardsAt(penalizedIndices))
        {
            this.exhaustedDefinitionIds.push(card.definitionId);
        }

        return { totalDamage, penalizedCards };
    }

    /** Enemy passives that slip curse cards into the player's hand between turns. */
    private applyEnemyCurseHand (): void
    {
        for (const combatant of this.getLivingCombatants())
        {
            const curseHand = getEnemyPassive(combatant.definition.passives, 'curseHand');

            if (!curseHand)
            {
                continue;
            }

            for (let i = 0; i < curseHand.count; i++)
            {
                this.addCardToHand(curseHand.cardId, true);
            }
        }
    }

    getRerollsRemaining (): number
    {
        return this.deckHand.getRerollsRemaining();
    }

    canReroll (): boolean
    {
        return this.canEditBoard() && this.deckHand.getRerollsRemaining() > 0;
    }

    /** Discards selected hand cards and draws replacements. Uses one floor reroll. */
    rerollHandCards (handIndices: number[]): boolean
    {
        if (!this.canReroll())
        {
            return false;
        }

        const rerolled = this.deckHand.rerollHandCards(handIndices);

        if (rerolled)
        {
            this.applyRerollTaxPassives();
        }

        return rerolled;
    }

    /** Applies reroll-tax passives after a successful hand reroll. */
    private applyRerollTaxPassives (): void
    {
        applyRerollTaxToCombatants(this.getLivingCombatants());
    }

    /** Discards the current hand and draws a fresh one for the next player turn. */
    renewHand (): void
    {
        this.player.shield = 0;
        this.deckHand.renewHand();
        CardGameEventBus.emit(CARD_GAME_EVENTS.ARMOR_CHANGED, { armor: this.player.shield });
    }

    getChainStartSlot (): SlotPosition
    {
        return { ...this.chainStart };
    }

    setChainStartSlot (slot: SlotPosition): boolean
    {
        if (this.combat.isAttackInProgress() || this.enemyPhase.isEnemyTurnInProgress())
        {
            return false;
        }

        if (slot.col !== GAME_RULES.activationStartColumn || slot.row < 0 || slot.row >= GRID_CONFIG.rows)
        {
            return false;
        }

        this.chainStart = { row: slot.row, col: slot.col };

        return true;
    }

    isPuzzleMode (): boolean
    {
        return this.puzzleMode !== null;
    }

    isTutorialWizardMode (): boolean
    {
        return this.puzzleMode?.tutorialWizard === true;
    }

    getTutorialPhaseId (): import('../../run/tutorialWizard').TutorialWizardStep | null
    {
        return this.tutorialPhaseId;
    }

    applyTutorialWizardPhase (
        spec: import('../../run/tutorialWizardPhases').TutorialWizardPhaseSpec,
    ): void
    {
        if (!this.isTutorialWizardMode())
        {
            return;
        }

        this.tutorialPhaseId = spec.stepId;
        this.puzzleFinished = false;

        if (!spec.preserveBoard)
        {
            this.clearBoard();
        }

        if (!spec.preserveBoard)
        {
            this.deckHand.initPuzzleHand(
                spec.handCards.map((cardSpec) => createCardInstance(
                    cardSpec.definitionId,
                    cardSpec.arrow,
                    'player',
                )),
            );
        }
        else if (spec.handCards.length > 0)
        {
            this.deckHand.initPuzzleHand(
                spec.handCards.map((cardSpec) => createCardInstance(
                    cardSpec.definitionId,
                    cardSpec.arrow,
                    'player',
                )),
            );
        }

        if (!spec.preserveBoard && spec.boardCards?.length)
        {
            for (const boardSpec of spec.boardCards)
            {
                this.board.placeCard(
                    { row: boardSpec.row, col: boardSpec.col },
                    createCardInstance(
                        boardSpec.definitionId,
                        boardSpec.arrow,
                        'player',
                    ),
                );
            }
        }

        if (spec.chainStart)
        {
            this.setChainStartSlot(spec.chainStart);
        }

        this.energyRound.setMaxEnergy(Math.max(0, spec.maxEnergy));
        this.energyRound.resetEnergy();
    }

    /** After the strike demo: start the 3-energy round (board already cleared). */
    beginTutorialEnergyRound (): void
    {
        const spec = getTutorialWizardPhaseSpec('energy');

        if (!spec || !this.isTutorialWizardMode())
        {
            return;
        }

        this.tutorialPhaseId = 'energy';
        this.puzzleFinished = false;

        this.deckHand.initPuzzleHand(
            spec.handCards.map((cardSpec) => createCardInstance(
                cardSpec.definitionId,
                cardSpec.arrow,
                'player',
            )),
        );

        if (spec.chainStart)
        {
            this.setChainStartSlot(spec.chainStart);
        }

        this.energyRound.setMaxEnergy(Math.max(0, spec.maxEnergy));
        this.energyRound.resetEnergy();
    }

    getPuzzleDamageTarget (): number | null
    {
        return this.puzzleMode?.damageTarget ?? null;
    }

    isPuzzleFinished (): boolean
    {
        return this.puzzleFinished;
    }

    evaluatePuzzleAttack (sequence: AttackSequence): { success: boolean; damageDealt: number }
    {
        const damageDealt = sequence.totalDamage
            + sequence.offChainDamage
            + sequence.abilityEnemyDamage;
        const target = this.puzzleMode?.damageTarget ?? 0;

        return {
            success: damageDealt >= target,
            damageDealt,
        };
    }

    finishPuzzle (): void
    {
        this.puzzleFinished = true;
    }

    getCombatants (): readonly EnemyCombatant[]
    {
        return this.squad.getCombatants();
    }

    getCombatant (instanceId: string): EnemyCombatant | undefined
    {
        return this.squad.getCombatant(instanceId);
    }

    getLivingCombatants (): EnemyCombatant[]
    {
        return this.squad.getLivingCombatants();
    }

    hasMultipleEnemies (): boolean
    {
        return this.squad.hasMultipleEnemies();
    }

    tryTriggerPhaseShift (combatant: EnemyCombatant): { label: string; message: string } | null
    {
        return this.squad.tryTriggerPhaseShift(combatant);
    }

    getCombatRecap (): { damageDealt: number; armorGained: number; damageTaken: number }
    {
        return this.combat.getCombatRecap();
    }

    getBattleDamageTotals (): { dealt: number; taken: number }
    {
        return this.combat.getBattleDamageTotals();
    }

    /** Adds a living combatant mid-battle (spawn / shatter). */
    addCombatant (definitionId: string): EnemyCombatant
    {
        return this.squad.addCombatant(definitionId);
    }

    removeCombatant (instanceId: string): boolean
    {
        return this.squad.removeCombatant(instanceId);
    }

    /**
     * On kill: if the combatant has shatterOnDeath, remove it and spawn parts.
     * Emits COMBATANTS_CHANGED for UI sync.
     */
    shatterCombatantIfNeeded (instanceId: string): string[]
    {
        return this.squad.shatterCombatantIfNeeded(instanceId);
    }

    /** After a host finishes its turn, maybe spawn a minion. */
    trySpawnMinionAfterEnemyTurn (instanceId: string): EnemyCombatant | null
    {
        return this.squad.trySpawnMinionAfterEnemyTurn(instanceId);
    }

    onCombatantKilled (instanceId: string): void
    {
        this.squad.onCombatantKilled(instanceId);
    }

    fleeCombatant (instanceId: string): void
    {
        this.squad.fleeCombatant(instanceId);
    }

    getRunBattleDeltas (): { goldStolen: number; stolenCardIds: readonly string[] }
    {
        return this.squad.getRunBattleDeltas();
    }

    getAttackTargetId (): string | null
    {
        return this.squad.getAttackTargetId();
    }

    setAttackTarget (instanceId: string): boolean
    {
        return this.squad.setAttackTarget(instanceId);
    }

    /** Cycles lock target to the next living enemy in squad order (wraps). */
    cycleAttackTarget (): string | null
    {
        return this.squad.cycleAttackTarget();
    }

    hasValidAttackTarget (): boolean
    {
        return this.squad.hasValidAttackTarget();
    }

    /** Picks a lone living enemy automatically; returns null when the player must choose. */
    ensureAttackTarget (): string | null
    {
        return this.squad.ensureAttackTarget();
    }

    getEnemy (instanceId?: string): EnemyState
    {
        return this.squad.getEnemy(instanceId);
    }

    getEnemyDefinition (instanceId?: string): LoadedCardGameEnemyDefinition
    {
        return this.squad.getEnemyDefinition(instanceId);
    }

    getHand (): readonly CardInstance[]
    {
        return this.deckHand.getHand();
    }

    getSilencedSlots (): SlotPosition[]
    {
        return this.fieldEffects.getSilencedSlots();
    }

    getLockedColumnSlots (): SlotPosition[]
    {
        return this.fieldEffects.getLockedColumnSlots();
    }

    /** Silenced tiles plus the locked pressure column — for board overlays. */
    getPlacementBlockedSlots (): SlotPosition[]
    {
        return [ ...this.getSilencedSlots(), ...this.getLockedColumnSlots() ];
    }

    getBombDisabledSlots (): SlotPosition[]
    {
        return this.fieldEffects.getBombDisabledSlots();
    }

    isSlotSilenced (slot: SlotPosition): boolean
    {
        return this.fieldEffects.isSlotSilenced(slot);
    }

    isSlotBombDisabled (slot: SlotPosition): boolean
    {
        return this.fieldEffects.isSlotBombDisabled(slot);
    }

    isSlotBlockedForPlayer (slot: SlotPosition): boolean
    {
        return this.fieldEffects.isSlotBlockedForPlayer(slot);
    }

    /** Locks a board column from a Gridlock `lock-column` turn step. */
    lockBoardColumn (column: number): number
    {
        return this.fieldEffects.lockColumn(column);
    }

    /** Nullifies a board column or row from a `nullify-lane` turn step. */
    nullifyBoardLane (lane: { axis: 'column' | 'row'; index: number }): { axis: 'column' | 'row'; index: number }
    {
        return this.fieldEffects.setNullifyLane(lane);
    }

    isSlotNullified (slot: SlotPosition): boolean
    {
        return this.fieldEffects.isSlotNullified(slot);
    }

    getNullifiedSlots (): SlotPosition[]
    {
        return this.fieldEffects.getNullifiedSlots();
    }

    getNullifyLane (): { axis: 'column' | 'row'; index: number } | null
    {
        return this.fieldEffects.getNullifyLane();
    }

    buildAttackSequence (
        chain: import('../domain/types').ActivationStep[],
        stepMs = GAME_RULES.activationStepMs,
    ): AttackSequence
    {
        const target = this.squad.getTargetCombatant();
        const raw = buildRawAttackSequence(chain, this.board, stepMs);
        const passives = this.getLivingCombatants().flatMap((combatant) => combatant.definition.passives);
        const sequence = applyEnemyPassivesToSequence(
            raw,
            target.state,
            passives,
            chain,
        );

        return this.fieldEffects.applyDampeningToSequence(sequence);
    }

    /** Casts the Dead Zone field (from the dampenTiles ability) for the coming player turns. */
    activateDampenField (): DampenField | null
    {
        const passives = this.getLivingCombatants().flatMap((combatant) => combatant.definition.passives);

        return this.fieldEffects.activateDampenField(passives);
    }

    /**
     * Scrambles arrows on cards currently in hand for the rest of this energy round.
     * If energy is already spent, queues the scramble for the next renewed hand.
     */
    applyHandRedirect (): number
    {
        return this.handRedirect.applyHandRedirect();
    }

    /** True while hand arrows are twisted (or queued for the next hand). */
    hasHandRedirect (): boolean
    {
        return this.handRedirect.hasHandRedirect();
    }

    getDampenField (): DampenField | null
    {
        return this.fieldEffects.getDampenField();
    }

    /** Ages the Dead Zone field by one player turn, expiring it when it runs out. */
    tickDampenField (): void
    {
        this.fieldEffects.tickDampenField();
    }

    /** Tiles currently weakened by the Dead Zone field (empty when inactive). */
    getDampenedSlots (): SlotPosition[]
    {
        return this.fieldEffects.getDampenedSlots();
    }

    getPlayer (): PlayerState
    {
        return { ...this.player };
    }

    isAttackInProgress (): boolean
    {
        return this.combat.isAttackInProgress();
    }

    /** True while a player attack or enemy turn is resolving — single busy gate for UI. */
    isBusy (): boolean
    {
        return this.combat.isAttackInProgress() || this.enemyPhase.isEnemyTurnInProgress();
    }

    isEnemyTurnInProgress (): boolean
    {
        return this.enemyPhase.isEnemyTurnInProgress();
    }

    isEnemyDefeated (): boolean
    {
        return this.getLivingCombatants().length === 0;
    }

    isPlayerDefeated (): boolean
    {
        return this.player.health <= 0;
    }

    getQueuedEnemyTurn (instanceId?: string): EnemyTurnAction | null
    {
        return this.enemyPhase.getQueuedEnemyTurn(instanceId);
    }

    getQueuedEnemyTurns (): EnemyTurnAction[]
    {
        return this.enemyPhase.getQueuedEnemyTurns();
    }

    queueNextEnemyTurn (): EnemyTurnAction
    {
        return this.enemyPhase.queueNextEnemyTurn();
    }

    getAttackReadiness (): AttackReadiness
    {
        if (this.combat.isAttackInProgress())
        {
            return { canAttack: false, reason: 'attack-in-progress' };
        }

        if (this.enemyPhase.isEnemyTurnInProgress())
        {
            return { canAttack: false, reason: 'enemy-turn' };
        }

        if (this.isEnemyDefeated())
        {
            return { canAttack: false, reason: 'enemy-defeated' };
        }

        if (this.isPlayerDefeated())
        {
            return { canAttack: false, reason: 'player-defeated' };
        }

        if (this.hasMultipleEnemies() && !this.hasValidAttackTarget())
        {
            return { canAttack: false, reason: 'no-target' };
        }

        if (!this.energyRound.hasEnergy())
        {
            return { canAttack: false, reason: 'no-energy' };
        }

        const sequence = planAttack(this.board, this.chainStart);

        if (sequence.chain.length === 0)
        {
            return { canAttack: false, reason: 'no-cards-on-board' };
        }

        return { canAttack: true, reason: null };
    }

    planAttack (): AttackSequence | null
    {
        const readiness = this.getAttackReadiness();

        if (!readiness.canAttack)
        {
            return null;
        }

        return planAttack(this.board, this.chainStart);
    }

    beginAttack (): SlotPosition | null
    {
        if (this.combat.isAttackInProgress()
            || this.enemyPhase.isEnemyTurnInProgress()
            || this.isEnemyDefeated()
            || this.isPlayerDefeated())
        {
            return null;
        }

        const chain = planAttack(this.board, this.chainStart).chain;

        if (!this.combat.beginAttack(chain.length))
        {
            return null;
        }

        CardGameEventBus.emit(CARD_GAME_EVENTS.ATTACK_STARTED, { chainStart: { ...this.chainStart } });

        return { ...this.chainStart };
    }

    emitAttackStep (stepIndex: number, sequence: AttackSequence): void
    {
        this.combat.emitAttackStep(stepIndex, sequence);
    }

    grantPlayerShield (amount: number): void
    {
        this.combat.grantPlayerShield(amount);
    }

    healPlayer (amount: number): void
    {
        this.combat.healPlayer(amount);
    }

    dealAttackDamage (
        damage: number,
        targetInstanceId?: string,
        sourceDefinitionId?: string,
        sourceBehaviorId?: string,
        sourceArrow?: import('./cardDirections').CardDirection,
    ): DamageResult
    {
        return this.combat.dealAttackDamage(
            damage,
            targetInstanceId,
            sourceDefinitionId,
            sourceBehaviorId,
            sourceArrow,
        );
    }

    completeAttack (sequence: AttackSequence): void
    {
        this.combat.completeAttack(sequence);
        this.markOnBoardExhaustedSpent();
    }

    /** After the first attack, exhaust cards stay as dead routing links until the wipe. */
    private markOnBoardExhaustedSpent (): void
    {
        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (card?.exhausted)
            {
                card.spent = true;
            }
        }
    }

    releaseAttackLock (): void
    {
        this.combat.releaseAttackLock();
    }

    hasQueuedEnemyTurn (): boolean
    {
        return this.enemyPhase.hasQueuedEnemyTurn();
    }

    hasMoreEnemyTurnsInPhase (): boolean
    {
        return this.enemyPhase.hasMoreEnemyTurnsInPhase();
    }

    prepareEnemyPhase (): EnemyTurnAction[]
    {
        return this.enemyPhase.prepareEnemyPhase();
    }

    beginEnemyTurn (): EnemyTurnAction | null
    {
        return this.enemyPhase.beginEnemyTurn();
    }

    completeSingleEnemyTurn (action: EnemyTurnAction): void
    {
        this.enemyPhase.completeSingleEnemyTurn(action);

        if (action.instanceId)
        {
            this.squad.applyPostEnemyTurnPassives(action.instanceId);
            this.trySpawnMinionAfterEnemyTurn(action.instanceId);
        }
    }

    completeEnemyPhase (): void
    {
        this.enemyPhase.completeEnemyPhase();
    }

    /** Refreshes the player between attacks in the same energy round (board persists). */
    refreshPlayerAfterMidRoundEnemy (): void
    {
        this.energyRound.refreshPlayerAfterMidRoundEnemy();
    }

    /** Starts the next energy round after the board has been cleared. */
    finishPlayerRound (): void
    {
        this.energyRound.finishPlayerRound();
    }

    finishEnemyPhase (): void
    {
        this.energyRound.finishEnemyPhase();
    }

    resolveEnemyAttack (damage: number, attackerInstanceId?: string): PlayerDamageResult
    {
        return this.combat.resolveEnemyAttack(damage, attackerInstanceId);
    }

    resolveEnemyShield (shield: number, instanceId?: string): EnemyState
    {
        return this.combat.resolveEnemyShield(shield, instanceId);
    }

    getEnemyPoison (instanceId?: string): number
    {
        return this.combat.getEnemyPoison(instanceId);
    }

    applyPoisonStacks (stacks: number, targetInstanceId?: string): number
    {
        return this.combat.applyPoisonStacks(stacks, targetInstanceId);
    }

    tickPoison (instanceId?: string): DamageResult
    {
        return this.combat.tickPoison(instanceId);
    }

    /** Places an enemy trap on a random empty slot in the last three columns, avoiding tiles next to another trap when possible. */
    placeEnemyHazard (): SlotPosition | null
    {
        return this.fieldEffects.placeEnemyHazard();
    }

    placeEnemySiphon (): SlotPosition | null
    {
        return this.fieldEffects.placeEnemySiphon();
    }

    /** Places a field boost on a random empty board slot (any row/column). */
    placeFieldBoost (): SlotPosition | null
    {
        return this.fieldEffects.placeFieldBoost();
    }

    /** Trap explosions hit the player after the chain resolves. */
    resolveHazardDamage (damage: number): PlayerDamageResult
    {
        return this.combat.resolveHazardDamage(damage);
    }

    /** Unchained leech nodes heal a living enemy (no revive if the fight is over). */
    resolveSiphonHeal (amount: number): { healed: number; targetInstanceId?: string }
    {
        return this.combat.resolveSiphonHeal(amount);
    }

    completeEnemyTurn (action: EnemyTurnAction): void
    {
        this.energyRound.completeEnemyTurn(action);
    }

    /** Clears player cards from the board at end of player round (before the enemy acts). */
    clearBoard (): void
    {
        const keepIds = this.getLatchKeepInstanceIds();
        const toDiscard: CardInstance[] = [];
        const toExhaust: CardInstance[] = [];

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (!card)
            {
                continue;
            }

            if (keepIds.has(card.instanceId))
            {
                continue;
            }

            if (isPlayerOwnedCard(card))
            {
                if (card.exhausted)
                {
                    toExhaust.push(card);
                }
                else
                {
                    toDiscard.push(card);
                }
            }

            this.board.removeCard(slot);
        }

        this.deckHand.discardToPile(toDiscard);
        this.deckHand.exhaustToPile(toExhaust);
        this.reseedLatchFromBoard();
    }

    /** Instance ids Latch Array keeps on the grid through an energy-round wipe. */
    getLatchKeepInstanceIds (): ReadonlySet<string>
    {
        if (!this.bodyMods.includes(BODY_MOD_IDS.latchArray))
        {
            return new Set();
        }

        const pinned = getLatchKeepInstanceIds(this.latchSlots);
        const onBoard = new Set<string>();

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (
                card
                && pinned.has(card.instanceId)
                && isPlayerOwnedCard(card)
                && !card.exhausted
            )
            {
                onBoard.add(card.instanceId);
            }
        }

        return onBoard;
    }

    private reseedLatchFromBoard (): void
    {
        clearLatchSlots(this.latchSlots);

        if (!this.bodyMods.includes(BODY_MOD_IDS.latchArray))
        {
            return;
        }

        for (const slot of this.board.slotsInOrder())
        {
            const card = this.board.getCardAt(slot);

            if (card && isPlayerOwnedCard(card) && !card.exhausted)
            {
                this.trackLatchPlace(card);
            }
        }
    }

    private trackLatchPlace (card: CardInstance): void
    {
        if (!this.bodyMods.includes(BODY_MOD_IDS.latchArray))
        {
            return;
        }

        const definition = getCardDefinitionOrThrow(card.definitionId);
        noteLatchPlacement(this.latchSlots, definition.behaviorId, card.instanceId);
    }

    private trackLatchRemove (card: CardInstance): void
    {
        noteLatchRemoval(this.latchSlots, card.instanceId);
    }

    cancelAttack (): void
    {
        this.combat.cancelAttack();
    }

    cancelEnemyTurn (): void
    {
        this.enemyPhase.cancelEnemyTurn();
    }

    placeCardFromHand (handIndex: number, slot: SlotPosition): boolean
    {
        const existing = this.board.getCardAt(slot);
        const placed = this.boardEdit.placeCardFromHand(handIndex, slot);

        if (placed)
        {
            if (existing)
            {
                this.trackLatchRemove(existing);
            }

            const card = this.board.getCardAt(slot);

            if (card)
            {
                this.trackLatchPlace(card);
            }
        }

        return placed;
    }

    removeCardFromBoard (slot: SlotPosition): boolean
    {
        const existing = this.board.getCardAt(slot);
        const removed = this.boardEdit.removeCardFromBoard(slot);

        if (removed && existing)
        {
            this.trackLatchRemove(existing);
        }

        return removed;
    }

    moveCardOnBoard (from: SlotPosition, to: SlotPosition): boolean
    {
        return this.boardEdit.moveCardOnBoard(from, to);
    }

    swapCardsOnBoard (a: SlotPosition, b: SlotPosition): boolean
    {
        return this.boardEdit.swapCardsOnBoard(a, b);
    }

    canEditBoard (): boolean
    {
        return this.boardEdit.canEditBoard();
    }
}
