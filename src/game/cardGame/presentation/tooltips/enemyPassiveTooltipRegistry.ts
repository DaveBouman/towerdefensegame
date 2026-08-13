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
                title: 'Thorns',
                lines: [
                    `Whenever you hit with an Attack card, take ${passive.reflectDamage} damage (blockable).`,
                ],
            };
        case 'enrage':
            return {
                title: 'Enrage',
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
                title: 'Last Stand',
                lines: [
                    `Activates at ${percent(passive.healthRatio)} HP or below.`,
                    passive.forceAttack
                        ? `Always attacks for ${passive.attackDamage} and places ${passive.hazardsPerTurn} trap(s).`
                        : `Fights with ${passive.attackDamage} attack / ${passive.shieldGain} shield and ${passive.hazardsPerTurn} trap(s).`,
                ],
            };
        case 'smoke':
            return {
                title: 'Smoke',
                lines: [
                    `The first ${passive.suppressedPoisonCards} poison card(s) in your chain each attack deal no poison trail damage.`,
                ],
            };
        case 'wetBlanket':
            return {
                title: 'Wet Blanket',
                lines: [
                    `Fire alternation bonus is ×${passive.fireAlternationMultiplier} while the enemy has shield.`,
                ],
            };
        case 'silenceTile':
            return {
                title: 'Silence Tile',
                lines: [
                    `Places ${passive.tilesPerTurn} muted tile(s) after each enemy turn.`,
                    'You cannot place or move cards onto muted tiles.',
                ],
            };
        case 'loopHunter':
            return {
                title: 'Loop Hunter',
                lines: [
                    `Deals ${passive.damage} damage to you if your chain includes a Loop card.`,
                ],
            };
        case 'jammer':
            return {
                title: 'Jammer',
                lines: [
                    `If your chain has ${passive.minChainLength}+ cards, the enemy gains ${passive.shieldGain} shield after your turn.`,
                ],
            };
        case 'escalate':
            return {
                title: 'Escalate',
                lines: [
                    `After every turn, the enemy places +${passive.trapsPerRamp} more trap(s) on its next turn.`,
                    `Ramps up to a maximum of ${passive.maxTraps} traps per turn.`,
                ],
            };
        case 'dampenTiles':
            return {
                title: 'Dead Zone',
                lines: [
                    `Every ${passive.everyTurns} turn(s), the enemy casts a field that weakens ${passive.parity} tiles (checkerboard).`,
                    `Cards on weakened tiles deal ${percent(passive.multiplier)} of their damage and armor for ${passive.duration} turn(s).`,
                    'Route your chain through the live tiles to hit full strength.',
                ],
            };
        case 'curseHand':
            return {
                title: 'Curse Hand',
                lines: [
                    `After each enemy turn, adds ${passive.count} ${passive.cardId} card(s) to your hand.`,
                    'Curse cards clog your hand and may hurt you if held at end of turn.',
                ],
            };
        case 'pressureColumn':
            return {
                title: 'Column Pressure',
                lines: [
                    'After each of its turns, locks one board column.',
                    'You cannot place or move cards onto the locked column.',
                    passive.avoidStartColumn
                        ? 'Never locks the chain-start column.'
                        : 'Any column may be locked.',
                    'The lock is telegraphed in the enemy intent.',
                ],
            };
        case 'spawnMinion':
            return {
                title: 'Spawn',
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
                title: 'Shatter',
                lines: [
                    'When killed, this chassis breaks into separate hostiles.',
                    `Parts: ${passive.parts.map(enemyLabel).join(', ')}.`,
                    'Finish the pieces — the fight is not over when the frame drops.',
                ],
            };
        case 'credLeech':
            return {
                title: 'Cred Leech',
                lines: [
                    `Steals ${passive.amountPerTurn} cred(s) from your run wallet after each of its turns.`,
                    'Kill it fast or arrive at the Ripperdoc broke.',
                ],
            };
        case 'rerollTax':
            return {
                title: 'Reroll Tax',
                lines: [
                    `Each hand reroll adds +${passive.attackBonus} attack on its next turn.`,
                    passive.extraTraps > 0
                        ? `Also queues +${passive.extraTraps} extra trap(s) on the next turn.`
                        : 'Does not add extra traps.',
                ].filter((line) => line !== 'Does not add extra traps.'),
            };
        case 'cardThief':
            return {
                title: 'Card Thief',
                lines: [
                    'Steals a random card from your draw pile on its first turn.',
                    `Escapes after ${passive.fleeAfterTurns} turns — stolen cards are lost if it gets away.`,
                    'Kill it before it flees to recover the card.',
                ],
            };
        case 'skillJam':
            return {
                title: 'Skill Jam',
                lines: [
                    `The first ${passive.suppressedSkillCards} skill card(s) in each chain have their abilities negated.`,
                    'Attacks and defends still resolve normally.',
                ],
            };
        case 'linkRage':
            return {
                title: 'Link Rage',
                lines: [
                    `When its partner dies, gains +${passive.attackBonus} attack on the next turn.`,
                    passive.extraTraps > 0
                        ? `Also places +${passive.extraTraps} extra trap(s) that turn.`
                        : 'No extra traps.',
                ].filter((line) => line !== 'No extra traps.'),
            };
        case 'bodyguard':
            return {
                title: 'Bodyguard',
                lines: [
                    `Redirects the first hit of each attack aimed at ${enemyLabel(passive.protectDefinitionId)}.`,
                    'Break the runner or focus the glass cannon through the guard.',
                ],
            };
        case 'stutterClock':
            return {
                title: 'Stutter Clock',
                lines: [
                    `Every ${passive.everyGlobalTurns} enemy phase(s), its combat step executes twice (telegraphed).`,
                ],
            };
        case 'phantomIntent':
            return {
                title: 'Phantom Intent',
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
                title: 'Signal Twist',
                lines: [
                    `Every ${passive.everyTurns} turn(s), scrambles the arrows on cards in your hand.`,
                    'Lasts for the rest of that energy round — arrows restore when energy refills.',
                    'Reroute cards keep their wild direction pick.',
                ],
            };
        case 'siphonNode':
            return {
                title: 'Leech Nodes',
                lines: [
                    `Places ${passive.nodesPerTurn} leech node(s) after each turn.`,
                    'Route through a node to shut it off. Leave it off-chain and the enemy drinks its power as integrity.',
                ],
            };
    }
};
