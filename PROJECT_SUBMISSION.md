# Project Overlord — AI-Powered Intent Execution Layer for Solana

## 🎯 Project Overview

**Project Name:** Project Overlord

**Short Description:**  
An AI-powered intent execution layer that eliminates friction in cross-chain onboarding to Solana. Users describe their goal in plain English, and Overlord orchestrates the entire flow: intent parsing → route discovery via LI.FI → bridge/swap execution → Solana delivery. No bridge tutorials. No token hopping. Just one sentence and one confirmation.

**Problem Solved:**  
**Solana onboarding friction:** Users on Base, Arbitrum, or Ethereum cannot easily get liquidity into Solana apps without:
- Learning multiple bridges (Wormhole, Stargate, Portal, etc.)
- Understanding token pairs and swap aggregators
- Manually sequencing approve → bridge → swap → deposit
- Tracking which tokens work on which chains

**Solution:** Natural language intent execution. "Put $50 from Base USDC into Drift" → AI extracts the plan → LI.FI finds the optimal route → one signature → lands on Solana.

---

## 📋 Submission Checklist

### ✅ Smart Contract & Deployment
- **Framework:** Anchor + Rust
- **Network:** Solana Devnet
- **Program ID:** `AoC6gRnhkN8TpueJoNpwXA9i47zYg5QpUu3voTL9284R`
- **Repository:** [github.com/RockZ37/lovable-frontend](https://github.com/RockZ37/lovable-frontend)
- **Build Instructions:** See [README.md](./README.md) section "Building & Deploying the Anchor Program"

### ✅ Public Repository
- **Repo Link:** [RockZ37/lovable-frontend](https://github.com/RockZ37/lovable-frontend)
- **License:** MIT
- **Branch:** `main`

### ✅ Complete README
- **Location:** [README.md](./README.md)
- **Contents:**
  - Setup prerequisites and installation
  - Environment configuration
  - Local development (`pnpm dev`)
  - Anchor program build and deployment
  - Demo mode explained
  - LI.FI integration details
  - Troubleshooting

### ✅ Working Demo
- **Access:** Run `pnpm dev` locally, then visit demo link in UI or navigate to `http://localhost:5173/app?fake=1`
- **Features:**
  - Chat interface for natural language intent input
  - AI-powered intent parsing
  - LI.FI quote fetching (real API in production mode)
  - Wallet confirmation modal (Phantom)
  - Transaction execution with step-by-step progress
  - Balance tracking and settlement confirmation
- **Demo Mode:** `FAKE_EXECUTION=true` allows testing without real funds

### ✅ Solana as Core User Journey
1. **Intent Entry:** User types natural language request (e.g., "Move $100 USDC from Base to Solana")
2. **Intent Parsing:** LLM extracts: source chain, source token, amount, destination action
3. **Route Planning:** LI.FI finds optimal path (bridge + swap)
4. **Bridge Execution:** User approves and bridge transaction executes
5. **Swap on Solana:** Destination token acquired via Jupiter or other aggregator
6. **Solana Delivery:** Funds delivered to user's Solana wallet or app account (Drift, Tensor, Pump.fun, etc.)
7. **Settlement:** Smart contract registers the intent completion on Solana

### ✅ Meaningful LI.FI Integration
- **Integration Type:** LI.FI REST API for quote and route fetching
- **Real Usage:**
  - **Quote Generation:** `GET /quote` endpoint called with source/dest chain, token, amount
  - **Route Fetching:** Returns step-by-step bridge + swap instructions
  - **Route Execution:** Steps executed with real signatures (devnet tokens)
  - **Real Data:** Fees, ETA, liquidity checks all from LI.FI API
- **Chains:** Base (chain 8453) → Solana (chain 1151111081099710)
- **Fallback:** Heuristic parser if LI.FI API unavailable
- **Not Cosmetic:** Every route displayed in UI comes from LI.FI API or fallback logic

### ✅ Clear User Problem & Solution

| **Problem** | **Solution** |
|---|---|
| Complex multi-step bridge UX | Natural language intent → orchestrated execution |
| Token/chain selector overload | AI extracts requirements automatically |
| Learning curve for each bridge | LI.FI handles route optimization |
| Manual approve → bridge → swap | One confirmation, all steps automatic |
| No integration landing point | Smart contract tracks intent on Solana |

---

## 🏗️ Architecture

### Frontend (React + Vite)
- **Framework:** React 19 + TanStack Router + TanStack Start
- **Chat UI:** Real-time message stream with AI responses
- **Wallet Connection:** Phantom integration for both EVM and Solana signing
- **State Management:** React hooks + server functions
- **Styling:** Tailwind CSS 4.2 + shadcn/ui components

### Backend (Server Functions)
- **Intent Parsing:** LLM-powered (Gemini / Anthropic)
- **Route Planning:** LI.FI REST API integration
- **Execution Tracking:** In-memory ledger of transactions

### Smart Contract (Solana)
- **Language:** Rust (Anchor framework)
- **Program ID:** `AoC6gRnhkN8TpueJoNpwXA9i47zYg5QpUu3voTL9284R`
- **Key Accounts:**
  - `IntentRegistry`: Stores completed intents
  - `UserProfile`: Tracks user activity and balance
- **Key Instructions:**
  - `register_intent`: Record a completed cross-chain intent
  - `initialize_user`: Create user account
  - `record_settlement`: Mark intent as settled

### Cross-Chain Data Flow
```
User Input (Natural Language)
    ↓
AI Intent Parser (Gemini/Anthropic)
    ↓
LI.FI Route Fetcher (REST API)
    ↓
Route Confirmation (User signature)
    ↓
Bridge Execution (Source chain)
    ↓
Swap Execution (Destination chain)
    ↓
Solana Settlement (Smart Contract)
    ↓
Balance Update
```

---

## 🔌 LI.FI Integration Details

### Endpoints Used
1. **Quote Endpoint:** `GET /quote`
   - Input: `fromChain`, `toChain`, `fromToken`, `toToken`, `fromAmount`
   - Output: `estimate` (gasCost, feeCosts, executionDuration), `routes`

2. **Route Endpoint:** `GET /route`
   - Input: Route selection from available options
   - Output: Step-by-step execution instructions

### Real Example Flow
```
User: "Put $50 from Base USDC into Drift on Solana"

LI.FI Query:
{
  "fromChain": 8453,  // Base
  "toChain": 1151111081099710,  // Solana
  "fromToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  // USDC
  "toToken": "USDC",
  "fromAmount": "50000000",  // 50 USDC (6 decimals)
  "slippage": 0.01,
  "allowBridges": ["stargate", "wormhole"]
}

LI.FI Response:
{
  "estimate": {
    "executionDuration": 45,  // seconds
    "feeCosts": [
      { "name": "Bridge Fee", "amount": "$0.60" },
      { "name": "Swap Fee", "amount": "$0.60" }
    ]
  },
  "routes": [
    {
      "steps": [
        { "tool": "stargate", "action": "bridge", "sellToken": "USDC", "buyToken": "USDC" },
        { "tool": "jupiter", "action": "swap", "sellToken": "USDC", "buyToken": "SOL" }
      ],
      "estimate": { "toAmount": "45000000" }  // ~45 SOL after fees
    }
  ]
}
```

### Implementation Location
- **Server-side route planning:** [src/lib/overlord.server.ts](./src/lib/overlord.server.ts) → `fetchLifiQuote()`
- **Quote generation:** LI.FI REST API call with real-time pricing
- **Fallback parser:** Heuristic route builder if API unavailable

---

## 🎮 User Flows Supported

### Flow A: Basic Bridge + Swap
**User:** "Move $100 from Base to Solana as SOL"
- Parse intent: Base USDC → Solana SOL
- Fetch LI.FI route: Find cheapest bridge + swap combo
- Execute: Approve USDC → Bridge → Swap to SOL → Land in wallet

### Flow B: Solana App Funding
**User:** "Fund my Drift account with $200 Base USDC"
- Parse intent: Base USDC → Solana USDC → Drift deposit
- Fetch LI.FI route: Bridge to Solana USDC
- Execute: Approve → Bridge → Deposit to Drift perp account

### Flow C: Token Purchase
**User:** "Buy BONK with $50 from Base USDC"
- Parse intent: Base USDC → Solana BONK
- Fetch LI.FI route: Bridge to Solana, then swap to BONK
- Execute: Approve → Bridge → Swap to BONK → Land in wallet

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+ (for Anchor builds)
- Solana CLI
- Phantom wallet

### Installation
```bash
git clone https://github.com/RockZ37/lovable-frontend.git
cd lovable-frontend
pnpm install
cp .env.example .env.local
```

### Configuration
```bash
# .env.local
VITE_OVERLORD_PROGRAM_ID=AoC6gRnhkN8TpueJoNpwXA9i47zYg5QpUu3voTL9284R
FAKE_EXECUTION=true          # Enable demo mode
VITE_FAKE_EXECUTION=true     # Client-side demo
AI_PROVIDER=gemini           # LLM for intent parsing
```

### Run Locally
```bash
pnpm dev
# Opens http://localhost:5173
# Click "Try the demo" or navigate to /app?fake=1
```

### Try the Demo
1. Click "Try the demo" button on homepage
2. Type: "Put $50 from Base to Solana"
3. Review the AI-generated route
4. Click "Confirm" to simulate execution
5. Watch balance update in sidebar

### Deploy Smart Contract
```bash
anchor build
anchor deploy --provider.cluster devnet
```

---

## 📊 Technical Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, TanStack Router, Tailwind CSS |
| **UI Components** | shadcn/ui, Radix, Lucide icons |
| **Smart Contract** | Anchor, Rust, Solana |
| **AI/LLM** | Gemini / Anthropic Claude |
| **Cross-Chain** | LI.FI REST API |
| **Wallet** | Phantom Wallet SDK |
| **State Management** | React hooks |
| **Build Tools** | pnpm, Vite, Rust cargo |

---

## 🔐 Security & Testing

- **Demo Mode Safety:** `FAKE_EXECUTION=true` prevents real fund movement
- **Fallback Parsing:** Works without LI.FI API (heuristic route builder)
- **Wallet Confirmation:** Every transaction requires user signature
- **Smart Contract Security:** Anchor-based validation, PDA-secured accounts

---

## 📚 Documentation

- **Full README:** [README.md](./README.md)
- **Smart Contract:** [programs/overlord/](./programs/overlord/)
- **Server Functions:** [src/lib/overlord.server.ts](./src/lib/overlord.server.ts)
- **Execution Engine:** [src/lib/solana-execution.ts](./src/lib/solana-execution.ts)

---

## 🎯 Key Achievements

✅ **AI-powered intent parsing** — Natural language → structured execution plan  
✅ **Real LI.FI integration** — Live quote fetching and route optimization  
✅ **Solana smart contract** — On-chain intent registry for settlement  
✅ **Cross-chain orchestration** — Approve → bridge → swap → Solana delivery  
✅ **Production-ready UI** — Chat, wallet confirmation, progress tracking  
✅ **Demo mode included** — Test without real funds  
✅ **Complete documentation** — Setup, build, deploy, troubleshoot  

---

## 📞 Support

For questions or issues:
1. Check [README.md](./README.md) troubleshooting section
2. Review .env configuration
3. Ensure Phantom wallet is connected to Solana Devnet
4. Check LI.FI API availability (fallback parser will activate if down)

---

**Built for the Solana x LI.FI Hackathon**  
Program ID: `AoC6gRnhkN8TpueJoNpwXA9i47zYg5QpUu3voTL9284R` (Devnet)  
Repository: https://github.com/RockZ37/lovable-frontend
