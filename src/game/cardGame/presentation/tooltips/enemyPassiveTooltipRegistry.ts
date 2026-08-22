import { passiveLabel, poisonStatusNameLower } from '../../../copy/strings';
import type { EnemyPassiveConfig } from '../../enemyPassives/types';
import { getCardGameEnemyDefinition } from '../../config/enemyCatalog';

export interface EnemyPassiveTooltipContent {
    title: string;
    lines: string[];
}

const percent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

const enemyLabel = (definitionId: string): string =>
    getCardGameEnemyDefinition(definitionId)?.label ?? definitionId;
export const resolveEnemyPassiveTooltip = (
    passive: EnemyPassiveConfig,
): EnemyPassiveTooltipContent =>
{
    switch (passive.id)
    {
        case 'thorns':
            return {
                title: passiveLabel('thorns'),
                lines: [
                    `Whenever you hit with an Attack card, take ${passive.reflectDamage} damage (blockable).`,
                ],
            };
        case 'enrage':
            return {
                title: passiveLabel('enrage'),
                lines: [
                    'Traps still explode at the end of your turn if left undisarmed.',
                    `Each undisarmed trap adds +${passive.attackBonusPerTrap} attack on the enemy's next turn.`,
                    passive.extraTrapsPerTrap > 0
                        ? `Also places +${passive.extraTrapsPerTrap} extra trap(s) per undisarmed trap next turn.`
                        : 'Does not add extra traps unless configured.',
                ].filter((line) => line !== 'Does not add extra traps unless configured.'),
            };
        case 'lastStand':
            return {
                title: passiveLabel('lastStand'),
                lines: [
                    `Activates at ${percent(passive.healthRatio)} HP or below.`,
                    passive.forceAttack
                        ? `Always attacks for ${passive.attackDamage} and places ${passive.hazardsPerTurn} trap(s).`
                        : `Fights with ${passive.attackDamage} attack / ${passive.shieldGain} shield and ${passive.hazardsPerTurn} trap(s).`,
                ],
            };
        case 'smoke':
            return {
                title: passiveLabel('smoke'),
                lines: [
                    `The first ${passive.suppressedPoisonCards} ${poisonStatusNameLower()} card(s) in your chain each attack deal no ${poisonStatusNameLower()} trail damage.`,
                ],
            };
        case 'wetBlanket':
            return {
                title: passiveLabel('wetBlanket'),
                lines: [
                    `Fire alternation bonus is ×${passive.fireAlternationMultiplier} while the enemy has shield.`,
                ],
            };
        case 'silenceTile':
            return {
                title: passiveLabel('silenceTile'),
                lines: [
                    `Places ${passive.tilesPerTurn} muted tile(s) after each enemy turn.`,
                    'You cannot place or move cards onto muted tiles.',
                ],
            };
        case 'jammer':
            return {
                title: passiveLabel('jammer'),
                lines: [
                    `If your chain has ${passive.minChainLength}+ cards, the enemy gains ${passive.shieldGain} shield after your turn.`,
                ],
            };
        case 'escalate':
            return {
                title: passiveLabel('escalate'),
                lines: [
                    `After every turn, the enemy places +${passive.trapsPerRamp} more trap(s) on its next turn.`,
                    `Ramps up to a maximum of ${passive.maxTraps} traps per turn.`,
                ],
            };
        case 'dampenTiles':
            return {
                title: passiveLabel('dampenTiles'),
                lines: [
                    `Every ${passive.everyTurns} turn(s), the enemy casts a field that weakens ${passive.parity} tiles (checkerboard).`,
                    `Cards on weakened tiles deal ${percent(passive.multiplier)} of their damage and armor for ${passive.duration} turn(s).`,
                    'Route your chain through the live tiles to hit full strength.',
                ],
            };
        case 'curseHand':
            return {
                title: passiveLabel('curseHand'),
                lines: [
                    `After each enemy turn, adds ${passive.count} ${passive.cardId} card(s) to your hand.`,
                    'Curse cards clog your hand and may hurt you if held at end of turn.',
                ],
            };
        case 'pressureColumn':
            return {
                title: passiveLabel('pressureColumn'),
                lines: [
                    'After each of its turns, locks one board column.',
                    'You cannot place or move cards onto the locked column.',
                    passive.avoidStartColumn
                        ? 'Never locks the chain-start column.'
                        : 'Any column may be locked.',
                    'The lock is telegraphed in the enemy intent.',
                ],
            };
        case 'nullifyLane':
            return {
                title: passiveLabel('nullifyLane'),
                lines: [
                    'After each of its turns, nullifies one board column or row.',
                    'Cards can still be placed on the strip, but deal no damage, grant no armor, and fire no step effects.',
                    passive.axes === 'column'
                        ? 'Only columns are targeted.'
                        : passive.axes === 'row'
                            ? 'Only rows are targeted.'
                            : 'May target a column or a row.',
                    passive.avoidStartColumn
                        ? 'Never nullifies the chain-start column.'
                        : 'The chain-start column may be nullified.',
                    'The strip is telegraphed in the enemy intent.',
                ],
            };
        case 'spawnMinion':
            return {
                title: passiveLabel('spawnMinion'),
                lines: [
                    `Deploys a ${enemyLabel(passive.minionId)} when under the living-minion cap (${passive.maxLivingMinions}).`,
                    `Cadence: every ${passive.everyTurns} of this host's turns.`,
                    passive.healthRatio !== undefined
                        ? `Also spawns at ${Math.round(passive.healthRatio * 100)}% HP or below if no minion is alive.`
                        : 'No low-HP emergency spawn.',
                ].filter((line) => line !== 'No low-HP emergency spawn.'),
            };
        case 'shatterOnDeath':
            return {
                title: passiveLabel('shatterOnDeath'),
                lines: [
                    'When killed, this chassis breaks into separate hostiles.',
                    `Parts: ${passive.parts.map(enemyLabel).join(', ')}.`,
                    'Finish the pieces — the fight is not over when the frame drops.',
                ],
            };
        case 'credLeech':
            return {
                title: passiveLabel('credLeech'),
                lines: [
                    `Steals ${passive.amountPerTurn} cred(s) from your run wallet after each of its turns.`,
                    'Kill it fast or arrive at the Ripperdoc broke.',
                ],
            };
        case 'rerollTax':
            return {
                title: passiveLabel('rerollTax'),
                lines: [
                    `Each hand reroll adds +${passive.attackBonus} attack on its next turn.`,
                    passive.extraTraps > 0
                        ? `Also queues +${passive.extraTraps} extra trap(s) on the next turn.`
                        : 'Does not add extra traps.',
                ].filter((line) => line !== 'Does not add extra traps.'),
            };
        case 'cardThief':
            return {
                title: passiveLabel('cardThief'),
                lines: [
                    'Steals a random card from your draw pile on its first turn.',
                    `Escapes after ${passive.fleeAfterTurns} turns — stolen cards are lost if it gets away.`,
                    'Kill it before it flees to recover the card.',
                ],
            };
        case 'skillJam':
            return {
                title: passiveLabel('skillJam'),
                lines: [
                    `The first ${passive.suppressedSkillCards} skill card(s) in each chain have their abilities negated.`,
                    'Attacks and defends still resolve normally.',
                ],
            };
        case 'linkRage':
            return {
                title: passiveLabel('linkRage'),
                lines: [
                    `When its partner dies, gains +${passive.attackBonus} attack on the next turn.`,
                    passive.extraTraps > 0
                        ? `Also places +${passive.extraTraps} extra trap(s) that turn.`
                        : 'No extra traps.',
                ].filter((line) => line !== 'No extra traps.'),
            };
        case 'bodyguard':
            return {
                title: passiveLabel('bodyguard'),
                lines: [
                    `Redirects the first hit of each attack aimed at ${enemyLabel(passive.protectDefinitionId)}.`,
                    'Break the runner or focus the glass cannon through the guard.',
                ],
            };
        case 'stutterClock':
            return {
                title: passiveLabel('stutterClock'),
                lines: [
                    `Every ${passive.everyGlobalTurns} enemy phase(s), its combat step executes twice (telegraphed).`,
                ],
            };
        case 'phantomIntent':
            return {
                title: passiveLabel('phantomIntent'),
                lines: [
                    'Telegraphs both attack and shield — only one is real each turn.',
                    'Watch which step actually fires.',
                ],
            };
        case 'phaseShift':
            return {
                title: passive.label,
                lines: [
                    passive.message,
                    `Triggers below ${Math.round(passive.healthRatio * 100)}% integrity: +${passive.attackBonus} attack, +${passive.extraTraps} trap(s).`,
                ],
            };
        case 'handRedirect':
            return {
                title: passiveLabel('handRedirect'),
                lines: [
                    `Every ${passive.everyTurns} turn(s), scrambles the arrows on cards in your hand.`,
                    'Lasts for the rest of that energy round — arrows restore when energy refills.',
                    'Reroute cards keep their wild direction pick.',
                ],
            };
        case 'siphonNode':
            return {
                title: passiveLabel('siphonNode'),
                lines: [
                    `Places ${passive.nodesPerTurn} leech node(s) after each turn.`,
                    'Route through a node to shut it off. Leave it off-chain and the enemy drinks its power as integrity.',
                ],
            };
    }
};
