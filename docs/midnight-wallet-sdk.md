# Midnight Wallet SDK

## Package Map

| Package | Purpose |
|---------|---------|
| `wallet-sdk-facade` | High-level unified wallet interface |
| `wallet-sdk-unshielded-wallet` | NIGHT (public) token operations |
| `wallet-sdk-shielded` | Shielded (ZK-private) token operations |
| `wallet-sdk-dust-wallet` | DUST fee token management |
| `wallet-sdk-hd` | HD key derivation |
| `wallet-sdk-address-format` | Address encoding/decoding |
| `wallet-sdk-node-client` | Node RPC WebSocket client |
| `wallet-sdk-indexer-client` | Indexer GraphQL client |
| `wallet-sdk-prover-client` | Proving server client |
| `wallet-sdk-capabilities` | WASM proving alternative |
| `ledger-v7` | Ledger state types |

## HD Key Derivation

BIP-44 path: `m/44'/2400'/account'/role/index`

| Role | Value | Purpose |
|------|-------|---------|
| NightExternal | 0 | Unshielded NIGHT addresses |
| Zswap | 3 | Shielded token addresses |
| Dust | 4 | DUST fee token addresses |

## Wallet Initialization

```typescript
const wallet = await WalletFacade.init({
  shieldedWallet: ShieldedWallet.config({ ... }),
  unshieldedWallet: UnshieldedWallet.config({ ... }),
  dustWallet: DustWallet.config({ ... }),
});
```

## Network Config

```typescript
{
  networkId: 'preprod',
  costParameters: {
    additionalFeeOverhead: bigint,
    feeBlocksMargin: number,
  },
  relayURL: 'wss://rpc.preprod.midnight.network',
  provingServerUrl: 'http://localhost:6300',
  indexerClientConnection: 'https://indexer.preprod.midnight.network/api/v3/graphql',
}
```

## Transfer Flows

### Unshielded (NIGHT)

```
transferTransaction() -> signRecipe() -> finalizeRecipe() -> submitTransaction()
```

Requires signing because NIGHT is public/account-based.

### Shielded

```
transferTransaction() -> finalizeRecipe() -> submitTransaction()
```

No signing step needed - ZK proofs replace signatures.

## Address Formats

| Prefix | Type | Example suffix |
|--------|------|---------------|
| `mn_addr` | Unshielded | `_preprod` or `_mainnet` |
| `mn_shield-addr` | Shielded | `_preprod` or `_mainnet` |
| `mn_dust` | Dust | `_preprod` or `_mainnet` |

## DUST Management

```typescript
// Stake NIGHT to generate DUST
await wallet.registerNightUtxosForDustGeneration();

// Stop generating DUST
await wallet.deregisterFromDustGeneration();
```

DUST is required for all tx fees. Must stake NIGHT first or get from faucet on testnet.

## State Synchronization

```typescript
// Wait for wallet to sync with chain
await wallet.waitForSyncedState();

// Subscribe to state changes (RxJS observable)
wallet.state().subscribe((state) => {
  console.log(state.unshieldedBalance);
  console.log(state.shieldedBalance);
  console.log(state.dustBalance);
});
```

## WASM Proving Alternative

For environments without Docker (e.g., browser-only):

```typescript
import { makeWasmProvingService } from '@midnight-ntwrk/wallet-sdk-capabilities';

const prover = makeWasmProvingService();
// Use instead of remote proof server
```

Slower than the Docker proof server but removes infrastructure dependency.
