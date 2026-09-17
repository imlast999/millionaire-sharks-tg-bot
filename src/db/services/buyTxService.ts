import { prisma } from "../client.js";
import { BuyTransaction } from "@prisma/client";

export interface RecordBuyTxParams {
  txHash: string;
  chain: string;
  tokenAddress: string;
  buyerAddress: string;
  amountTokens: string;
  amountBase: string;
  amountUsd: number;
  marketCapUsd?: number;
  priceChange24h?: number;
  blockNumber?: bigint;
}

/**
 * Checks if a transaction has already been recorded and notified.
 */
export async function isTxAlreadyRecorded(txHash: string): Promise<boolean> {
  const existing = await prisma.buyTransaction.findUnique({
    where: { txHash: txHash.toLowerCase() },
  });
  return !!existing;
}

/**
 * Records a new buy transaction to prevent duplicate Telegram notifications.
 */
export async function recordBuyTransaction(params: RecordBuyTxParams): Promise<BuyTransaction> {
  return prisma.buyTransaction.create({
    data: {
      txHash: params.txHash.toLowerCase(),
      chain: params.chain,
      tokenAddress: params.tokenAddress.toLowerCase(),
      buyerAddress: params.buyerAddress.toLowerCase(),
      amountTokens: params.amountTokens,
      amountBase: params.amountBase,
      amountUsd: params.amountUsd,
      marketCapUsd: params.marketCapUsd,
      priceChange24h: params.priceChange24h,
      blockNumber: params.blockNumber,
    },
  });
}
