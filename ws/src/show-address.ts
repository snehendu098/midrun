import { HDWallet, Roles } from "@midnight-ntwrk/wallet-sdk-hd";
import { createKeystore, PublicKey } from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import dotenv from "dotenv";
dotenv.config();

const seed = Buffer.from(process.env.MIDNIGHT_WALLET_SEED || "", "hex");
const hdResult = HDWallet.fromSeed(seed);
if (hdResult.type !== "seedOk") { console.error("Bad seed"); process.exit(1); }

const account = hdResult.hdWallet.selectAccount(0);
function deriveRoleKey(accountKey: any, role: number, index = 0): Buffer {
  const result = accountKey.selectRole(role).deriveKeyAt(index);
  if (result.type === "keyDerived") return Buffer.from(result.key);
  return deriveRoleKey(accountKey, role, index + 1);
}

const unshieldedKey = deriveRoleKey(account, Roles.NightExternal);
const keystore = createKeystore(unshieldedKey, "undeployed");
const publicKey = PublicKey.fromKeyStore(keystore);
console.log("Your local network address:", publicKey.address);
hdResult.hdWallet.clear();
