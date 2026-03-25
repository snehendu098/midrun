# MidRun

Real-time multiplayer crash betting game built on the Midnight network.

## Features

- **Real-time multiplayer gameplay** with WebSocket connections
- **Midnight blockchain integration** using Compact smart contracts
- **Privacy-preserving** game result storage via ZK proofs
- **Queue system** for seamless game transitions
- **Dynamic multiplier progression** with real-time updates
- **Instant withdrawals** during active games

## How It Works

MidRun is a crash game where players:
1. **Connect** their Midnight Lace wallet
2. **Join** a game round by placing NIGHT token bets
3. **Watch** the multiplier increase in real-time
4. **Withdraw** before the crash to secure winnings
5. **Risk vs Reward**: Higher multipliers = bigger payouts, but greater crash risk

### Game Phases

- **Waiting Phase** (15s): Players can join the upcoming round
- **Running Phase**: Multiplier increases until crash point
- **Ended Phase** (2s): Results finalized and saved to Midnight blockchain

## Architecture

### Smart Contract (Midnight Compact)

```compact
export ledger latestGameId: Opaque<"string">;
export ledger latestCrashAt: Opaque<"string">;
export ledger latestDate: Opaque<"string">;
export ledger gameCount: Counter;

export circuit setGameData(gameId, crashAt, date): []
```

### Tech Stack

- **Blockchain**: Midnight Network (Preprod)
- **Smart Contracts**: Compact language (ZK circuits)
- **Backend**: Bun + Hono WebSocket server
- **Frontend**: Next.js 15 + React 19
- **Wallet**: Midnight Lace via DApp Connector API
- **UI**: Tailwind CSS, Radix UI, Framer Motion

## Getting Started

### Prerequisites

- Node.js 22+ / Bun runtime
- Midnight Lace wallet (browser extension)
- Docker (for proof server)

### Installation

```bash
# Client
cd client && npm install && npm run dev

# WebSocket Server
cd ws && bun install && bun run dev
```

### Environment Variables

**Server (ws/.env)**:
```env
MIDNIGHT_WALLET_SEED=your_hex_seed
MIDNIGHT_CONTRACT_ADDRESS=deployed_contract_address
MIDNIGHT_RPC_URL=wss://rpc.preprod.midnight.network
MIDNIGHT_INDEXER_URL=https://indexer.preprod.midnight.network/api/v3/graphql
MIDNIGHT_PROOF_SERVER_URL=http://localhost:6300
```

**Client (.env.local)**:
```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_GAME_RECEIVER_ADDRESS=mn_addr_preprod1...
```

## WebSocket API

### Client → Server
```typescript
{ type: 'join_game', address: string, amount: number }
{ type: 'withdraw', address: string }
{ type: 'get_multiplier' }
```

### Server → Client
```typescript
{ type: 'game_state', data: GameState }
{ type: 'multiplier_update', multiplier: number }
{ type: 'player_joined', address: string, amount: number }
{ type: 'game_ended', crashAt: number }
```

## Testing

```bash
cd ws && bun test
```
