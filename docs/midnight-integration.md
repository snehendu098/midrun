# Midnight DApp Integration

## DApp Connector API

Package: `@midnight-ntwrk/dapp-connector-api` v4.0.0

### Wallet Connection

```typescript
// Browser extension (mnLace wallet)
const api: ConnectedAPI = await window.midnight.mnLace.connect('preprod');
```

### ConnectedAPI Methods

| Method | Returns | Purpose |
|--------|---------|---------|
| `getShieldedBalances()` | Shielded balance map | ZK-private token balances |
| `getUnshieldedBalances()` | Unshielded balance map | Public NIGHT balances |
| `getDustBalance()` | DUST amount | Fee token balance |
| `getConfiguration()` | Network config | Node/indexer/prover endpoints |
| `makeTransfer()` | Transfer result | Send tokens |
| `balanceUnsealedTransaction()` | Balanced tx | Attach fee inputs/outputs to a tx |
| `submitTransaction()` | Tx hash | Submit signed tx to network |

## Contract Interaction Flow

```
1. Prepare unproven transaction (call contract circuit)
2. Generate ZK proofs (proof server or WASM)
3. Balance tx via balanceUnsealedTransaction() (attaches DUST for fees)
4. Submit via submitTransaction()
```

## Contract Compilation

Compiling a Compact contract produces:

- **ZK circuits** - the proof system artifacts
- **Cryptographic keys** - proving/verification keys
- **TypeScript APIs** - typed contract interface
- **JS contract impl** - lives in `contracts/managed/` directory

## Scaffolding

```bash
npx create-mn-app my-app
# Templates: hello-world, counter, bboard
```

## Infrastructure Requirements

| Service | Protocol | Default Port | Purpose |
|---------|----------|-------------|---------|
| Proof server | HTTP (Docker) | 6300 | ZK proof generation |
| Indexer | GraphQL | - | Query chain state |
| Node RPC | WebSocket | - | Submit txs, subscribe to events |

### Preprod Endpoints

```
Node RPC:  wss://rpc.preprod.midnight.network
Indexer:   https://indexer.preprod.midnight.network/api/v3/graphql
```

## Deployment Flow

1. Write and compile Compact contract
2. Start local proof server (Docker container)
3. Get tNIGHT from faucet (needed to generate DUST for fees)
4. Deploy contract to preprod via SDK
5. Contract address returned on successful deployment
