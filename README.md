# 🦈 Millionaire Sharks — All-in-One Telegram Community Bot

> **A single, enterprise-grade, modular Telegram community bot built for the Millionaire Sharks ecosystem.**

The bot is designed as a complete digital syndicate and community ecosystem. All planned features exist in the codebase from day one, controlled through a centralized feature flag system:
- **Phase 1 (Active by default)**: **Buy Bot** & **Welcome / Goodbye / Ban Bot**.
- **Phase 2 (Fully prepared & integrated, disabled by default)**: **Daily Shark Points**, **Shark Points Casino** (Dice, Coin Flip, interactive Blackjack), **Leaderboard & Rank**, and **Telegram Giveaways**.
- **One-Signal Activation**: All Phase 2 features can be activated immediately via a single CLI command (`npm run features:enable-all`) or runtime Telegram admin command (`/admin activate_all`) without rewriting or restructuring code.

---

## 🏛️ System Architecture

```
millionaire-sharks-tg-bot/
├── prisma/
│   └── schema.prisma            # Persistent database schema & indexes
├── scripts/
│   ├── activateAllFeatures.ts   # One-signal CLI activation of all Phase 2 features
│   ├── resetToDayOne.ts         # Revert flags back to Day One configuration
│   ├── statusFeatures.ts        # Inspect current feature flag status
│   └── simulateBuy.ts           # Interactive simulator for Buy Bot events
├── src/
│   ├── bot/
│   │   ├── bot.ts               # Telegram bot factory & rate-limiter
│   │   ├── middleware/
│   │   │   ├── auth.ts          # Telegram user ID allowlist security guard
│   │   │   ├── featureGuard.ts  # Dynamic feature flag interceptor
│   │   │   └── errorHandler.ts  # Global exception handling
│   │   └── handlers/
│   │       ├── welcomeGoodbyeHandler.ts  # Join / Leave / Ban greeting system
│   │       ├── dailyHandler.ts           # /daily 24h reward system
│   │       ├── casinoHandler.ts          # /casino, /dice, /flip, /blackjack
│   │       ├── leaderboardHandler.ts     # /leaderboard, /rank
│   │       ├── giveawayHandler.ts        # /giveaway creation, entry & draw
│   │       └── adminHandler.ts           # /admin control panel & flag toggles
│   ├── config/
│   │   └── index.ts             # Zod-validated environment config & branding
│   ├── db/
│   │   ├── client.ts            # Prisma client singleton (SQLite/PostgreSQL)
│   │   └── services/
│   │       ├── userService.ts         # User profiles & atomic balance engine
│   │       ├── casinoService.ts       # Casino wager & outcome persistence
│   │       ├── giveawayService.ts     # Giveaways, participants & winner draw
│   │       ├── buyTxService.ts        # Buy tx deduplication & persistence
│   │       ├── featureFlagService.ts  # Cached DB feature flag service
│   │       └── auditService.ts        # Auditable admin log tracker
│   ├── features/
│   │   ├── featureManager.ts    # Centralized feature orchestrator & checks
│   │   └── types.ts             # Feature keys & metadata definitions
│   ├── services/
│   │   ├── blockchain/
│   │   │   ├── buyMonitor.ts          # Buy monitoring & threshold filtering
│   │   │   ├── dexscreenerClient.ts   # Real-time DEX market data client
│   │   │   ├── messageFormatter.ts    # Luxury brand message layout
│   │   │   └── types.ts               # Event & market data contracts
│   │   └── casino/
│   │       ├── blackjackEngine.ts     # Full 52-card Blackjack logic
│   │       ├── diceEngine.ts          # Cryptographically random dice rolls
│   │       └── coinflipEngine.ts      # 50/50 virtual coin toss logic
│   └── index.ts                 # Production server entrypoint
└── tests/                       # Vitest automated test suite (20 tests)
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js v20+ or v22+
- `pnpm` (or `npm`)

### 2. Installation
```bash
# Clone the repository
cd "millionaire sharks tg bot"

# Install dependencies
pnpm install # or npm install
```

### 3. Environment Configuration
Copy the `.env.example` file to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Key environment variables:
| Variable | Description | Default |
| :--- | :--- | :--- |
| `BOT_TOKEN` | Telegram Bot Token from [@BotFather](https://t.me/botfather) | `Required` |
| `COMMUNITY_CHAT_ID` | Telegram Group ID (e.g. `-100...`) | `-1001234567890` |
| `ADMIN_USER_IDS` | Comma-separated Telegram User IDs for Admin privileges | `123456789` |
| `DATABASE_URL` | SQLite or PostgreSQL connection string | `file:./data/millionaire_sharks.db` |
| `BUY_BOT_MIN_USD` | Minimum purchase value to alert the group | `10` |
| `TOKEN_CONTRACT_ADDRESS`| Token contract address | `0x0000...` |
| `DEX_PAIR_ADDRESS` | Primary DEX pool address | `0x0000...` |
| `CHAIN_NAME` | Target blockchain name | `Robinhood` |
| `CHAIN_RPC_URL` | RPC endpoint URL | `https://rpc.mainnet.chain.robinhood.com` |
| `CHAIN_EXPLORER_URL` | Block explorer URL | `https://robinhoodchain.blockscout.com` |
| `DEX_CHART_URL` | DexScreener or GeckoTerminal chart link | `https://dexscreener.com/robinhood` |
| `DEX_TRADE_URL` | Trading page URL | `https://robinhood.com/crypto` |
| `OFFICIAL_WEBSITE` | Project website | `https://millionairesharks.com` |
| `OFFICIAL_X` | Official X / Twitter account | `https://x.com/MillionaireSharks` |

### 4. Initialize Database
Initialize the persistent SQLite database and generate the Prisma Client:
```bash
pnpm run db:push
```

### 5. Run the Bot
```bash
# Development (with hot-reload)
pnpm run dev

# Production
pnpm run build
pnpm run start
```

---

## 🦈 Phase 1: Day One Features (Active by Default)

### 1. Buy Bot
- **Real-Time Purchase Tracking**: Monitors token purchases on the configured chain (Robinhood, Base, Ethereum, Solana, etc.).
- **Threshold Gating**: Ignores buys below the configurable minimum (default: `$10.00 USD`).
- **USD Conversion & Metrics**: Displays base currency spent (ETH/WETH), tokens purchased, real-time market cap, and 24-hour price change.
- **Dynamic Intensity**: Visual shark and fire animations scale with purchase volume (from 🔥🔥🔥 to 💎💎💎 🦈🦈🦈 👑👑👑).
- **Deduplication Engine**: Uses unique transaction hash indexes in the database to prevent duplicate alerts.
- **Clickable Links**: Direct links to Explorer TX, Chart, Trade page, Official Website, and X.

### 2. Welcome, Goodbye & Ban Moderation Bot
- **Join Messages**: Randomly selected from a pool of **12 luxury welcome variations**.
- **Leave Messages**: Randomly selected from a pool of **5 respectful departure variations**.
- **Ban Messages**: Randomly selected from a pool of **5 playful security variations**.
- **Privacy & Safety**: Handles group permission updates gracefully and sanitizes Telegram display names.

---

## 🔒 Phase 2: Prepared Features (Disabled by Default)

The following features are completely implemented and integrated into the bot, but gated behind centralized feature flags:

### 3. Daily Shark (`/daily`)
- Allows members to claim between **50 and 1,000 Shark Points** every 24 hours.
- Enforces strict UTC timestamps and displays the exact time remaining if already claimed.
- Uses atomic database transactions to ensure accurate point balances.

### 4. Shark Points Casino (`/casino`)
Virtual points-only entertainment lounge:
- **Dice** (`/dice <wager>`): Rolls a virtual 6-sided die with configurable multipliers.
- **Coin Flip** (`/flip <wager> <heads|tails>`): Flips a gold shark coin with 50/50 odds.
- **Blackjack** (`/blackjack <wager>`): Complete interactive Blackjack with inline buttons:
  - Supports `[🃏 Hit]` and `[🛑 Stand]`.
  - Calculates Soft and Hard Ace hands.
  - Natural Blackjack pays 3:2.
  - Dealer hits up to 16 and stands on 17+.
  - Server-side balance checks prevent negative balances and double-spend attempts.

### 5. Shark Points Leaderboard (`/leaderboard` & `/rank`)
- `/leaderboard`: Displays top 10 community sharks ranked by Shark Points with trophies and safe usernames.
- `/rank`: Allows any member to check their current rank position and balance.

### 6. Telegram Giveaways (`/giveaway`)
- **Admin Creation**: `/giveaway create <Prize> | <WinnersCount> | <DurationMinutes> | [MinSharkPoints]`
- **Interactive Button**: Displays `[🎁 Enter Giveaway]` inline button.
- **Anti-Abuse**: Prevents duplicate entries and verifies minimum Shark Point requirements.
- **Cryptographic Draw**: Uses `crypto.randomInt` to draw winners fairly and announce them in the group.

---

## ⚡ Centralized Feature Activation

### How to Activate All Features with One Signal
When the Millionaire Sharks token launches and you are ready to enable all features, you can trigger activation via **either method**:

#### Option A: Terminal / CLI Signal
Run the single command:
```bash
pnpm run features:enable-all
```
This runs pre-flight validation checks, confirms database connectivity and schema integrity, enables all Phase 2 features, and outputs a full activation report.

#### Option B: In-Telegram Admin Command
In the Telegram chat with the bot, an authorized admin can simply type:
```
/admin activate_all
```

#### Check Current Status
To inspect the status of all feature flags:
```bash
pnpm run features:status
```

#### Revert to Day One (if needed)
```bash
pnpm run features:reset-day-one
```

---

## 🛡️ Admin & Security

Administrative commands are restricted to the `ADMIN_USER_IDS` allowlist:
- `/admin`: Overview dashboard and system status.
- `/admin flags`: View and toggle individual feature flags.
- `/admin toggle <key>`: Toggle an individual flag (`daily_shark`, `casino`, etc.).
- `/admin activate_all`: One-click activation of all Phase 2 features.
- `/admin threshold <usd>`: Dynamically update the minimum Buy Bot alert threshold.
- `/admin points <userId> <amount>`: Adjust user Shark Points (records auditable log).
- `/admin stats`: Live community statistics (users, points, games, buys, giveaways).

---

## 🧪 Testing & Verification

Run the comprehensive Vitest test suite:
```bash
pnpm test
```
**Results (100% Pass Rate)**:
- `tests/buyBot.test.ts`: Minimum threshold filtering, message formatting, deduplication.
- `tests/welcomeGoodbye.test.ts`: Pool size validations (10+ welcome, 5+ goodbye, 5+ ban).
- `tests/daily.test.ts`: Random points bounds (50-1000) and 24h cooldown.
- `tests/casino.test.ts`: Balance protection, Dice, Coinflip, and full Blackjack rules.
- `tests/giveaway.test.ts`: Registration, point gating, duplicate rejection, and winner selection.
- `tests/featureFlags.test.ts`: Toggling, pre-flight checks, and bulk activation.

### Test Buy Simulator
Test live buy notifications without waiting for on-chain transactions:
```bash
pnpm run simulate:buy
```
Tests:
1. Purchase < $10 ($4.50 USD) -> Filtered out.
2. Purchase >= $10 ($85.50 USD) -> Formatted, attaches random shark media, and sends to group.
3. Duplicate transaction -> Rejected by deduplication.
4. Whale buy ($5,000 USD) -> Luxury whale formatting with diamond emojis.

### Test Welcome & Goodbye Simulator
Test welcome, goodbye, and ban security messages directly in the Telegram group:
```bash
# Simular bienvenida de nuevo miembro (elegido al azar entre los 12 mensajes)
pnpm run simulate:welcome

# Simular miembro que sale del grupo (5 variaciones)
pnpm run simulate:welcome leave

# Simular miembro expulsado/baneado por seguridad (5 variaciones)
pnpm run simulate:welcome ban

# Simular los 3 eventos consecutivos
pnpm run simulate:welcome all
```

---

## 🚀 Production Deployment

### Process Manager (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Build production bundle
pnpm run build

# Start bot with PM2
pm2 start dist/index.js --name "sharks-tg-bot"

# View logs
pm2 logs sharks-tg-bot
```

### Docker Deployment (Optional)
A standard Node.js Docker container can run this bot by exposing persistent storage for the `./data` volume.
