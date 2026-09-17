export interface BuyEvent {
  txHash: string;
  chain: string;
  tokenAddress: string;
  buyerAddress: string;
  amountTokens: number;
  tokenSymbol: string;
  amountBase: number;
  baseSymbol: string;
  amountUsd: number;
  marketCapUsd?: number;
  priceChange24h?: number;
  blockNumber?: bigint;
  timestamp: number;
}

export interface MarketData {
  priceUsd: number;
  marketCapUsd: number;
  priceChange24h: number;
  baseTokenSymbol: string;
  quoteTokenSymbol: string;
  pairAddress: string;
}
