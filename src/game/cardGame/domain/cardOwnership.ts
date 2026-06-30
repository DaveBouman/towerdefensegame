import type { CardInstance, CardOwner } from './types';

export const isEnemyOwnedCard = (card: CardInstance): boolean =>
    card.owner === 'enemy';

export const isFieldOwnedCard = (card: CardInstance): boolean =>
    card.owner === 'field';

export const isPlayerOwnedCard = (card: CardInstance): boolean =>
    !card.owner || card.owner === 'player';

export const withCardOwner = (card: CardInstance, owner: CardOwner): CardInstance =>
    ({ ...card, owner });
