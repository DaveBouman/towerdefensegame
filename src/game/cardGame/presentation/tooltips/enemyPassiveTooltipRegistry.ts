import type { EnemyPassiveConfig } from '../../enemyPassives/types';

export interface EnemyPassiveTooltipContent {
    title: string;
    lines: string[];
}

export const ENEMY_PASSIVE_GLYPH: Record<EnemyPassiveConfig['id'], string> = {
    thorns: '⚡',
    enrage: '💢',
    lastStand: '☠',
    smoke: '💨',
    wetBlanket: '💧',
    silenceTile: '🔇',
    loopHunter: '↺',
    jammer: '📡',
};

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
    }
};
