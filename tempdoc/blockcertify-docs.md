# BlockCertify — Full Project Documentation

> Blockchain-based document verification system using Express.js, Hardhat 3, Solidity, and Ethers.js

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Setup & Installation](#setup--installation)
5. [How It Works](#how-it-works)
6. [Smart Contract](#smart-contract)
7. [Backend API](#backend-api)
8. [Frontend](#frontend)
9. [Run Order](#run-order)
10. [API Reference](#api-reference)
11. [Issues Faced & Fixes](#issues-faced--fixes)
12. [Current Status](#current-status)
13. [Next Steps (Roadmap)](#next-steps-roadmap)

---

## Project Overview

BlockCertify lets users:
- **Upload** any document → generates SHA-256 hash → stores hash permanently on blockchain
- **Verify** any document → regenerates hash → checks against blockchain → returns authentic/not found

The document itself is never stored anywhere. Only its cryptographic fingerprint (hash) goes on-chain. This makes tampering detectable — even a 1-byte change produces a completely different hash.

**Final flow:**
```
Upload → SHA-256 Hash → Store on Blockchain (addDocument)
Verify → SHA-256 Hash → Query Blockchain  (verifyDocument) → true/false
```

---

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Backend        | Node.js, Express.js, Multer         |
| Blockchain Dev | Hardhat 3 (beta)                    |
| Smart Contract | Solidity ^0.8.0                     |
| Blockchain Lib | Ethers.js v6                        |
| Hashing        | Node.js `crypto` (SHA-256)          |
| Frontend       | Vanilla HTML/CSS/JS                 |
| Environment    | dotenv                              |
| Module System  | ESM (`"type": "module"`)            |
| Local Network  | Hardhat EDR node (localhost:8545)   |

---

## Project Structure

```
blockcertify/
├── .env                          # Private key (never commit this)
├── .gitignore
├── package.json                  # "type": "module" — ESM throughout
├── tsconfig.json
├── hardhat.config.ts             # Hardhat 3 config
│
├── index.js                      # Express backend + blockchain connection
├── index.html                    # Frontend UI (served statically)
│
├── contracts/
│   └── DocumentVerification.sol  # Core smart contract
│
├── scripts/
│   └── deploy.js                 # Deploys contract, saves address to JSON
│
├── artifacts/                    # Auto-generated after compile
│   └── contracts/
│       └── DocumentVerification.sol/
│           └── DocumentVerification.json  # ABI + bytecode
│
├── contract-address.json         # Auto-generated after deploy
├── uploads/                      # Empty — multer uses memory storage
└── tempdoc/                      # Project notes
```

---

## Setup & Installation

### Prerequisites
- Node.js v18+
- npm

### Install dependencies
```bash
npm install express multer cors dotenv ethers
npm install --save-dev hardhat @nomicfoundation/hardhat-ethers typescript ts-node
```

### Create `.env` file
```env
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
> Use any private key printed by `npx hardhat node`. The above is Hardhat's default Account #0 — safe for local dev only.

---

## How It Works

### Upload Flow
```
User drops file
    → Frontend sends POST /upload (multipart form-data)
    → Backend reads file buffer
    → crypto.createHash('sha256').update(buffer).digest('hex')
    → contract.addDocument(hash)  ← writes to blockchain
    → tx.wait()                   ← waits for confirmation
    → returns { hash, txHash }
```

### Verify Flow
```
User drops file
    → Frontend sends POST /verify (multipart form-data)
    → Backend hashes the file the same way
    → contract.verifyDocument(hash)  ← reads from blockchain
    → returns { verified: true/false }
```

---

## Smart Contract

**File:** `contracts/DocumentVerification.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentVerification {
    mapping(string => bool) private documents;

    function addDocument(string memory hash) public {
        documents[hash] = true;
    }

    function verifyDocument(string memory hash) public view returns (bool) {
        return documents[hash];
    }
}
```

**How it works:**
- `documents` is a mapping from hash string → boolean
- `addDocument` sets a hash to `true` — permanently on-chain
- `verifyDocument` reads the mapping — free (view function, no gas)

---

## Backend API

**File:** `index.js`

### Key sections:

```javascript
// ESM imports (required because package.json has "type": "module")
import express from "express";
import { ethers } from "ethers";
import { fileURLToPath } from "url";
import path from "path";

// __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve index.html from project root
app.use(express.static(__dirname));

// Connect to local Hardhat node
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Load ABI from compiled artifact
const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/...json"));

// Load deployed contract address
const { address } = JSON.parse(fs.readFileSync("./contract-address.json"));

// Create contract instance
const contract = new ethers.Contract(address, artifact.abi, wallet);
```

---

## Frontend

**File:** `index.html` (served at `http://localhost:3000`)

Features:
- Dark blockchain-themed UI
- Drag & drop or browse file upload
- Two tabs: Upload and Verify
- Shows SHA-256 hash, transaction hash after upload
- Shows VERIFIED / NOT FOUND badge after verify
- Calls `localhost:3000/upload` and `localhost:3000/verify`

---

## Hardhat Config

**File:** `hardhat.config.ts`

```typescript
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";
dotenv.config();

export default {
  solidity: "0.8.20",
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  networks: {
    hardhat: {
      type: "edr-simulated",   // Required in Hardhat 3
    },
    localhost: {
      type: "http",            // Required in Hardhat 3
      url: "http://127.0.0.1:8545",
    },
  },
};
```

> **Hardhat 3 breaking change:** Networks require explicit `type` field.
> `"edr-simulated"` for local node, `"http"` for any RPC endpoint.

---

## Deployment Script

**File:** `scripts/deploy.js`

```javascript
import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const artifact = JSON.parse(fs.readFileSync("./artifacts/.../DocumentVerification.json"));

const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy();
await contract.waitForDeployment();

const address = await contract.getAddress();

// Saves address so index.js can read it automatically
fs.writeFileSync("./contract-address.json", JSON.stringify({ address }, null, 2));
```

After running, `contract-address.json` is created:
```json
{ "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3" }
```

---

## Run Order

Every time you start the project, run in this order:

```bash
# Terminal 1 — Start local blockchain (keep running)
npx hardhat node

# Terminal 2 — Compile contract (only needed if .sol changed)
npx hardhat compile

# Terminal 2 — Deploy contract (only needed after compile or fresh start)
node scripts/deploy.js

# Terminal 2 — Start backend + frontend
node index.js
```

Then open: **http://localhost:3000**

> ⚠️ If you stop the Hardhat node, all on-chain data is lost.
> You must re-run `node scripts/deploy.js` every time you restart the node.

---

## API Reference

### `POST /upload`
Hashes file and stores on blockchain.

**Request:** `multipart/form-data` with field `file`

**Response:**
```json
{
  "message": "Stored on blockchain ✅",
  "hash": "a3f1c...",
  "txHash": "0xabc123..."
}
```

---

### `POST /verify`
Hashes file and checks blockchain.

**Request:** `multipart/form-data` with field `file`

**Response:**
```json
{
  "hash": "a3f1c...",
  "verified": true,
  "message": "✅ Document is authentic and exists on blockchain"
}
```

---

## Issues Faced & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `require is not defined` | `package.json` has `"type":"module"` | Use `import` syntax everywhere |
| `__dirname is not defined` | ESM has no `__dirname` | Reconstruct via `fileURLToPath(import.meta.url)` |
| `Cannot GET /` | `index.html` not in project root | Place `index.html` next to `index.js` |
| `Invalid discriminator value` | Hardhat 3 requires network `type` field | Add `type: "edr-simulated"` / `"http"` |
| `No contracts to compile` | Hardhat couldn't find contracts folder | Add `paths.sources: "./contracts"` to config |
| Postman 500 error on upload | Sending JSON body instead of form-data | Switch to `form-data` in Postman |
| `hardhat-ethers` plugin error | Plugin version mismatch with Hardhat 3 | Use correct Hardhat 3 compatible plugin |

---

## Current Status

| Component         | Status |
|-------------------|--------|
| Backend (Express) | ✅ Working |
| SHA-256 Hashing   | ✅ Working |
| Smart Contract    | ✅ Compiled & Deployed |
| Local Blockchain  | ✅ Running (Hardhat node) |
| Upload API        | ✅ Stores hash on-chain |
| Verify API        | ✅ Queries hash from chain |
| Frontend UI       | ✅ Working at localhost:3000 |

---

## Next Steps (Roadmap)

### Step 2 — Deploy to Sepolia Testnet
- Get Sepolia ETH from faucet
- Add Sepolia network config to `hardhat.config.ts`
- Set `SEPOLIA_RPC_URL` and `PRIVATE_KEY` in `.env`
- Run `node scripts/deploy.js` targeting Sepolia
- Update backend provider URL

### Step 3 — Add Metadata to Contract
- Store uploader address, timestamp, filename alongside hash
- Update `DocumentVerification.sol` with a struct:
```solidity
struct Document {
    address uploader;
    uint256 timestamp;
    string fileName;
}
mapping(string => Document) private documents;
```

### Step 4 — Generate Certificate PDF
- After successful upload, generate a downloadable PDF receipt
- Include: file name, hash, tx hash, timestamp, contract address
- Use a library like `pdfkit` in the backend

---

## Important Notes

- **Never commit `.env`** — add it to `.gitignore`
- **Hardhat 3 is beta** — APIs may change; check changelog before upgrading
- **Local chain resets** on every `npx hardhat node` restart — redeploy contract each time
- **ESM throughout** — all files use `import/export`, never `require()`
- **`contract-address.json`** bridges deploy script → backend — don't delete it
- Multer uses **memory storage** — files are never saved to disk, only hashed in RAM
