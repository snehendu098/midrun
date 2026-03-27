import * as fs from "fs";
import * as path from "path";
import * as Rx from "rxjs";
import { getWallet, MIDNIGHT_CONFIG } from "./game-functions";

const COMPILED_DIR = path.resolve(__dirname, "../contract/compiled");

let contractInstance: any = null;

async function getContract() {
  if (contractInstance) return contractInstance;

  const { findDeployedContract } = await import("@midnight-ntwrk/midnight-js-contracts");
  const { setNetworkId } = await import("@midnight-ntwrk/midnight-js-network-id");
  const { CompiledContract } = await import("@midnight-ntwrk/compact-js");
  const { NodeZkConfigProvider } = await import("@midnight-ntwrk/midnight-js-node-zk-config-provider");
  const { httpClientProofProvider } = await import("@midnight-ntwrk/midnight-js-http-client-proof-provider");
  const { indexerPublicDataProvider } = await import("@midnight-ntwrk/midnight-js-indexer-public-data-provider");
  const { levelPrivateStateProvider } = await import("@midnight-ntwrk/midnight-js-level-private-state-provider");

  setNetworkId("undeployed");

  // Resolve contract address
  let contractAddress = process.env.MIDNIGHT_CONTRACT_ADDRESS || "";
  if (!contractAddress) {
    try {
      const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
      contractAddress = deployment.contractAddress;
    } catch {
      throw new Error("MIDNIGHT_CONTRACT_ADDRESS not set and no deployment.json found. Run: bun run deploy");
    }
  }

  // Load compiled contract
  const CrashGame = await import("../contract/compiled/contract/index.js");
  const compiledContract = CompiledContract.make("CrashGame", CrashGame.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(COMPILED_DIR),
  );

  const { wallet, keys } = await getWallet();

  const state = await Rx.firstValueFrom(
    wallet.state().pipe(Rx.filter((s: any) => s.isSynced))
  );

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

  const zkConfigProvider = new NodeZkConfigProvider(COMPILED_DIR);
  const proofProvider = httpClientProofProvider(MIDNIGHT_CONFIG.provingServerUrl, zkConfigProvider);
  const publicDataProvider = indexerPublicDataProvider(MIDNIGHT_CONFIG.indexerHttpUrl, MIDNIGHT_CONFIG.indexerWsUrl);
  const privateStateProvider = levelPrivateStateProvider({
    privateStateStoreName: "crashgame-private-state",
    signingKeyStoreName: "signing-keys",
    midnightDbName: "midnight-level-db",
    walletProvider: walletAndMidnightProvider,
  });

  const providers = {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };

  contractInstance = await findDeployedContract(providers, {
    contractAddress,
    compiledContract,
    privateStateId: "crashGameState",
    initialPrivateState: {},
  });

  console.log(`Connected to CrashGame contract at ${contractAddress}`);
  return contractInstance;
}

export async function callSetGameData(
  gameId: string,
  crashAt: string,
  date: string
): Promise<string> {
  const contract = await getContract();
  const tx = await contract.callTx.setGameData(gameId, crashAt, date);
  console.log(`setGameData tx: ${tx.public.txId}`);
  return tx.public.txId;
}
