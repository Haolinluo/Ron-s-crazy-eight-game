import { Suit, Rank, Card } from './types';

export const SUITS = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
export const RANKS = [
  Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE,
  Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN,
  Rank.JACK, Rank.QUEEN, Rank.KING
];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
        isFaceUp: false,
      });
    });
  });
  return shuffle(deck);
};

export const shuffle = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const isPlayable = (card: Card, topCard: Card, wildSuit: Suit | null): boolean => {
  if (card.rank === Rank.EIGHT) return true;
  
  const targetSuit = wildSuit || topCard.suit;
  return card.suit === targetSuit || card.rank === topCard.rank;
};

export const getSuitColor = (suit: Suit): string => {
  switch (suit) {
    case Suit.HEARTS:
    case Suit.DIAMONDS:
      return 'text-red-600';
    case Suit.CLUBS:
    case Suit.SPADES:
      return 'text-slate-900';
    default:
      return 'text-gray-900';
  }
};

export const getSuitSymbol = (suit: Suit): string => {
  switch (suit) {
    case Suit.HEARTS: return '♥';
    case Suit.DIAMONDS: return '♦';
    case Suit.CLUBS: return '♣';
    case Suit.SPADES: return '♠';
    default: return '';
  }
};
