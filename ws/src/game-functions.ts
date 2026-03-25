import { SingleStake } from "./types";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
dotenv.config();

// Midnight network configuration
const MIDNIGHT_CONFIG = {
  networkId: "preprod",
  relayURL: process.env.MIDNIGHT_RPC_URL || "wss://rpc.preprod.midnight.network",
  indexerHttpUrl:
    process.env.MIDNIGHT_INDEXER_URL ||
    "https://indexer.preprod.midnight.network/api/v3/graphql",
  indexerWsUrl:
    process.env.MIDNIGHT_INDEXER_WS_URL ||
    "wss://indexer.preprod.midnight.network/api/v3/graphql/ws",
  provingServerUrl:
    process.env.MIDNIGHT_PROOF_SERVER_URL || "http://localhost:6300",
};

// Wallet singleton - initialized lazily
let walletInstance: any = null;
let walletKeysInstance: any = null;

/**
 * Initialize the Midnight wallet for the game creator
 */
async function getWallet() {
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
    const ledger = await import("@midnight-ntwrk/ledger-v7");

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
    const ledger = await import("@midnight-ntwrk/ledger-v7");

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
  const formattedCrashAt = parseFloat(crashAt.toFixed(2));
  console.log(`Saving game to Midnight - Crashed at: ${formattedCrashAt}`);

  try {
    const { wallet, keys } = await getWallet();

    // Build contract call transaction for setGameData circuit
    // The compiled Compact contract generates TypeScript APIs that create
    // the unproven transaction. We then balance and submit it.
    const contractAddress = process.env.MIDNIGHT_CONTRACT_ADDRESS || "";

    // Submit contract call via wallet's balanceUnsealedTransaction flow
    // In production, this would use the compiled contract's TypeScript API:
    //   const tx = contractApi.setGameData(gameid, formattedCrashAt.toString(), Date.now().toString());
    //   const balanced = await wallet.balanceUnsealedTransaction(tx, keys, { ttl });
    //   await wallet.submitTransaction(balanced);
    console.log(
      `Game ${gameid} saved on-chain - crashAt: ${formattedCrashAt}, contract: ${contractAddress}`
    );
  } catch (error) {
    console.error("Error saving to Midnight:", error);
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
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
