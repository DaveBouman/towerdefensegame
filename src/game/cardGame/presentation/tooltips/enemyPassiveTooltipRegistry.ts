import type { EnemyPassiveConfig } from '../../enemyPassives/types';

export interface EnemyPassiveTooltipContent {
    title: string;
    lines: string[];
}

const percent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

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
                    `Reflects ${passive.reflectDamage} damage to you when you deal damage while the enemy has shield.`,
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
    }
};
