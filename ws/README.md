# MidRun WebSocket Server

Real-time betting game server for the MidRun crash game on Midnight blockchain.

## Overview
WebSocket server that manages game sessions, handles player bets, and communicates with the Midnight Compact smart contract for the crash betting game.

## Setup
```bash
bun install
bun run dev
```

## Features
- Real-time game state management
- WebSocket connections for live updates
- Midnight network integration (NIGHT token transfers)
- Compact smart contract for on-chain game result storage
- Automated crash multiplier generation
- Player bet tracking and payouts
- Queue system for seamless round transitions
