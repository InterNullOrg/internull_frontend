# InterNull Frontend

A cross-chain privacy application that enables anonymous transfers across multiple blockchains using distributed key generation (DKG) and ECDSA threshold signatures.

**Live Testnet:** [testnet.internull.xyz](https://testnet.internull.xyz)

## Overview

InterNull allows users to deposit funds on one blockchain and withdraw them anonymously on the same or different chain. The system breaks the on-chain link between deposit and withdrawal addresses using cryptographic techniques.

### How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Deposit   │ ──▶ │   Request   │ ──▶ │   Receive   │ ──▶ │   Withdraw  │
│   Funds     │     │    Keys     │     │    Keys     │     │  Anywhere   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     ETH/SOL           Sign Message        DKG Keys          Any Chain
```

1. **Deposit**: Send funds to the treasury smart contract on any supported chain
2. **Request Keys**: Sign a message to request withdrawal keys from DKG nodes
3. **Receive Keys**: Get ECDSA keys generated through distributed key generation
4. **Withdraw**: Use your keys to withdraw funds anonymously on any supported chain

## Supported Chains

| Chain | Network | Native Token | Status |
|-------|---------|--------------|--------|
| Ethereum | Sepolia Testnet | ETH | ✅ Live |
| BNB Chain | BNB Testnet | BNB | ✅ Live |
| Base | Base Sepolia | ETH | ✅ Live |
| Polygon | Amoy Testnet | MATIC | ✅ Live |
| Hyperliquid | Testnet | HYPE | ✅ Live |
| Solana | Devnet | SOL | ✅ Live |

### Supported Tokens

Each chain supports multiple tokens including native tokens and wrapped assets. Token mappings enable cross-chain withdrawals (e.g., deposit ETH on Ethereum, withdraw WETH on Polygon).

**Supported Denominations:** 0.001, 0.01, 0.1, 0.5, 1.0 per token

## Features

### Cross-Chain Privacy
- Deposit on one chain, withdraw on another
- Break the link between deposit and withdrawal addresses
- Split deposits into multiple withdrawal keys across different chains

### Multi-Wallet Support
- **MetaMask** for EVM chains (Ethereum, BNB, Base, Polygon, Hyperliquid)
- **Phantom** for Solana

### Key Management
- Encrypted key storage with password protection
- Download/upload key files for backup
- View key status and usage history

### User Flow
1. **Landing Page** → Click "Launch Testnet" to enter the app
2. **Deposit Page** (`/deposit`) → Select chain, token, amount and make deposit
3. **Manage Keys** (`/dashboard`) → View deposits and request withdrawal keys
4. **Withdraw** → Use keys to withdraw funds anonymously

## Tech Stack

- **Frontend**: React 18, Material-UI
- **Wallet Integration**: ethers.js, @solana/wallet-adapter
- **State Management**: React Context
- **Build Tool**: Create React App with CRACO

## Project Structure

```
src/
├── components/
│   ├── Header.js              # Navigation with unified wallet dropdown
│   ├── WalletSelector.js      # Wallet selection dialog
│   ├── PasswordDialog.js      # Password input for key encryption
│   └── ChainLogos.js          # Chain logo components
├── pages/
│   ├── Landing.js             # Homepage with "Launch Testnet" CTA
│   ├── InterNull.js           # Deposit flow (/deposit)
│   ├── Dashboard.js           # Key management (/dashboard)
│   ├── History.js             # Transaction history
│   ├── Docs.js                # Documentation
│   └── TechnicalPaper.js      # Research paper viewer
├── hooks/
│   ├── useWallet.js           # EVM wallet hook (MetaMask)
│   ├── useSolanaWallet.js     # Solana wallet provider
│   └── useTokenMappings.js    # Cross-chain token mappings
├── services/
│   ├── multiTokenTreasuryService.js   # EVM treasury interactions
│   ├── solanaInternullService.js      # Solana program interactions
│   ├── singleNodeWithdrawal.js        # Key request & withdrawal
│   ├── depositTracker.js              # Local deposit tracking
│   └── withdrawalServiceECDSA.js      # ECDSA withdrawal logic
└── utils/
    ├── keyEncryption.js       # Key file encryption/decryption
    ├── downloadHelper.js      # Key file download utilities
    └── uploadHelper.js        # Key file upload utilities
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask browser extension (for EVM chains)
- Phantom browser extension (for Solana)

### Installation

```bash
# Clone the repository
git clone https://github.com/InterNullOrg/internull_frontend.git
cd internull_frontend

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at http://localhost:3000

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Backend API
REACT_APP_API_URL=https://api.internull.xyz

# EVM Configuration
REACT_APP_CHAIN_ID=11155111
REACT_APP_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Solana Configuration
REACT_APP_SOLANA_NETWORK=devnet
REACT_APP_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Build for Production

```bash
npm run build
```

Build output will be in the `build/` directory.

## Deployment

### Docker

```bash
# Build image
docker build -t internull-frontend .

# Run container
docker run -p 80:80 internull-frontend
```

### Static Hosting

The build output can be deployed to any static hosting service:
- Render
- Vercel
- Netlify
- AWS S3 + CloudFront

## User Guide

### Making a Deposit

1. Connect your wallet (MetaMask for EVM, Phantom for Solana)
2. Go to the Deposit page (`/deposit`)
3. Select your source chain
4. Choose token and enter amount
5. Click "Get Reservation" to reserve your slot
6. Click "Make Deposit" and confirm the transaction
7. After confirmation, click "Go to Manage Keys"

### Requesting Withdrawal Keys

1. Go to Manage Keys (`/dashboard`)
2. Find your deposit in the list
3. Click "Request Keys"
4. Configure your withdrawal:
   - Select target chain(s)
   - Choose token(s) for each chain
   - Set denomination amounts
5. Sign the message with your wallet
6. Keys will be generated and displayed

### Withdrawing Funds

1. In Manage Keys, find a deposit with available keys
2. Click "Withdraw" on the key you want to use
3. Enter the destination address
4. Confirm the withdrawal transaction
5. Funds will be sent to your specified address

### Key Backup

1. In Manage Keys, click the download icon on any key
2. Enter a password to encrypt the key file
3. Save the `.json` file securely
4. To restore: click upload and enter your password

## Security

- Private keys are generated through distributed key generation (DKG)
- Keys are encrypted client-side before storage
- No private keys are ever transmitted to servers
- Each key can only be used once (one-time signatures)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Links

- **Website**: [internull.xyz](https://internull.xyz)
- **Testnet**: [testnet.internull.xyz](https://testnet.internull.xyz)
- **Documentation**: [docs](https://testnet.internull.xyz/docs)
- **GitHub**: [InterNullOrg](https://github.com/InterNullOrg)

## License

MIT License - see LICENSE file for details.
