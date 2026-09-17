import crypto from "node:crypto";

export type CardSuit = "♠️" | "♥️" | "♦️" | "♣️";
export type CardRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  suit: CardSuit;
  rank: CardRank;
}

export interface BlackjackState {
  playerHand: Card[];
  dealerHand: Card[];
  deck: Card[];
  wager: string; // BigInt serialized
  isGameOver: boolean;
  outcome?: "WIN" | "LOSS" | "PUSH" | "BLACKJACK";
  payoutMultiplier?: number;
}

const SUITS: CardSuit[] = ["♠️", "♥️", "♦️", "♣️"];
const RANKS: CardRank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/**
 * Creates and shuffles a fresh 52-card deck using cryptographically secure randomness.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Calculates hand total, properly reducing Aces from 11 to 1 when needed.
 */
export function calculateHandValue(hand: Card[]): { total: number; isSoft: boolean } {
  let total = 0;
  let aceCount = 0;

  for (const card of hand) {
    if (card.rank === "A") {
      aceCount += 1;
      total += 11;
    } else if (["K", "Q", "J", "10"].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank, 10);
    }
  }

  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount -= 1;
  }

  return { total, isSoft: aceCount > 0 };
}

/**
 * Checks if a 2-card hand is a Natural Blackjack (21).
 */
export function isNaturalBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && calculateHandValue(hand).total === 21;
}

/**
 * Formats a card into a display string (e.g. `[10♠️]`).
 */
export function formatCard(card: Card): string {
  return `[${card.rank}${card.suit}]`;
}

/**
 * Formats a hand of cards.
 */
export function formatHand(hand: Card[], hideSecondCard = false): string {
  if (hideSecondCard && hand.length >= 2) {
    return `${formatCard(hand[0])} [🂠]`;
  }
  return hand.map(formatCard).join(" ");
}

/**
 * Starts a new Blackjack game, dealing 2 cards to player and 2 cards to dealer.
 */
export function dealNewGame(wager: bigint): BlackjackState {
  const deck = createDeck();
  const playerHand = [deck.pop()!, deck.pop()!];
  const dealerHand = [deck.pop()!, deck.pop()!];

  const playerHasBJ = isNaturalBlackjack(playerHand);
  const dealerHasBJ = isNaturalBlackjack(dealerHand);

  if (playerHasBJ && dealerHasBJ) {
    return {
      playerHand,
      dealerHand,
      deck,
      wager: wager.toString(),
      isGameOver: true,
      outcome: "PUSH",
      payoutMultiplier: 1.0,
    };
  } else if (playerHasBJ) {
    return {
      playerHand,
      dealerHand,
      deck,
      wager: wager.toString(),
      isGameOver: true,
      outcome: "BLACKJACK",
      payoutMultiplier: 2.5, // 3:2 blackjack payout (original wager + 1.5x profit)
    };
  } else if (dealerHasBJ) {
    return {
      playerHand,
      dealerHand,
      deck,
      wager: wager.toString(),
      isGameOver: true,
      outcome: "LOSS",
      payoutMultiplier: 0,
    };
  }

  return {
    playerHand,
    dealerHand,
    deck,
    wager: wager.toString(),
    isGameOver: false,
  };
}

/**
 * Player action: Hit (draws one card).
 */
export function hit(state: BlackjackState): BlackjackState {
  if (state.isGameOver) return state;

  const card = state.deck.pop();
  if (!card) return state;

  state.playerHand.push(card);
  const { total } = calculateHandValue(state.playerHand);

  if (total > 21) {
    // Player Busts
    state.isGameOver = true;
    state.outcome = "LOSS";
    state.payoutMultiplier = 0;
  }

  return state;
}

/**
 * Player action: Stand (dealer plays according to casino rules: hits up to 16, stands on 17+).
 */
export function stand(state: BlackjackState): BlackjackState {
  if (state.isGameOver) return state;

  state.isGameOver = true;
  const playerTotal = calculateHandValue(state.playerHand).total;

  let dealerVal = calculateHandValue(state.dealerHand).total;
  while (dealerVal < 17 && state.deck.length > 0) {
    state.dealerHand.push(state.deck.pop()!);
    dealerVal = calculateHandValue(state.dealerHand).total;
  }

  if (dealerVal > 21) {
    // Dealer busts, player wins
    state.outcome = "WIN";
    state.payoutMultiplier = 2.0;
  } else if (playerTotal > dealerVal) {
    state.outcome = "WIN";
    state.payoutMultiplier = 2.0;
  } else if (playerTotal === dealerVal) {
    state.outcome = "PUSH";
    state.payoutMultiplier = 1.0;
  } else {
    state.outcome = "LOSS";
    state.payoutMultiplier = 0;
  }

  return state;
}
