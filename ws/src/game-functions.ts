import { SingleStake } from "./types";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
dotenv.config();

// Midnight network configuration
export const MIDNIGHT_CONFIG = {
  networkId: "undeployed",
  relayURL: process.env.MIDNIGHT_RPC_URL || "ws://127.0.0.1:9944",
  indexerHttpUrl:
    process.env.MIDNIGHT_INDEXER_URL ||
    "http://127.0.0.1:8088/api/v3/graphql",
  indexerWsUrl:
    process.env.MIDNIGHT_INDEXER_WS_URL ||
    "ws://127.0.0.1:8088/api/v3/graphql/ws",
  provingServerUrl:
    process.env.MIDNIGHT_PROOF_SERVER_URL || "http://localhost:6300",
};

// Wallet singleton - initialized lazily
let walletInstance: any = null;
let walletKeysInstance: any = null;

/**
 * Initialize the Midnight wallet for the game creator
 */
export async function getWallet() {
  if (walletInstance) return { wallet: walletInstance, keys: walletKeysInstance };

  try {
    const { WalletFacade } = await import("@midnight-ntwrk/wallet-sdk-facade");
    const { HDWallet, Roles } = await import("@midnight-ntwrk/wallet-sdk-hd");
    const {
      createKeystore,
      PublicKey,
      UnshieldedWallet,
      InMemoryTransactionHistoryStorage,
    } = await import("@midnight-ntwrk/wallet-sdk-unshielded-wallet");
    const { ShieldedWallet } = await import(
      "@midnight-ntwrk/wallet-sdk-shielded"
    );
    const { DustWallet } = await import(
      "@midnight-ntwrk/wallet-sdk-dust-wallet"
    );
    const ledger = await import("@midnight-ntwrk/ledger-v8");

    const seed = Buffer.from(process.env.MIDNIGHT_WALLET_SEED || "", "hex");

    // Derive keys using HD wallet (BIP-44: m/44'/2400'/0')
    const hdResult = HDWallet.fromSeed(seed);
    if (hdResult.type !== "seedOk") throw new Error("Failed to derive keys from seed");

    const account = hdResult.hdWallet.selectAccount(0);

    function deriveRoleKey(accountKey: any, role: number, index = 0): Buffer {
      const result = accountKey.selectRole(role).deriveKeyAt(index);
      if (result.type === "keyDerived") return Buffer.from(result.key);
      return deriveRoleKey(accountKey, role, index + 1);
    }

    const shieldedSeed = deriveRoleKey(account, Roles.Zswap);
    const dustSeed = deriveRoleKey(account, Roles.Dust);
    const unshieldedKey = deriveRoleKey(account, Roles.NightExternal);

    hdResult.hdWallet.clear();

    const shieldedKeys = ledger.ZswapSecretKeys.fromSeed(shieldedSeed);
    const dustKey = ledger.DustSecretKey.fromSeed(dustSeed);
    const unshieldedKeystore = createKeystore(
      unshieldedKey,
      MIDNIGHT_CONFIG.networkId
    );

    const configuration = {
      networkId: MIDNIGHT_CONFIG.networkId,
      costParameters: {
        additionalFeeOverhead: 300_000_000_000_000n,
        feeBlocksMargin: 5,
      },
      relayURL: new URL(MIDNIGHT_CONFIG.relayURL),
      provingServerUrl: new URL(MIDNIGHT_CONFIG.provingServerUrl),
      indexerClientConnection: {
        indexerHttpUrl: MIDNIGHT_CONFIG.indexerHttpUrl,
        indexerWsUrl: MIDNIGHT_CONFIG.indexerWsUrl,
      },
      txHistoryStorage: new InMemoryTransactionHistoryStorage(),
    };

    walletInstance = await WalletFacade.init({
      configuration,
      shielded: (config: any) =>
        ShieldedWallet(config).startWithSecretKeys(shieldedKeys),
      unshielded: (config: any) =>
        UnshieldedWallet(config).startWithPublicKey(
          PublicKey.fromKeyStore(unshieldedKeystore)
        ),
      dust: (config: any) =>
        DustWallet(config).startWithSecretKey(
          dustKey,
          ledger.LedgerParameters.initialParameters().dust
        ),
    });

    await walletInstance.start(shieldedKeys, dustKey);

    // Wait for wallet to sync before dust registration
    const Rx = await import("rxjs");
    await Rx.firstValueFrom(
      walletInstance.state().pipe(Rx.filter((s: any) => s.isSynced))
    );

    // Register NIGHT UTXOs for dust generation (required for tx fees)
    try {
      const syncedState: any = await Rx.firstValueFrom(
        walletInstance.state().pipe(Rx.filter((s: any) => s.isSynced))
      );

      // Check if dust already available
      if (syncedState.dust.availableCoins?.length > 0) {
        console.log("Dust tokens already available");
      } else {
        // Get unregistered NIGHT UTXOs
        const nightUtxos = (syncedState.unshielded.availableCoins || []).filter(
          (coin: any) => coin.meta?.registeredForDustGeneration !== true,
        );

        if (nightUtxos.length > 0) {
          console.log(`Registering ${nightUtxos.length} NIGHT UTXOs for dust generation...`);
          const recipe = await walletInstance.registerNightUtxosForDustGeneration(
            nightUtxos,
            unshieldedKeystore.getPublicKey(),
            (payload: Uint8Array) => unshieldedKeystore.signData(payload),
          );
          const finalized = await walletInstance.finalizeRecipe(recipe);
          await walletInstance.submitTransaction(finalized);
          console.log("Dust registration submitted — waiting for dust to generate...");
        } else {
          console.log("All UTXOs already registered, waiting for dust...");
        }

        // Wait for dust balance > 0 (up to 5 min on local network)
        console.log("Waiting for dust balance (up to 5 min)...");
        await Rx.firstValueFrom(
          walletInstance.state().pipe(
            Rx.throttleTime(5000),
            Rx.tap((s: any) => {
              if (s.isSynced) {
                const bal = s.dust.walletBalance(new Date());
                if (bal === 0n) process.stdout.write(".");
              }
            }),
            Rx.filter((s: any) => s.isSynced),
            Rx.filter((s: any) => s.dust.walletBalance(new Date()) > 0n),
            Rx.timeout(300000),
          )
        );
        console.log("\nDust is available!");
      }
    } catch (e: any) {
      console.warn("Dust registration:", e.message || e);
    }

    walletKeysInstance = {
      shieldedSecretKeys: shieldedKeys,
      dustSecretKey: dustKey,
      unshieldedKeystore,
    };

    return { wallet: walletInstance, keys: walletKeysInstance };
  } catch (error) {
    console.error("Failed to initialize Midnight wallet:", error);
    throw error;
  }
}

/**
 * Withdraw function - sends NIGHT tokens to player based on stake and multiplier
 */
export async function withdraw(
  address: string,
  stake: SingleStake,
  multiplier: number
): Promise<number> {
  const amount = stake.amount * multiplier;
  console.log(
    `Withdraw - Address: ${address}, Stake: ${stake.amount}, Multiplier: ${multiplier}, Payout: ${amount}`
  );

  try {
    const { wallet, keys } = await getWallet();
    const ledger = await import("@midnight-ntwrk/ledger-v8");

    // Convert to smallest unit (1 NIGHT = 1_000_000 units)
    const payoutAmount = BigInt(Math.floor(amount * 1_000_000));

    await wallet
      .transferTransaction(
        [
          {
            type: "unshielded",
            outputs: [
              {
                amount: payoutAmount,
                receiverAddress: address,
                type: ledger.unshieldedToken().raw,
              },
            ],
          },
        ],
        {
          shieldedSecretKeys: keys.shieldedSecretKeys,
          dustSecretKey: keys.dustSecretKey,
        },
        {
          ttl: new Date(Date.now() + 30 * 60 * 1000),
        }
      )
      .then((recipe: any) =>
        wallet.signRecipe(recipe, (payload: any) =>
          keys.unshieldedKeystore.signData(payload)
        )
      )
      .then((recipe: any) => wallet.finalizeRecipe(recipe))
      .then((tx: any) => wallet.submitTransaction(tx));

    console.log(`Withdrawal of ${amount} NIGHT sent to ${address}`);
  } catch (error) {
    console.error(`Error processing withdrawal for ${address}:`, error);
  }

  return amount;
}

/**
 * Save game result on-chain via Compact contract's setGameData circuit
 */
export async function saveToDB(crashAt: number): Promise<void> {
  const gameid = randomUUID();
  const formattedCrashAt = crashAt.toFixed(2);
  const date = Date.now().toString();
  console.log(`Saving game to Midnight - ID: ${gameid}, crashAt: ${formattedCrashAt}`);

  try {
    const { callSetGameData } = await import("./contract-api");
    const txId = await callSetGameData(gameid, formattedCrashAt, date);
    console.log(`Game ${gameid} saved on-chain - tx: ${txId}`);
  } catch (error) {
    console.error("Error saving to Midnight:", error);
  }
}

/**
 * Calculate current multiplier based on start time, end time, current time, and crash value
 */
export function calculateMultiplier(
  startTime: number,
  endTime: number,
  currentTime: number,
  crashAt: number
): number {
  if (currentTime < startTime) return 1.0;
  if (currentTime >= endTime) return crashAt;

  const elapsed = currentTime - startTime;
  const totalDuration = endTime - startTime;
  const progress = elapsed / totalDuration;

  return 1.0 + progress * (crashAt - 1.0);
}
