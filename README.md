<<<<<<< HEAD
# PactPay — Stellar-Powered Freelance Escrow Platform

PactPay is a decentralized freelance payment escrow platform built on Stellar using **Soroban smart contracts**.

It eliminates counterparty risk in freelance engagements:
- **Clients** are protected from paying before work is verified.
- **Freelancers** are guaranteed that 100% of the funds are locked on-chain before work begins.
- Payments release automatically milestone-by-milestone directly from the smart contract upon client approval.
- Deadlocks are resolved through multi-sig or designated arbiter dispute resolution.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │              PactPay Frontend                │
                      │  React 19 + TypeScript + Tailwind + Vite    │
                      └──────────────┬───────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
     (Sign Challenges / Contracts)            (REST APIs / JWT Session)
                 │                                       │
                 ▼                                       ▼
     ┌───────────────────────┐               ┌───────────────────────┐
     │   Freighter Wallet    │               │  Express TypeScript   │
     │   (Stellar Testnet)   │               │        Backend        │
     └───────────┬───────────┘               └───────────┬───────────┘
                 │                                       │
      (Invoke & Sign XDR)                      (Verify Events & RPC)
                 │                                       │
                 ▼                                       ▼
     ┌───────────────────────┐               ┌───────────────────────┐
     │  Soroban Escrow       │◄──────────────┤   Supabase / Postgres │
     │  Smart Contract (Rust)│  (Event Index)│   (Strict RLS Schema) │
     └───────────────────────┘               └───────────────────────┘
```

---

## Core Components

### 1. Soroban Smart Contract (`contracts/escrow`)
Implemented in Rust with `soroban-sdk v22.0.11`:
- **Agreements (`create_agreement`)**: Defines client, freelancer, arbiter, token (SAC / XLM), total amount, and structured milestones.
- **Contract Funding (`fund_agreement`)**: Transfers agreed tokens from client into the escrow contract.
- **Work Submission (`submit_milestone`)**: Freelancer submits deliverable references (GitHub pull requests, live preview links, notes).
- **Revisions (`request_revision`)**: Client requests constructive revisions with feedback notes.
- **Approval & Release (`approve_and_release`)**: Client approves; contract transfers exact milestone amount directly to freelancer.
- **Cancellations (`cancel_agreement`)**: Client can cancel unfunded draft agreements.
- **Mutual Refunds (`refund_agreement`)**: Client & freelancer mutual agreement to return remaining balance.
- **Dispute Settlement (`open_dispute` & `resolve_dispute`)**: Arbiters split remaining escrow balance upon deadlock.
- **Integer Math**: 64-bit and 128-bit integer stroop accounting ($1\text{ XLM} = 10,000,000\text{ stroops}$).
- **Storage Management**: Persistent storage with automatic TTL extension (`extend_ttl`).

### 2. Express Backend (`server/`)
- **Stellar Challenge Authentication**: Ed25519 signature verification on challenge nonces.
- **Independent On-Chain Verification**: Queries Soroban RPC and Horizon to verify transaction success and prevent replay attacks.
- **Row Level Security (RLS)**: Sets PostgreSQL session context (`app.current_wallet`) so clients and freelancers only access their own agreements.
- **REST Endpoints**: Comprehensive APIs for projects, milestones, submissions, disputes, and notifications.

### 3. Fintech Frontend (`client/`)
- **Design System**: Dark slate/navy foundation with vibrant emerald accents, glassmorphic cards, and Lucide icons.
- **Freighter Wallet Integration**: Connects via `@stellar/freighter-api`, verifies Testnet network, and reads native XLM balances.
- **Role Switcher**: Seamlessly switch between Client Dashboard (hiring) and Freelancer Dashboard (earnings).
- **Project Creation Wizard**: 4-step wizard with real-time public key validation and interactive milestone builder.
- **Interactive Escrow Manager**: Live progress bars, deliverable submission modals, revision panels, and dispute controls.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Smart Contracts** | Rust, Soroban SDK 22.0.11, `wasm32-unknown-unknown` |
| **Blockchain** | Stellar Testnet, Horizon RPC, Soroban RPC |
| **Wallet** | Freighter API (`@stellar/freighter-api`) |
| **Backend** | Node.js 22, Express, TypeScript, `@stellar/stellar-sdk` |
| **Database** | PostgreSQL 15+ / Supabase, Row Level Security (RLS) |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| **Testing** | Rust contract testutils, Node.js native test runner, tsx |

---

## Local Setup & Development

### Prerequisites
- **Node.js 22+**
- **Rust 1.80+** with `wasm32-unknown-unknown` target
- **PostgreSQL** running locally

### 1. Database Setup
```bash
createdb pactpay
createdb pactpay_test
```

### 2. Install Dependencies
```bash
cd pactpay
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```
Default connection uses local unix socket: `postgresql:///pactpay?host=/var/run/postgresql`.

### 4. Run Migrations
```bash
psql -d pactpay -f database/migrations/001_initial_schema.sql
psql -d pactpay -f database/migrations/002_rls_policies.sql
psql -d pactpay_test -f database/migrations/001_initial_schema.sql
psql -d pactpay_test -f database/migrations/002_rls_policies.sql
```

### 5. Run the Full Test Suite
```bash
npm test
```
Runs:
1. `contracts/escrow`: Rust Soroban contract unit & security tests (5 tests)
2. `server`: Backend API & RLS integration tests (5 tests)
3. `client`: Frontend Stellar & wallet integration tests (4 tests)

### 6. Start Development Servers
```bash
npm run dev
```
- **Web Client:** `http://localhost:5173`
- **API Server:** `http://localhost:3002`

---

## Testnet Deployment Guide

### 1. Compile Soroban Contract WASM
```bash
npm run build:contract
```
The optimized bytecode is generated at:
`contracts/escrow/target/wasm32-unknown-unknown/release/pactpay_escrow.wasm` (~32 KB).

### 2. Deploy Contract to Stellar Testnet
Using Stellar CLI or Node SDK:
```bash
stellar contract deploy \
  --wasm contracts/escrow/target/wasm32-unknown-unknown/release/pactpay_escrow.wasm \
  --source <YOUR_TESTNET_IDENTITY> \
  --network testnet
```
Copy the returned contract ID (e.g., `CA...`) and set it in `.env`:
```env
ESCROW_CONTRACT_ID=CA...
```

### 3. Connect Freighter Wallet on Testnet
1. Install [Freighter Wallet](https://www.freighter.app/).
2. Open Settings -> Switch Network to **Testnet**.
3. Fund your Testnet address using the Stellar Friendbot at [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=testnet).
4. Connect to PactPay at `http://localhost:5173`.

---

## Security & Threat Assessment

1. **Autonomous Financial Execution**: Funds are locked inside the Soroban contract. The server backend has no custodial ability to transfer or redirect balances.
2. **Replay & Double-Spend Protection**: The backend enforces unique constraints on transaction hashes (`tx_hash UNIQUE`). A transaction hash cannot be submitted twice.
3. **Integer Arithmetic**: All calculations in the smart contract and backend use checked BigInt stroops ($10^7$ stroops per XLM).
4. **Anti-Tampering RLS**: PostgreSQL Row Level Security enforces that only authorized project participants can read or interact with contract records.
5. **Freeze on Dispute**: Once a dispute is opened, smart contract payments are frozen until an authorized arbiter resolution occurs.

---

## License
MIT

=======
# Pactpay
PactPay — A decentralized freelance escrow platform powered by Stellar and Soroban. Secure milestone-based payments, transparent fund management, and trustless settlements between freelancers and clients.
>>>>>>> origin/main
