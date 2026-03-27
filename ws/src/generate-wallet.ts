import { randomBytes } from "crypto";

async function main() {
  const { HDWallet, Roles } = await import("@midnight-ntwrk/wallet-sdk-hd");
  const { createKeystore, PublicKey } = await import(
    "@midnight-ntwrk/wallet-sdk-unshielded-wallet"
  );

  // Generate random 32-byte seed
  const seed = randomBytes(32);
  const hexSeed = seed.toString("hex");

  // Derive keys using same BIP-44 path as game-functions.ts
  const hdResult = HDWallet.fromSeed(seed);
  if (hdResult.type !== "seedOk") {
    console.error("Failed to derive HD wallet from seed");
    process.exit(1);
  }

  const account = hdResult.hdWallet.selectAccount(0);

  function deriveRoleKey(accountKey: any, role: number, index = 0): Buffer {
    const result = accountKey.selectRole(role).deriveKeyAt(index);
    if (result.type === "keyDerived") return Buffer.from(result.key);
    return deriveRoleKey(accountKey, role, index + 1);
  }

  const unshieldedKey = deriveRoleKey(account, Roles.NightExternal);
  const keystore = createKeystore(unshieldedKey, "undeployed");
  const publicKey = PublicKey.fromKeyStore(keystore);
  const address = publicKey.address;

  hdResult.hdWallet.clear();

  console.log("=== Midnight Wallet Generated ===\n");
  console.log(`Seed (hex):  ${hexSeed}`);
  console.log(`Address:     ${address}`);
  console.log("\n--- Next steps ---");
  console.log("1. Fund this address on preprod");
  console.log("2. Set MIDNIGHT_WALLET_SEED in .env to the seed above");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
