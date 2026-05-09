# Project Overlord — Lovable Frontend

> AI-driven cross-chain intent executor: bridge, swap and land liquidity into Solana with a single sentence.

This repository contains the frontend and Anchor program wiring for Project Overlord. The frontend is a Vite + React app with server entry points for edge deployment. The Anchor Rust program `overlord` provides an on-chain intent registry.

---

## Quick facts
- Program ID (declared in the on-chain program): `AoC6gRnhkN8TpueJoNpwXA9i47zYg5QpUu3voTL9284R`
- Frontend framework: Vite + React + TanStack Router
- On-chain program: Anchor (Rust) in `programs/overlord`

Files of interest:
- Anchor config: [Anchor.toml](Anchor.toml)
- On-chain program: [programs/overlord/src/lib.rs](programs/overlord/src/lib.rs)
- Frontend entry: [src/start.ts](src/start.ts)
- Server worker: [src/server.ts](src/server.ts)
- Env example: [.env.example](.env.example)

---

## Prerequisites

- Node 18+ and a package manager (npm, pnpm, or yarn)
- Rust toolchain (`rustup`) for building the Anchor program
- Solana CLI (`solana`) for on-chain operations
- Anchor CLI and `cargo-build-sbf` to build SBF artifacts
- (Optional) Cloudflare Wrangler if deploying the server to Workers

If you only plan to run the frontend locally you need Node and the project dependencies.

---

## Install dependencies

Using npm:

```bash
npm install
```

Or with pnpm:

```bash
pnpm install
```

---

## Local development

Start the Vite dev server:

```bash
npm run dev
# or
pnpm dev
```

Open http://localhost:5173 (Vite default) to view the app.

---

## Environment

Copy the example env and fill required keys:

```bash
cp .env.example .env.local
# Edit .env.local and add your API keys (Gemini/Anthropic) and overrides
```

Important vars:
- `VITE_OVERLORD_PROGRAM_ID` — the on-chain program id the frontend uses. Default value in this repo:
  - `AoC6gRnhkN8TpueJoNpwXA9i47zYg5QpUu3voTL9284R` (declared in the program and present in `.env.example` / `.env.local`).
- `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` — AI provider keys used by the parser.
- LI.FI settings: `LIFI_API_BASE_URL`, `LIFI_FROM_ADDRESS`, `LIFI_SOLANA_CHAIN_ID`, `LIFI_TO_ADDRESS`.

Keep secrets out of version control; `.env.local` should be in `.gitignore`.

---

## Build & deploy the Anchor program (local machine)

These steps must be run on a machine with network access and the Solana toolchain installed.

1. Install Solana CLI:

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana --version
```

2. Install Rust toolchain (if not installed):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
rustup default stable
```

3. Install the SBF build tool used by Anchor:

```bash
cargo install --git https://github.com/solana-labs/cargo-build-sbf --locked
```

4. Build and deploy with Anchor (from repo root):

```bash
anchor build
anchor deploy --provider.cluster devnet
```

Notes:
- `anchor build` produces SBF binaries in `programs/overlord/target` and the program keypair at `target/deploy/overlord-keypair.json`.
- Do not commit program keypairs or other secrets.

To verify the deployed program on devnet:

```bash
solana program show AoC6gRnhkN8TpueJoNpwXA9i47zYg5QpUu3voTL9284R --url https://api.devnet.solana.com
```

---

## Edge / Cloudflare Worker

The repository includes `wrangler.jsonc` and a server entrypoint at `src/server.ts`. Use Wrangler to publish the server portion if you want an edge-hosted server.

```bash
# Install wrangler (if needed)
npm install -g wrangler

# Publish
wrangler publish
```

---

## Fake execution / local testing

For development you can enable a fake execution mode that simulates LI.FI quotes and returns fake transaction signatures so you can exercise the full UI without moving funds.

1. In `.env.local` set:

```bash
FAKE_EXECUTION=true         # server-side mock for LI.FI
VITE_FAKE_EXECUTION=true    # client-side mock for tx signatures
```

2. Start the dev server and use the app as usual. The UI will show mocked ETA, fees and simulate step progress with deterministic fake tx IDs.

This mode is safe for demos and local testing. Remember to disable it before running real deploys.

## How the intent pipeline works (high level)

1. User types a natural-language intent (e.g., “Put $45 from Base SOL into Solana SOL”).
2. The AI parser (provider selected via `AI_PROVIDER`) extracts structured fields: source chain, asset, amount, destination chain, destination action.
3. The app queries LI.FI for live routes/quotes and composes an execution plan.
4. The frontend shows the plan and requests a single signature to execute the flow (approve, bridge, swap, deposit).

Failure modes & fallback:
- If AI provider is unavailable or parsing fails, a fallback parser is used (see `.env.example`).
- If LI.FI returns no live route/quote, the UI surfaces that the live quote is unavailable and the user can retry.

---

## Troubleshooting
- `anchor build` error: missing `cargo-build-sbf` → run the `cargo install` command above.
- `bash: solana: command not found` → ensure Solana CLI install and PATH export are applied.
- Network/CI: `cargo install --git` can fail in restricted CI; consider installing `cargo-build-sbf` in a machine with git and network access.

---

## Contributing

1. Open an issue describing the change or bug.
2. Create a branch, add tests where applicable, and submit a PR.

---

If you want, I can:
- commit this `README.md` for you (I created it here).  
- add deploy scripts or CI workflows for Anchor builds and frontend deployment.  

README created by automation — tell me if you want formatting or extra sections (CI, Cloud build, or secrets management).
