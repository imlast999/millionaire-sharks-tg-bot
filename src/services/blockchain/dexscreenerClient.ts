import axios from "axios";
import { MarketData } from "./types.js";
import { config } from "../../config/index.js";

export class DexScreenerClient {
  private baseUrl = "https://api.dexscreener.com/latest/dex";

  /**
   * Fetches latest market data for the configured token or pair.
   * Gracefully returns null if the pair is not yet live or during temporary API outages.
   */
  public async getMarketData(
    tokenAddress: string = config.TOKEN_CONTRACT_ADDRESS,
    pairAddress: string = config.DEX_PAIR_ADDRESS
  ): Promise<MarketData | null> {
    try {
      // If zero address (pre-launch placeholder), return mock pre-launch market data or null
      if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
        return null;
      }

      // First attempt query by pair address if provided
      if (pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000") {
        const pairResp = await axios.get(`${this.baseUrl}/pairs/${config.CHAIN_NAME.toLowerCase()}/${pairAddress}`, {
          timeout: 5000,
        });
        if (pairResp.data?.pair) {
          const p = pairResp.data.pair;
          return {
            priceUsd: parseFloat(p.priceUsd || "0"),
            marketCapUsd: parseFloat(p.marketCap || p.fdv || "0"),
            priceChange24h: parseFloat(p.priceChange?.h24 || "0"),
            baseTokenSymbol: p.baseToken?.symbol || config.TOKEN_SYMBOL,
            quoteTokenSymbol: p.quoteToken?.symbol || "WETH",
            pairAddress: p.pairAddress,
          };
        }
      }

      // Fallback: query by token address
      const tokenResp = await axios.get(`${this.baseUrl}/tokens/${tokenAddress}`, {
        timeout: 5000,
      });

      if (tokenResp.data?.pairs && tokenResp.data.pairs.length > 0) {
        // Pick pair with highest liquidity
        const bestPair = tokenResp.data.pairs.sort(
          (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];

        return {
          priceUsd: parseFloat(bestPair.priceUsd || "0"),
          marketCapUsd: parseFloat(bestPair.marketCap || bestPair.fdv || "0"),
          priceChange24h: parseFloat(bestPair.priceChange?.h24 || "0"),
          baseTokenSymbol: bestPair.baseToken?.symbol || config.TOKEN_SYMBOL,
          quoteTokenSymbol: bestPair.quoteToken?.symbol || "WETH",
          pairAddress: bestPair.pairAddress,
        };
      }

      return null;
    } catch (error: any) {
      // Log warning without crashing
      console.warn(`[DexScreenerClient] Market data lookup failed: ${error.message}`);
      return null;
    }
  }
}

export const dexScreenerClient = new DexScreenerClient();
