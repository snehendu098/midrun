• Team Leader name: Snehendu Roy
• Team Name: Silone
• Phone Number: 9907625389
• mail: roysnehendupersonal@gmail.com
• Project Title: MidRun
• Project Description: MidRun is a real-time multiplayer crash betting game built on the Midnight network. Players connect their Midnight Lace wallet, place bets using NIGHT tokens, and watch a multiplier climb in real-time via WebSocket updates. Cash out before the crash to win - or lose it all. Game results are stored immutably on-chain via a Compact smart contract with ZK proof verification. Built with Next.js 15 frontend, Bun/Hono WebSocket backend, and Midnight's dual-state ledger for privacy-preserving game data storage.

• Milestone 1 Title: Core Game Engine & State Machine
• Milestone 1 Description:
  - Implement GameManager class with three-phase state machine (waiting → running → ended → waiting cycle)
  - Build crash multiplier generation using cryptographic HMAC-based provably fair algorithm
  - Implement real-time multiplier progression with accelerating time intervals per multiplier level (10s for 1-2x, 5s for 2-3x, halving each level)
  - Build player queue system for seamless round transitions - bets placed during active rounds auto-queue for next round
  - Wire up Hono WebSocket server with bidirectional event broadcasting (join_game, withdraw, multiplier_update, game_ended, queue_processed)

• Milestone 2 Title: Compact Smart Contract & On-Chain Storage
• Milestone 2 Description:
  - Write CrashGame.compact contract with exported ledger state: latestGameId (Opaque<"string">), latestCrashAt (Opaque<"string">), latestDate (Opaque<"string">), gameCount (Counter)
  - Implement setGameData exported circuit that discloses game results to public ledger and increments gameCount
  - Compile contract to ZK circuits, cryptographic proving/verifying keys, and TypeScript API bindings
  - Build saveToDB function using WalletFacade to submit contract call transactions with balanceUnsealedTransaction flow

• Milestone 3 Title: Midnight Wallet SDK Integration & Token Transfers
• Milestone 3 Description:
  - Initialize server-side WalletFacade with HD key derivation (BIP-44 path m/44'/2400'/0') for game creator wallet
  - Implement withdraw function using unshielded NIGHT token transfers via transferTransaction → signRecipe → finalizeRecipe → submitTransaction pipeline
  - Configure preprod network endpoints (wss://rpc.preprod.midnight.network, indexer GraphQL, local proof server on port 6300)
  - Implement DUST fee management - register NIGHT UTxOs for DUST generation to cover transaction costs

• Milestone 4 Title: Frontend DApp Connector & Lace Wallet Integration
• Milestone 4 Description:
  - Build MidnightProvider context using window.midnight.mnLace DApp Connector API with connect('preprod') flow
  - Implement wallet state management: getShieldedBalances(), getUnshieldedBalances(), getDustBalance(), Bech32m address display
  - Rewrite bet placement to use connectedApi.makeTransfer() with unshielded NIGHT token type (nativeToken().raw) to game receiver address
  - Build wallet connect modal with Lace detection, connection status indicator, and address truncation UI

• Milestone 5 Title: TDD Test Suite & End-to-End Verification
• Milestone 5 Description:
  - Write GameManager unit tests covering all phase transitions, multiplier bounds (1.0-5.0x), player join/withdraw during each phase, and queue processing
  - Write game-functions integration tests with mocked WalletFacade for withdraw (verify payout = stake * multiplier) and saveToDB (verify circuit call args)
  - Write frontend component tests for wallet connection flow and bet placement transaction signing
  - Run full build verification: bun test for backend, next build for frontend, grep audit for zero stale references
