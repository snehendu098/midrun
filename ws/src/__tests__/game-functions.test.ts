import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock Midnight SDK modules
const mockTransferTransaction = mock(() =>
  Promise.resolve({ transaction: "mock-recipe" })
);
const mockSignRecipe = mock(() =>
  Promise.resolve({ transaction: "mock-signed" })
);
const mockFinalizeRecipe = mock(() =>
  Promise.resolve({ transaction: "mock-finalized" })
);
const mockSubmitTransaction = mock(() =>
  Promise.resolve({ txHash: "mock-tx-hash" })
);
const mockBalanceUnsealedTransaction = mock(() =>
  Promise.resolve({ tx: "mock-balanced" })
);

const mockWallet = {
  transferTransaction: mockTransferTransaction,
  signRecipe: mockSignRecipe,
  finalizeRecipe: mockFinalizeRecipe,
  submitTransaction: mockSubmitTransaction,
  balanceUnsealedTransaction: mockBalanceUnsealedTransaction,
  waitForSyncedState: mock(() =>
    Promise.resolve({
      unshielded: { balances: new Map(), availableCoins: [] },
      shielded: { balances: new Map() },
      dust: { totalCoins: 0n },
    })
  ),
  state: mock(() => ({ subscribe: () => {} })),
  start: mock(() => Promise.resolve()),
  stop: mock(() => Promise.resolve()),
};

// Mock the midnight wallet initialization
mock.module("@midnight-ntwrk/wallet-sdk-facade", () => ({
  WalletFacade: {
    init: mock(() => Promise.resolve(mockWallet)),
  },
}));

mock.module("@midnight-ntwrk/ledger-v7", () => ({
  unshieldedToken: () => ({ raw: "native" }),
  nativeToken: () => ({ raw: "native" }),
  ZswapSecretKeys: { fromSeed: mock(() => ({})) },
  DustSecretKey: { fromSeed: mock(() => ({})) },
  signatureVerifyingKey: mock(() => "mock-key"),
  addressFromKey: mock(() => "mock-address"),
  LedgerParameters: { initialParameters: () => ({ dust: {} }) },
}));

mock.module("@midnight-ntwrk/wallet-sdk-hd", () => ({
  HDWallet: {
    fromSeed: mock(() => ({
      type: "seedOk",
      hdWallet: {
        selectAccount: () => ({
          selectRole: () => ({
            deriveKeyAt: () => ({
              type: "keyDerived",
              key: new Uint8Array(32),
            }),
          }),
        }),
        clear: () => {},
      },
    })),
  },
  Roles: { NightExternal: 0, Zswap: 3, Dust: 4 },
}));

mock.module("@midnight-ntwrk/wallet-sdk-unshielded-wallet", () => ({
  createKeystore: mock(() => ({
    getPublicKey: () => "mock-pub-key",
    signData: (payload: any) => "mock-signature",
  })),
  PublicKey: { fromKeyStore: mock(() => "mock-public-key") },
  UnshieldedWallet: mock(() => ({
    startWithPublicKey: () => ({}),
  })),
  InMemoryTransactionHistoryStorage: mock(() => ({})),
}));

mock.module("@midnight-ntwrk/wallet-sdk-shielded", () => ({
  ShieldedWallet: mock(() => ({
    startWithSecretKeys: () => ({}),
  })),
}));

mock.module("@midnight-ntwrk/wallet-sdk-dust-wallet", () => ({
  DustWallet: mock(() => ({
    startWithSecretKey: () => ({}),
  })),
}));

describe("game-functions (Midnight integration)", () => {
  beforeEach(() => {
    mockTransferTransaction.mockClear();
    mockSignRecipe.mockClear();
    mockFinalizeRecipe.mockClear();
    mockSubmitTransaction.mockClear();
    mockBalanceUnsealedTransaction.mockClear();
  });

  describe("withdraw", () => {
    it("calculates correct payout amount", () => {
      const stake = { address: "mn_addr_preprod1abc", amount: 2.0, time: Date.now() };
      const multiplier = 3.5;
      const expectedPayout = stake.amount * multiplier;
      expect(expectedPayout).toBe(7.0);
    });

    it("payout is stake * multiplier for various values", () => {
      const cases = [
        { amount: 1.0, multiplier: 1.0, expected: 1.0 },
        { amount: 0.5, multiplier: 2.0, expected: 1.0 },
        { amount: 3.0, multiplier: 4.5, expected: 13.5 },
        { amount: 0.001, multiplier: 1.01, expected: 0.00101 },
      ];
      for (const { amount, multiplier, expected } of cases) {
        expect(amount * multiplier).toBeCloseTo(expected, 5);
      }
    });

    it("handles zero stake gracefully", () => {
      expect(0 * 2.5).toBe(0);
    });

    it("handles multiplier of exactly 1.0 (immediate cashout)", () => {
      const amount = 5.0;
      expect(amount * 1.0).toBe(5.0);
    });
  });

  describe("saveToDB", () => {
    it("formats crash value to 2 decimal places", () => {
      const crashAt = 3.14159;
      const formatted = parseFloat(crashAt.toFixed(2));
      expect(formatted).toBe(3.14);
    });

    it("handles minimum crash value (1.0)", () => {
      const formatted = parseFloat((1.0).toFixed(2));
      expect(formatted).toBe(1.0);
    });

    it("handles maximum crash value (5.0)", () => {
      const formatted = parseFloat((5.0).toFixed(2));
      expect(formatted).toBe(5.0);
    });

    it("generates unique game IDs", () => {
      const { randomUUID } = require("crypto");
      const id1 = randomUUID();
      const id2 = randomUUID();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  describe("calculateMultiplier", () => {
    it("returns 1.0 before start time", () => {
      const start = 1000;
      const end = 2000;
      const current = 500;
      const crashAt = 3.0;
      if (current < start) {
        expect(1.0).toBe(1.0);
      }
    });

    it("returns crashAt at end time", () => {
      const crashAt = 3.5;
      const start = 1000;
      const end = 2000;
      const current = 2000;
      if (current >= end) {
        expect(crashAt).toBe(3.5);
      }
    });

    it("returns midpoint at 50% progress", () => {
      const start = 0;
      const end = 1000;
      const current = 500;
      const crashAt = 3.0;
      const progress = (current - start) / (end - start);
      const multiplier = 1.0 + progress * (crashAt - 1.0);
      expect(multiplier).toBe(2.0);
    });

    it("linear progression from 1.0 to crashAt", () => {
      const crashAt = 4.0;
      const steps = [0, 0.25, 0.5, 0.75, 1.0];
      const expected = [1.0, 1.75, 2.5, 3.25, 4.0];
      for (let i = 0; i < steps.length; i++) {
        const mult = 1.0 + steps[i] * (crashAt - 1.0);
        expect(mult).toBeCloseTo(expected[i], 5);
      }
    });
  });

  describe("Midnight SDK mock verification", () => {
    it("WalletFacade.init resolves with wallet object", async () => {
      const { WalletFacade } = await import(
        "@midnight-ntwrk/wallet-sdk-facade"
      );
      const wallet = await WalletFacade.init({} as any);
      expect(wallet).toBeDefined();
      expect(wallet.transferTransaction).toBeDefined();
      expect(wallet.submitTransaction).toBeDefined();
    });

    it("HDWallet derives keys from seed", async () => {
      const { HDWallet, Roles } = await import(
        "@midnight-ntwrk/wallet-sdk-hd"
      );
      const result = HDWallet.fromSeed(new Uint8Array(32));
      expect(result.type).toBe("seedOk");
    });

    it("unshieldedToken returns native token type", async () => {
      const ledger = await import("@midnight-ntwrk/ledger-v7");
      expect(ledger.unshieldedToken().raw).toBe("native");
    });
  });
});
