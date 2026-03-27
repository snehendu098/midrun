import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as Rx from "rxjs";
import { getWallet, MIDNIGHT_CONFIG } from "./game-functions";

dotenv.config();

const COMPILED_DIR = path.resolve(__dirname, "../contract/compiled");

// In-memory private state provider (CrashGame has no private state)
function inMemoryPrivateStateProvider(): any {
  const states = new Map<string, any>();
  const signingKeys: Record<string, any> = {};
  let contractAddress = "";
  return {
    set: (key: string, state: any) => { states.set(key, state); return Promise.resolve(); },
    get: (key: string) => Promise.resolve(states.get(key) ?? null),
    remove: (key: string) => { states.delete(key); return Promise.resolve(); },
    clear: () => { states.clear(); return Promise.resolve(); },
    setContractAddress: (addr: string) => { contractAddress = addr; },
    getContractAddress: () => contractAddress,
    setSigningKey: (addr: string, key: any) => { signingKeys[addr] = key; return Promise.resolve(); },
    getSigningKey: (addr: string) => Promise.resolve(signingKeys[addr] ?? null),
    removeSigningKey: (addr: string) => { delete signingKeys[addr]; return Promise.resolve(); },
    clearSigningKeys: () => { Object.keys(signingKeys).forEach(k => delete signingKeys[k]); return Promise.resolve(); },
  };
}

async function main() {
  const { deployContract } = await import("@midnight-ntwrk/midnight-js-contracts");
  const { setNetworkId } = await import("@midnight-ntwrk/midnight-js-network-id");
  const { CompiledContract } = await import("@midnight-ntwrk/compact-js");
  const { NodeZkConfigProvider } = await import("@midnight-ntwrk/midnight-js-node-zk-config-provider");
  const { httpClientProofProvider } = await import("@midnight-ntwrk/midnight-js-http-client-proof-provider");
  const { indexerPublicDataProvider } = await import("@midnight-ntwrk/midnight-js-indexer-public-data-provider");

  setNetworkId("undeployed");

  // Load compiled contract
  const CrashGame = await import("../contract/compiled/contract/index.js");
  const compiledContract = CompiledContract.make("CrashGame", CrashGame.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(COMPILED_DIR),
  );

  console.log("Initializing wallet...");
  const { wallet, keys } = await getWallet();

  console.log("Waiting for wallet to sync...");
  const state: any = await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5000),
      Rx.tap((s: any) => {
        if (!s.isSynced) console.log("  Syncing...");
      }),
      Rx.filter((s: any) => s.isSynced)
    )
  );
  console.log("Wallet synced.");

  const walletAndMidnightProvider = {
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await wallet.balanceUnboundTransaction(
        tx,
        {
          shieldedSecretKeys: keys.shieldedSecretKeys,
          dustSecretKey: keys.dustSecretKey,
        },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) }
      );
      const signedRecipe = await wallet.signRecipe(recipe, (payload: Uint8Array) =>
        keys.unshieldedKeystore.signData(payload),
      );
      return wallet.finalizeRecipe(signedRecipe);
    },
    async submitTx(tx: any) {
      return wallet.submitTransaction(tx);
    },
  };

  const zkConfigProvider = new NodeZkConfigProvider<"setGameData">(COMPILED_DIR);

  const proofProvider = httpClientProofProvider(
    MIDNIGHT_CONFIG.provingServerUrl,
    zkConfigProvider
  );

  const publicDataProvider = indexerPublicDataProvider(
    MIDNIGHT_CONFIG.indexerHttpUrl,
    MIDNIGHT_CONFIG.indexerWsUrl
  );

  const privateStateProvider = inMemoryPrivateStateProvider();

  const providers = {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };

  console.log("Deploying CrashGame contract to local network...");

  const contract = await deployContract(providers as any, {
    compiledContract,
    privateStateId: "crashGameState",
    initialPrivateState: {},
  });

  const contractAddress = contract.deployTxData.public.contractAddress;

  console.log(`\nContract deployed!`);
  console.log(`Address: ${contractAddress}`);

  const deployment = {
    contractAddress,
    deployedAt: new Date().toISOString(),
    network: "undeployed",
  };

  fs.writeFileSync("deployment.json", JSON.stringify(deployment, null, 2));

  console.log("\nSaved to deployment.json");
  console.log(`Set MIDNIGHT_CONTRACT_ADDRESS=${contractAddress} in .env`);

  await wallet.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
