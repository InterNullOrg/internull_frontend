import {
  Connection,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as borsh from 'borsh';
// Using raw Solana instructions instead of Anchor to avoid IDL compatibility issues

class SolanaInternullService {
  constructor() {
    this.programId = new PublicKey('5zjh95A1KgD6R7MidR6vDUCYAoKpmKcfNhMbRBkiLsmE');
    this.connection = null;
    this.program = null;
    this.provider = null;
    this.wallet = null;
    this.backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  }

  async initialize(connection, wallet) {
    // Detect if wallet changed since last initialization
    const newPublicKey = wallet?.publicKey?.toString();
    const oldPublicKey = this.wallet?.publicKey?.toString();

    if (oldPublicKey && newPublicKey && oldPublicKey !== newPublicKey) {
      console.warn('⚠️ Solana wallet changed from', oldPublicKey, 'to', newPublicKey);
    }

    this.connection = connection;
    this.wallet = wallet;
    this.lastPublicKey = newPublicKey; // Track for change detection

    console.log('Solana Internull Service initialized (using raw instructions)');
    console.log('Program ID:', this.programId.toString());
    console.log('Wallet:', this.wallet.publicKey.toString());

    return true;
  }

  // Get treasury PDA address
  getTreasuryPDA() {
    const [treasuryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury')],
      this.programId
    );
    return treasuryPDA;
  }

  // Get merkle root PDA address
  getMerkleRootPDA(merkleRootId) {
    // Contract uses to_le_bytes() (little-endian u64 bytes), not string!
    const merkleIdBuffer = Buffer.alloc(8);
    merkleIdBuffer.writeBigUInt64LE(BigInt(merkleRootId));

    const [merkleRootPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('merkroot'),
        merkleIdBuffer
      ],
      this.programId
    );
    return merkleRootPDA;
  }

  // Get nullifier PDA address
  getNullifierPDA(merkleRootId, keyIndex) {
    const merkleIdBuffer = Buffer.alloc(8);
    merkleIdBuffer.writeBigUInt64LE(BigInt(merkleRootId));

    const keyIndexBuffer = Buffer.alloc(8);
    keyIndexBuffer.writeBigUInt64LE(BigInt(keyIndex));

    const [nullifierPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('nullifr\0'),
        merkleIdBuffer,
        keyIndexBuffer
      ],
      this.programId
    );
    return nullifierPDA;
  }

  // Deposit native SOL (using raw instructions)
  async depositNative(amount) {
    if (!this.connection || !this.wallet) {
      throw new Error('Service not initialized');
    }

    try {
      const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const treasuryPDA = this.getTreasuryPDA();

      console.log(`Depositing ${amount} SOL to Internull...`);
      console.log('Treasury PDA:', treasuryPDA.toString());
      console.log('Depositor:', this.wallet.publicKey.toString());
      console.log('Amount (lamports):', amountLamports);

      // Pre-flight check: Ensure the user's wallet has SOL for transaction fees
      const userBalance = await this.connection.getBalance(this.wallet.publicKey);
      console.log('User wallet balance (lamports):', userBalance);

      // Minimum balance needed: deposit amount + ~5000 lamports for transaction fees
      const minRequired = amountLamports + 5000;
      if (userBalance < minRequired) {
        if (userBalance === 0) {
          throw new Error(
            `Your wallet has no SOL! You need at least ${(minRequired / LAMPORTS_PER_SOL).toFixed(4)} SOL to complete this deposit. ` +
            `Please use 'solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet' or a Devnet faucet to get free SOL.`
          );
        }
        throw new Error(
          `Insufficient balance. You have ${(userBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL but need at least ${(minRequired / LAMPORTS_PER_SOL).toFixed(4)} SOL ` +
          `(${amount} SOL deposit + fees).`
        );
      }

      // Create instruction data
      // Format: [discriminator (8 bytes)] + [amount (8 bytes, little-endian u64)]
      const discriminator = Buffer.from([13, 158, 13, 223, 95, 213, 28, 6]); // deposit_native discriminator (SHA256("global:deposit_native"))
      const amountBuffer = Buffer.alloc(8);
      amountBuffer.writeBigUInt64LE(BigInt(amountLamports));
      const data = Buffer.concat([discriminator, amountBuffer]);

      console.log('Instruction data:', {
        discriminator: Array.from(discriminator),
        amount: amountLamports,
        amountBuffer: Array.from(amountBuffer),
        totalData: Array.from(data)
      });

      // Create transaction instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: treasuryPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data,
      });

      console.log('Instruction created:', {
        programId: this.programId.toString(),
        accounts: instruction.keys.map(k => ({
          pubkey: k.pubkey.toString(),
          isSigner: k.isSigner,
          isWritable: k.isWritable
        }))
      });

      // Create and send transaction using wallet adapter's sendTransaction
      const transaction = new Transaction().add(instruction);

      // Get latest blockhash and set fee payer
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      console.log('Sending transaction...');
      console.log('Transaction details:', {
        feePayer: transaction.feePayer.toString(),
        recentBlockhash: transaction.recentBlockhash,
        instructions: transaction.instructions.length
      });

      // Note: We skip manual simulation here because:
      // 1. The wallet adapter (Phantom) already simulates before signing
      // 2. Different web3.js versions have incompatible simulateTransaction APIs
      // 3. The actual send will fail with a clear error if there's an issue
      console.log('Proceeding directly to wallet signing (wallet will simulate automatically)...');

      // Use wallet.signTransaction if available, otherwise use sendTransaction
      try {
        let signature;

        if (this.wallet.signTransaction) {
          // Sign the transaction with the wallet
          console.log('Signing transaction with wallet...');
          const signedTransaction = await this.wallet.signTransaction(transaction);

          // Send the signed transaction
          console.log('Sending signed transaction...');
          signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
        } else {
          // Fall back to sendTransaction if signTransaction is not available
          console.log('Using wallet sendTransaction...');
          signature = await this.wallet.sendTransaction(transaction, this.connection);
        }

        console.log('Deposit transaction signature:', signature);

        // Wait for confirmation
        await this.connection.confirmTransaction(signature, 'confirmed');

        return {
          success: true,
          txHash: signature,
          signature
        };
      } catch (sendError) {
        console.error('Transaction send error:', sendError);
        console.error('Error name:', sendError.name);
        console.error('Error message:', sendError.message);
        console.error('Error logs:', sendError.logs);
        console.error('Full error object:', JSON.stringify(sendError, Object.getOwnPropertyNames(sendError)));

        // Try to get more details from the error
        if (sendError.logs && sendError.logs.length > 0) {
          console.error('Transaction simulation logs:', sendError.logs);
        }

        // Provide more specific error message
        let errorMessage = sendError.message || 'Unknown error';
        if (sendError.toString) {
          errorMessage = sendError.toString();
        }

        throw new Error(`Transaction failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Deposit error:', error);
      throw error;
    }
  }

  // Deposit SPL tokens
  async depositToken(amount, tokenMint, tokenDecimals = 6) {
    if (!this.connection || !this.wallet) {
      throw new Error('Service not initialized');
    }

    try {
      const amountBaseUnits = Math.floor(amount * Math.pow(10, tokenDecimals));
      const treasuryPDA = this.getTreasuryPDA();
      const tokenMintPubkey = new PublicKey(tokenMint);

      console.log(`Depositing ${amount} tokens (${amountBaseUnits} base units) to Internull...`);
      console.log('Treasury PDA:', treasuryPDA.toString());
      console.log('Token mint:', tokenMintPubkey.toString());
      console.log('Depositor:', this.wallet.publicKey.toString());

      // Derive token_config PDA
      const [tokenConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('token_config'), tokenMintPubkey.toBuffer()],
        this.programId
      );

      // Get depositor's token account
      const depositorTokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        this.wallet.publicKey
      );

      // Get treasury's token account
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        treasuryPDA,
        true  // allowOwnerOffCurve
      );

      console.log('Token config PDA:', tokenConfigPDA.toString());
      console.log('Depositor token account:', depositorTokenAccount.toString());
      console.log('Treasury token account:', treasuryTokenAccount.toString());

      // Check if treasury token account exists
      const treasuryTokenAccountInfo = await this.connection.getAccountInfo(treasuryTokenAccount);

      // Create instruction data
      // deposit_token discriminator from IDL: [11, 156, 96, 218, 39, 163, 180, 19]
      const discriminator = Buffer.from([11, 156, 96, 218, 39, 163, 180, 19]);
      const amountBuffer = Buffer.alloc(8);
      amountBuffer.writeBigUInt64LE(BigInt(amountBaseUnits));
      const data = Buffer.concat([discriminator, amountBuffer]);

      // Build transaction
      const transaction = new Transaction();

      // If treasury token account doesn't exist, create it first
      if (!treasuryTokenAccountInfo) {
        console.log('⚠️  Treasury token account does not exist - creating it...');
        const createTreasuryATAInstruction = createAssociatedTokenAccountInstruction(
          this.wallet.publicKey,  // payer
          treasuryTokenAccount,  // ATA address
          treasuryPDA,  // owner
          tokenMintPubkey  // mint
        );
        transaction.add(createTreasuryATAInstruction);
      }

      // Create deposit instruction
      const depositInstruction = new TransactionInstruction({
        keys: [
          { pubkey: treasuryPDA, isSigner: false, isWritable: true },
          { pubkey: tokenConfigPDA, isSigner: false, isWritable: false },
          { pubkey: tokenMintPubkey, isSigner: false, isWritable: false },
          { pubkey: depositorTokenAccount, isSigner: false, isWritable: true },
          { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data,
      });

      transaction.add(depositInstruction);

      // Get latest blockhash and set fee payer
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      console.log('Sending transaction...');

      // Simulate transaction first
      try {
        console.log('Simulating transaction...');
        const simulation = await this.connection.simulateTransaction(transaction);
        console.log('Simulation result:', simulation);

        if (simulation.value.err) {
          console.error('Simulation failed:', simulation.value.err);
          console.error('Simulation logs:', simulation.value.logs);
          throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }

        console.log('Simulation successful! Proceeding with signing and sending...');
      } catch (simError) {
        console.error('Simulation error:', simError);
        throw simError;
      }

      // Send transaction
      let signature;
      if (this.wallet.signTransaction) {
        const signedTransaction = await this.wallet.signTransaction(transaction);
        signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
      } else {
        signature = await this.wallet.sendTransaction(transaction, this.connection);
      }

      console.log('Deposit transaction signature:', signature);

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      return {
        success: true,
        txHash: signature,
        signature
      };
    } catch (error) {
      console.error('Token deposit error:', error);
      throw error;
    }
  }

  // Get treasury balance
  async getTreasuryBalance() {
    if (!this.connection) {
      throw new Error('Service not initialized');
    }

    try {
      const treasuryPDA = this.getTreasuryPDA();
      const balance = await this.connection.getBalance(treasuryPDA);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting treasury balance:', error);
      return 0;
    }
  }

  // Get treasury state (raw account fetch)
  async getTreasuryState(connection = null) {
    // Use provided connection or fall back to instance connection
    const conn = connection || this.connection;

    if (!conn) {
      throw new Error('Service not initialized');
    }

    try {
      const treasuryPDA = this.getTreasuryPDA();
      const accountInfo = await conn.getAccountInfo(treasuryPDA);

      if (!accountInfo) {
        console.error('Treasury account not found');
        return null;
      }

      // Parse account data (skipping 8-byte discriminator)
      const data = accountInfo.data;
      let offset = 8; // Skip discriminator

      // Read fields in order: admin (32), bump (1), paused (1), next_merkle_id (8),
      // native_total_deposited (8), native_total_withdrawn (8), native_total_fees (8)
      const admin = new PublicKey(data.subarray(offset, offset + 32));
      offset += 32;

      const bump = data[offset];
      offset += 1;

      const paused = data[offset] !== 0;
      offset += 1;

      const nextMerkleId = data.readBigUInt64LE(offset);
      offset += 8;

      const nativeTotalDeposited = data.readBigUInt64LE(offset);
      offset += 8;

      const nativeTotalWithdrawn = data.readBigUInt64LE(offset);
      offset += 8;

      const nativeTotalFees = data.readBigUInt64LE(offset);

      return {
        admin: admin.toString(),
        paused,
        nextMerkleId: nextMerkleId.toString(),
        nativeTotalDeposited: nativeTotalDeposited.toString(),
        nativeTotalWithdrawn: nativeTotalWithdrawn.toString(),
        nativeTotalFees: nativeTotalFees.toString(),
      };
    } catch (error) {
      console.error('Error getting treasury state:', error);
      return null;
    }
  }

  // Get wallet balance
  async getWalletBalance(walletAddress) {
    if (!this.connection) {
      throw new Error('Service not initialized');
    }

    try {
      const publicKey = typeof walletAddress === 'string'
        ? new PublicKey(walletAddress)
        : walletAddress;

      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return 0;
    }
  }

  // Request withdrawal keys from backend (uses same endpoint as EVM)
  // Parameters:
  //   - depositTx: deposit transaction hash
  //   - sourceChain: chain where deposit was made
  //   - withdrawalRequests: array of {target_chain, token_symbol, denomination}
  //   - userAddress: user's wallet address
  //   - signature: signed message (hex string with 0x prefix)
  //   - timestamp: unix timestamp
  async requestCrossChainKeys(depositTx, sourceChain, withdrawalRequests, userAddress, signature, timestamp) {
    try {
      console.log('📤 Sending withdrawal request to backend:', {
        deposit_tx: depositTx,
        source_chain: sourceChain,
        withdrawal_requests: withdrawalRequests,
        user_address: userAddress,
        timestamp: timestamp
      });

      // Use the same endpoint as EVM for consistency
      const response = await fetch(`${this.backendUrl}/api/v1/cross-chain/request-mixed-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_address: userAddress,
          deposit_tx: depositTx,
          source_chain: sourceChain,
          withdrawal_requests: withdrawalRequests,
          signature: signature,
          timestamp: timestamp
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Backend error response:', errorData);

        // Handle validation errors (422 responses with detail array)
        if (errorData.detail && Array.isArray(errorData.detail)) {
          const validationErrors = errorData.detail.map(err => {
            if (typeof err === 'object' && err.msg) {
              return `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`;
            }
            return JSON.stringify(err);
          }).join('; ');
          throw new Error(validationErrors);
        }

        throw new Error(errorData.detail || errorData.error || 'Failed to request withdrawal keys');
      }

      const result = await response.json();
      console.log('✅ Backend response:', result);
      return result;
    } catch (error) {
      console.error('❌ Error requesting withdrawal keys:', error);
      throw error;
    }
  }

  // Get supported tokens from backend
  async getSupportedTokens() {
    try {
      const response = await fetch(`${this.backendUrl}/api/v1/cross-chain/chain-tokens/solana-devnet`);
      const data = await response.json();

      if (data.success && data.tokens) {
        return data.tokens.map(token => ({
          address: token.token_address,
          symbol: token.token_symbol,
          name: token.name,
          decimals: token.decimals,
          isNative: token.token_address === SystemProgram.programId.toString(),
          denominations: token.supported_denominations || []
        }));
      }

      // Return default SOL token if backend not available
      return [{
        address: SystemProgram.programId.toString(),
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        isNative: true,
        denominations: [0.1, 1, 10]
      }];
    } catch (error) {
      console.warn('Backend not available, using default tokens');
      return [{
        address: SystemProgram.programId.toString(),
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        isNative: true,
        denominations: [0.1, 1, 10]
      }];
    }
  }

  // Execute withdrawal with a pre-generated key
  async executeWithdrawal(keyData, recipientAddress, connection, phantomWallet) {
    try {
      console.log('🟣 Starting Solana withdrawal execution...');
      console.log('Key data:', {
        keyIndex: keyData.key_index,
        treeIndex: keyData.tree_index,
        solanaAddress: keyData.solana_address,
        denomination: keyData.denomination,
        tokenSymbol: keyData.token_symbol,
        chainName: keyData.chain_name,
        merkleRootId: keyData.merkle_root_id
      });
      console.log('Recipient:', recipientAddress);

      // Validate inputs
      if (!keyData.private_key) {
        throw new Error('Private key is required for withdrawal');
      }
      if (!recipientAddress) {
        throw new Error('Recipient address is required');
      }
      if (!keyData.merkle_proof || !keyData.merkle_proof.length) {
        throw new Error('Merkle proof is required');
      }
      if (!keyData.merkle_root) {
        throw new Error('Merkle root hash is required');
      }
      if (keyData.tree_index === undefined || keyData.tree_index === null) {
        throw new Error('Tree index is required for merkle proof verification');
      }

      // Note: merkle_root_id is not required here - we'll find it by searching on-chain

      // Determine token type and decimals
      const tokenSymbol = keyData.token_symbol || 'SOL';
      const isNativeSOL = tokenSymbol === 'SOL';

      // Get token decimals - SOL uses 9, USDC uses 6
      let tokenDecimals = 9; // Default to SOL
      if (!isNativeSOL) {
        // Fetch token info from backend to get correct decimals
        try {
          const tokens = await this.getSupportedTokens();
          const tokenInfo = tokens.find(t => t.symbol === tokenSymbol);
          if (tokenInfo) {
            tokenDecimals = tokenInfo.decimals;
            console.log(`Found ${tokenSymbol} token info: ${tokenDecimals} decimals`);
          } else {
            console.warn(`Token ${tokenSymbol} not found in supported tokens, defaulting to 6 decimals (USDC)`);
            tokenDecimals = 6; // Default to USDC decimals
          }
        } catch (error) {
          console.warn(`Failed to fetch token info, using default decimals for ${tokenSymbol}`);
          // Default decimals for common tokens
          if (tokenSymbol === 'USDC' || tokenSymbol === 'USDT') {
            tokenDecimals = 6;
          }
        }
      }

      // Convert denomination to base units using correct decimals
      const amountBaseUnits = Math.floor(parseFloat(keyData.denomination) * Math.pow(10, tokenDecimals));
      console.log(`Withdrawal amount: ${keyData.denomination} ${tokenSymbol} = ${amountBaseUnits} base units (${tokenDecimals} decimals)`);

      // Get program addresses (will be recalculated after finding correct merkle root ID)
      const treasuryPDA = this.getTreasuryPDA();
      const recipientPublicKey = new PublicKey(recipientAddress);
      const userPublicKey = phantomWallet.publicKey;

      console.log('Treasury PDA:', treasuryPDA.toString());
      console.log('Initial Merkle Root ID from database:', keyData.merkle_root_id);
      console.log('Recipient:', recipientPublicKey.toString());
      console.log('User (Phantom):', userPublicKey.toString());

      // Get the treasury state to know how many merkle roots exist
      const treasuryState = await this.getTreasuryState(connection);
      const maxMerkleId = treasuryState ? parseInt(treasuryState.nextMerkleId) : 20;

      console.log('');
      console.log(`📋 Scanning all on-chain merkle roots (looking for ${tokenSymbol}):`);
      console.log(`Treasury has ${maxMerkleId} merkle root(s)`);

      for (let scanId = 0; scanId < maxMerkleId; scanId++) {
        try {
          const scanPDA = this.getMerkleRootPDA(scanId);
          const scanAccountInfo = await connection.getAccountInfo(scanPDA);

          if (scanAccountInfo) {
            const scanData = scanAccountInfo.data;
            let scanOffset = 8;
            const storedId = scanData.readBigUInt64LE(scanOffset); scanOffset += 8;
            const rootBytes = scanData.subarray(scanOffset, scanOffset + 32);
            const root = rootBytes.toString('hex');
            const rootDisplay = root.slice(0, 16) + '...';
            scanOffset += 32;
            const tokenMint = new PublicKey(scanData.subarray(scanOffset, scanOffset + 32)); scanOffset += 32;
            const denom = scanData.readBigUInt64LE(scanOffset); scanOffset += 8;
            const isActive = scanData[scanOffset] !== 0; scanOffset += 1;
            const totalKeys = scanData.readBigUInt64LE(scanOffset); scanOffset += 8;
            const usedKeys = scanData.readBigUInt64LE(scanOffset);

            // Check if this matches our key's merkle root
            const keyMerkleRoot = keyData.merkle_root.startsWith('0x')
              ? keyData.merkle_root.slice(2)
              : keyData.merkle_root;
            const rootMatches = root === keyMerkleRoot;

            // Determine if this is SOL or SPL token
            const isSOL = tokenMint.equals(PublicKey.default) || tokenMint.equals(SystemProgram.programId);
            const displayDenom = isSOL
              ? `${Number(denom) / LAMPORTS_PER_SOL} SOL`
              : `${Number(denom)} base units`;

            console.log(`  ID ${scanId} → PDA ${scanPDA.toString().slice(0, 8)}... ${rootMatches ? '✅ ROOT MATCHES!' : ''}`);
            console.log(`    Stored ID: ${storedId}, Denom: ${displayDenom}, Active: ${isActive}`);
            console.log(`    Token: ${tokenMint.toString().slice(0, 8)}..., Keys: ${usedKeys}/${totalKeys}, Root: ${rootDisplay}`);
            if (!rootMatches && scanId < 3) {
              console.log(`    Expected root: ${keyMerkleRoot.slice(0, 16)}...`);
            }
          }
        } catch (e) {
          // Account doesn't exist
        }
      }
      console.log('');

      // Search for the correct on-chain merkle root ID by matching the merkle root HASH
      // This is the most reliable way - denomination/token can have duplicates
      // NOTE: For better performance, the Solana program could add a reverse lookup instruction
      //       that takes a merkle_root hash and returns the ID. This would eliminate the need
      //       to scan all IDs. For now, we scan only the IDs that exist (using nextMerkleId).
      console.log('🔍 Searching for correct merkle root ID by matching merkle root hash...');
      let correctMerkleRootId = null;

      // Get the key's merkle root hash
      const keyMerkleRoot = keyData.merkle_root.startsWith('0x')
        ? keyData.merkle_root.slice(2)
        : keyData.merkle_root;

      console.log(`Looking for merkle root: ${keyMerkleRoot.slice(0, 16)}...`);

      for (let searchId = 0; searchId < maxMerkleId; searchId++) {
        try {
          const searchPDA = this.getMerkleRootPDA(searchId);
          const searchAccountInfo = await connection.getAccountInfo(searchPDA);

          if (searchAccountInfo) {
            const searchData = searchAccountInfo.data;
            let searchOffset = 8;
            const searchStoredId = searchData.readBigUInt64LE(searchOffset); searchOffset += 8;

            // Extract the merkle root hash (32 bytes)
            const rootBytes = searchData.subarray(searchOffset, searchOffset + 32);
            const root = rootBytes.toString('hex');
            searchOffset += 32;

            const searchTokenMint = new PublicKey(searchData.subarray(searchOffset, searchOffset + 32)); searchOffset += 32;
            const searchDenomination = searchData.readBigUInt64LE(searchOffset);

            // Check if merkle root hash matches
            const rootMatches = root === keyMerkleRoot;

            console.log(`  ID ${searchId}: root=${root.slice(0, 16)}..., denom=${searchDenomination} base units, token=${searchTokenMint.toString().slice(0, 8)}..., match=${rootMatches}`);

            if (rootMatches) {
              console.log(`  ✅ FOUND MATCHING MERKLE ROOT at ID ${searchId}!`);
              correctMerkleRootId = searchId;
              break; // Found it, stop searching
            }
          }
        } catch (e) {
          // Account doesn't exist, skip
        }
      }

      if (correctMerkleRootId === null) {
        throw new Error(
          `No merkle root found on-chain matching this key's merkle root hash (${keyMerkleRoot.slice(0, 16)}...). ` +
          `The merkle root for batch ${keyData.batch_id || 'unknown'} may not have been submitted to the Solana program yet. ` +
          `Please check the admin panel to submit unsubmitted merkle roots.`
        );
      }

      console.log('');
      if (correctMerkleRootId !== keyData.merkle_root_id) {
        console.log(`✅ Found correct merkle root on-chain at ID ${correctMerkleRootId}`);
        console.log(`⚠️  Database had ID ${keyData.merkle_root_id}, using correct on-chain ID ${correctMerkleRootId} for withdrawal`);
        keyData.merkle_root_id = correctMerkleRootId;
      } else {
        console.log(`✅ Database merkle root ID ${keyData.merkle_root_id} matches on-chain ID`);
      }

      // Now that we have the correct merkle root ID, define the PDAs
      const merkleRootPDA = this.getMerkleRootPDA(keyData.merkle_root_id);
      const nullifierPDA = this.getNullifierPDA(keyData.merkle_root_id, keyData.tree_index);

      console.log('');
      console.log(`🎯 Final merkle root ID: ${keyData.merkle_root_id}`);
      console.log(`🎯 Final Merkle Root PDA: ${merkleRootPDA.toString()}`);
      console.log(`🎯 Final Nullifier PDA: ${nullifierPDA.toString()}`);

      // Import Keypair for signing the message
      const { Keypair } = await import('@solana/web3.js');
      const nacl = await import('tweetnacl');

      // Parse the key's private key
      const privateKeyHex = keyData.private_key.startsWith('0x')
        ? keyData.private_key.slice(2)
        : keyData.private_key;
      const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');

      // Create keypair from private key
      let keyPair;
      if (privateKeyBytes.length === 32) {
        // Seed only, derive full keypair
        keyPair = Keypair.fromSeed(privateKeyBytes);
      } else if (privateKeyBytes.length === 64) {
        // Full secret key
        keyPair = Keypair.fromSecretKey(privateKeyBytes);
      } else {
        throw new Error(`Invalid private key length: ${privateKeyBytes.length} bytes (expected 32 or 64)`);
      }

      // Derive the Solana address from the private key
      const derivedSolanaAddress = keyPair.publicKey.toString();
      console.log('Derived Solana public key:', derivedSolanaAddress);

      // If solana_address is missing from keyData, use the derived one
      if (!keyData.solana_address) {
        console.log('⚠️ solana_address was missing from key data, using derived address');
        keyData.solana_address = derivedSolanaAddress;
      } else {
        console.log('Expected address from key data:', keyData.solana_address);

        // Verify the derived address matches the stored one
        if (derivedSolanaAddress !== keyData.solana_address) {
          throw new Error(
            `Derived public key ${derivedSolanaAddress} does not match expected address ${keyData.solana_address}. ` +
            `This indicates the private key does not match the stored Solana address.`
          );
        }
      }

      // Create message to sign matching Solana contract format
      // Contract expects: keccak256(recipient + token + amount + chain_id)
      // For native SOL: token = Pubkey::default() (all zeros)
      // For SPL tokens: token = token mint public key
      const CHAIN_ID_SOLANA = 900n; // Must match contract's CHAIN_ID_SOLANA

      const amountBuffer = Buffer.alloc(8);
      amountBuffer.writeBigUInt64LE(BigInt(amountBaseUnits));

      const chainIdBuffer = Buffer.alloc(8);
      chainIdBuffer.writeBigUInt64LE(CHAIN_ID_SOLANA);

      // Determine token public key based on token type
      let tokenPubkey;
      if (isNativeSOL) {
        tokenPubkey = PublicKey.default; // Native SOL (all zeros)
      } else {
        // For SPL tokens, get the mint address from keyData
        if (keyData.token_address) {
          tokenPubkey = new PublicKey(keyData.token_address);
          console.log(`Using SPL token mint: ${tokenPubkey.toString()}`);
        } else {
          throw new Error(`SPL token ${tokenSymbol} requires token_address in keyData`);
        }
      }

      // Construct message matching contract's create_message_hash
      const messageData = Buffer.concat([
        recipientPublicKey.toBuffer(),  // 32 bytes
        tokenPubkey.toBuffer(),         // 32 bytes (token mint)
        amountBuffer,                   // 8 bytes (amount in base units)
        chainIdBuffer,                  // 8 bytes (chain_id = 900)
      ]);

      console.log('Message data (before keccak):', messageData.toString('hex'));
      console.log(`  - Recipient: ${recipientPublicKey.toString()}`);
      console.log(`  - Token: ${tokenPubkey.toString()}`);
      console.log(`  - Amount: ${amountBaseUnits} base units`);
      console.log(`  - Chain ID: ${CHAIN_ID_SOLANA}`);

      // Hash the message with keccak256 (matching Solana contract)
      const { keccak256 } = await import('js-sha3');
      const messageHash = Buffer.from(keccak256(messageData), 'hex');

      console.log('Message hash (after keccak):', messageHash.toString('hex'));

      // Sign the message hash with Ed25519
      // Contract verifies Ed25519 signature of the keccak256 hash
      const signature = nacl.default.sign.detached(messageHash, keyPair.secretKey);
      console.log('Signature created:', Buffer.from(signature).toString('hex'));

      // Prepare merkle proof as array of 32-byte arrays
      const merkleProof = keyData.merkle_proof.map(hash => {
        const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;
        return Array.from(Buffer.from(cleanHash, 'hex'));
      });

      console.log('Merkle proof length:', merkleProof.length);

      // Choose the correct withdrawal instruction based on token type
      // Native SOL uses withdraw_native, SPL tokens use withdraw_token
      const discriminator = isNativeSOL
        ? Buffer.from([113, 227, 26, 32, 53, 66, 90, 250])  // withdraw_native
        : Buffer.from([136, 235, 181, 5, 101, 109, 57, 81]);  // withdraw_token (for SPL tokens)

      console.log(`Using ${isNativeSOL ? 'withdraw_native' : 'withdraw_token'} instruction for ${tokenSymbol}`);

      // Prepare buffers for instruction data
      const amountInstructionBuffer = Buffer.alloc(8);
      amountInstructionBuffer.writeBigUInt64LE(BigInt(amountBaseUnits));

      const merkleRootIdInstructionBuffer = Buffer.alloc(8);
      merkleRootIdInstructionBuffer.writeBigUInt64LE(BigInt(keyData.merkle_root_id));

      const merkleProofLengthBuffer = Buffer.alloc(4);
      merkleProofLengthBuffer.writeUInt32LE(merkleProof.length);

      const treeIndexBuffer = Buffer.alloc(8);
      treeIndexBuffer.writeBigUInt64LE(BigInt(keyData.tree_index));

      // Serialize instruction data
      const instructionData = Buffer.concat([
        discriminator,
        amountInstructionBuffer,  // amount (in base units)
        merkleRootIdInstructionBuffer,  // merkle_root_id
        Buffer.from(signature),  // signature (64 bytes)
        keyPair.publicKey.toBuffer(),  // public_key (32 bytes)
        // merkle_proof vector: length (4 bytes) + elements
        merkleProofLengthBuffer,
        ...merkleProof.map(proof => Buffer.from(proof)),
        treeIndexBuffer,  // key_index
      ]);

      console.log('Instruction data length:', instructionData.length);
      console.log(`Amount in instruction: ${amountBaseUnits} base units (${keyData.denomination} ${tokenSymbol})`);

      // Build instruction accounts based on token type
      let instructionAccounts;
      let createATAInstruction = null;  // Will be set if we need to create recipient's ATA

      if (isNativeSOL) {
        // Native SOL withdrawal (withdraw_native)
        // Accounts: treasury_state, merkle_root, nullifier, recipient, user, system_program
        instructionAccounts = [
          { pubkey: treasuryPDA, isSigner: false, isWritable: true },
          { pubkey: merkleRootPDA, isSigner: false, isWritable: true },
          { pubkey: nullifierPDA, isSigner: false, isWritable: true },
          { pubkey: recipientPublicKey, isSigner: false, isWritable: true },
          { pubkey: userPublicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false }, // Instructions sysvar
        ];

        console.log('✅ Native SOL withdrawal accounts configured');
      } else {
        // SPL token withdrawal (withdraw_token)
        // Accounts: treasury_state, token_config, merkle_root, nullifier, token_mint,
        //           recipient_token_account, treasury_token_account, user, token_program, system_program

        // Derive token_config PDA
        const [tokenConfigPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('token_config'), tokenPubkey.toBuffer()],
          this.programId
        );

        console.log('Token config PDA:', tokenConfigPDA.toString());

        // Get recipient's Associated Token Account (ATA)
        const recipientTokenAccount = await getAssociatedTokenAddress(
          tokenPubkey,  // token mint
          recipientPublicKey  // owner
        );

        console.log('Recipient token account (ATA):', recipientTokenAccount.toString());

        // Check if recipient's ATA exists
        const recipientTokenAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
        const needsRecipientATA = !recipientTokenAccountInfo;

        if (needsRecipientATA) {
          console.log('⚠️  Recipient token account does not exist - will be created in transaction');
        } else {
          console.log('✅ Recipient token account already exists');
        }

        // Get treasury's Associated Token Account (ATA)
        // allowOwnerOffCurve = true because treasuryPDA is a PDA
        const treasuryTokenAccount = await getAssociatedTokenAddress(
          tokenPubkey,  // token mint
          treasuryPDA,  // owner (PDA)
          true  // allowOwnerOffCurve
        );

        console.log('Treasury token account (ATA):', treasuryTokenAccount.toString());

        // Check if treasury's ATA exists
        const treasuryTokenAccountInfo = await connection.getAccountInfo(treasuryTokenAccount);
        if (!treasuryTokenAccountInfo) {
          console.error('❌ Treasury token account does not exist!');
          console.error('Expected treasury token account address:', treasuryTokenAccount.toString());
          console.error('Token mint:', tokenPubkey.toString());
          console.error('Treasury PDA:', treasuryPDA.toString());

          // Let's try to find if there's a different token account
          console.log('\n🔍 Searching for any token accounts owned by treasury...');
          const tokenAccountsByOwner = await connection.getTokenAccountsByOwner(
            treasuryPDA,
            { mint: tokenPubkey }
          );

          if (tokenAccountsByOwner.value.length > 0) {
            console.log(`Found ${tokenAccountsByOwner.value.length} token account(s) for this mint:`);
            tokenAccountsByOwner.value.forEach((accountInfo, index) => {
              console.log(`  ${index + 1}. ${accountInfo.pubkey.toString()}`);
            });
          } else {
            console.log('No token accounts found for treasury with this mint');
          }

          throw new Error(
            `Treasury's ${tokenSymbol} token account (ATA) does not exist at expected address. ` +
            `Expected: ${treasuryTokenAccount.toString()}. ` +
            `If deposits are working, the token account might be at a different address.`
          );
        }

        console.log('✅ Treasury token account exists');
        console.log('Treasury token account data:', {
          lamports: treasuryTokenAccountInfo.lamports,
          owner: treasuryTokenAccountInfo.owner.toString(),
          dataLength: treasuryTokenAccountInfo.data.length
        });

        instructionAccounts = [
          { pubkey: treasuryPDA, isSigner: false, isWritable: true },
          { pubkey: tokenConfigPDA, isSigner: false, isWritable: true },
          { pubkey: merkleRootPDA, isSigner: false, isWritable: true },
          { pubkey: nullifierPDA, isSigner: false, isWritable: true },
          { pubkey: tokenPubkey, isSigner: false, isWritable: false },  // token_mint
          { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
          { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
          { pubkey: userPublicKey, isSigner: true, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false }, // Instructions sysvar
        ];

        console.log(`✅ SPL token (${tokenSymbol}) withdrawal accounts configured`);

        // If recipient's ATA doesn't exist, create instruction to create it
        if (needsRecipientATA) {
          console.log('Creating instruction to initialize recipient ATA...');
          createATAInstruction = createAssociatedTokenAccountInstruction(
            userPublicKey,  // payer
            recipientTokenAccount,  // ATA address
            recipientPublicKey,  // owner
            tokenPubkey  // mint
          );
        }
      }

      // Create the withdraw instruction
      const withdrawInstruction = new TransactionInstruction({
        keys: instructionAccounts,
        programId: this.programId,
        data: instructionData,
      });

      // Create transaction
      const transaction = new Transaction();

      // If we need to create the recipient's ATA, add that instruction first
      if (createATAInstruction) {
        console.log('Adding ATA creation instruction to transaction');
        transaction.add(createATAInstruction);
      }

      // -----------------------------------------------------------
      // Add Ed25519 Signature Verification Instruction
      // -----------------------------------------------------------
      // The contract's verify_ed25519_signature_introspection function checks
      // for this instruction in the transaction. It validates that the signature
      // provided matches the message and public key.
      const { Ed25519Program } = await import('@solana/web3.js');

      const ed25519Instruction = Ed25519Program.createInstructionWithPublicKey({
        publicKey: keyPair.publicKey.toBytes(),
        message: messageHash, // We sign the hash of the message, matching create_message_hash
        signature: signature,
      });

      console.log('Adding Ed25519 verification instruction to transaction');
      transaction.add(ed25519Instruction);

      // Add the withdrawal instruction (must be after Ed25519 instruction)
      transaction.add(withdrawInstruction);

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;

      console.log('Transaction created, simulating...');

      // Simulate transaction
      try {
        const simulation = await connection.simulateTransaction(transaction);
        console.log('Simulation result:', simulation);

        if (simulation.value.err) {
          console.error('Simulation failed:', simulation.value.err);
          console.error('Simulation logs:', simulation.value.logs);

          // Parse error for user-friendly messages
          const errorMessage = this.parseSimulationError(simulation.value.err, simulation.value.logs);
          throw new Error(errorMessage);
        }

        console.log('✅ Simulation successful!');
      } catch (simError) {
        console.error('Simulation error:', simError);
        throw simError;
      }

      // Sign with Phantom wallet and send
      console.log('Requesting signature from Phantom wallet...');
      const signedTransaction = await phantomWallet.signTransaction(transaction);
      console.log('Transaction signed by Phantom');

      // Send the signed transaction
      console.log('Sending transaction...');
      let txSignature;
      try {
        txSignature = await connection.sendRawTransaction(signedTransaction.serialize());
        console.log('Transaction sent! Signature:', txSignature);
      } catch (sendError) {
        // Check if the error is "transaction already processed"
        if (sendError.message && sendError.message.includes('already been processed')) {
          console.log('⚠️ Transaction was already processed - extracting signature from transaction');

          // Extract the signature from the signed transaction
          // The first signature in a Solana transaction is always the fee payer's signature
          const signatures = signedTransaction.signatures;
          if (signatures && signatures.length > 0) {
            // Convert signature bytes to base58
            const bs58 = await import('bs58');
            txSignature = bs58.default.encode(signatures[0].signature);
            console.log('Extracted transaction signature:', txSignature);
            console.log('✅ Transaction already succeeded on-chain!');
          } else {
            throw new Error('Transaction already processed but could not extract signature');
          }
        } else {
          // Different error, re-throw it
          throw sendError;
        }
      }

      // Wait for confirmation with longer timeout
      console.log('Waiting for confirmation...');
      try {
        await connection.confirmTransaction(txSignature, 'confirmed');
        console.log('✅ Transaction confirmed!');
      } catch (confirmError) {
        // Even if confirmation times out, the transaction might have succeeded
        // Check the transaction status
        console.warn('Confirmation error (transaction may still have succeeded):', confirmError);

        try {
          const txStatus = await connection.getSignatureStatus(txSignature);
          console.log('Transaction status:', txStatus);

          if (txStatus && txStatus.value && txStatus.value.confirmationStatus) {
            console.log('Transaction was actually successful! Status:', txStatus.value.confirmationStatus);
            // Transaction succeeded despite confirmation timeout
          } else {
            // Transaction truly failed
            throw new Error(`Transaction confirmation failed: ${confirmError.message}`);
          }
        } catch (statusError) {
          console.error('Failed to check transaction status:', statusError);
          // Return signature anyway - user can check it manually
          console.log(`⚠️ Unable to confirm transaction status. Please check transaction ${txSignature} manually in Solana Explorer`);
        }
      }

      return {
        success: true,
        txHash: txSignature,
        signature: txSignature,
        receipt: { transactionHash: txSignature }
      };

    } catch (error) {
      console.error('❌ Solana withdrawal error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message || 'Withdrawal failed'
      };
    }
  }

  // Withdraw native SOL (legacy method - use executeWithdrawal instead)
  async withdrawNative(amount, merkleRootId, signature, publicKey, merkleProof, keyIndex, recipient) {
    throw new Error('Use executeWithdrawal method instead');
  }

  /**
   * Parse Solana simulation error and return user-friendly message
   * @param {object} error - The simulation error object
   * @param {array} logs - The simulation logs
   * @returns {string} User-friendly error message
   */
  parseSimulationError(error, logs) {
    // Check for custom program error codes
    if (error && error.InstructionError) {
      const instructionError = error.InstructionError[1];

      // Custom error code 6007 = NullifierAlreadyUsed
      if (instructionError && instructionError.Custom === 6007) {
        return 'KEY_ALREADY_USED:This withdrawal key has already been used. Each key can only be used once for security reasons. Please request a new key to make another withdrawal.';
      }

      // Error Code 1 (Standard SPL Token "Insufficient Funds")
      // This happens when the treasury tries to transfer more tokens than it holds
      // We check for code 1 OR explicit "insufficient funds" message in logs
      const isInsufficientFunds =
        (instructionError === 1) ||
        (instructionError && instructionError.Custom == 1) || // Loose equality for string/number match
        (typeof instructionError === 'object' && Object.values(instructionError).includes(1)) ||
        (logs && logs.some(log => log.toLowerCase().includes('insufficient funds')));

      if (isInsufficientFunds) {
        return 'INSUFFICIENT_FUNDS:The Treasury has insufficient funds to fulfill this withdrawal. Please verify the Treasury balance.';
      }

      // Custom error code 6001 = MerkleRootNotActive
      if (instructionError && instructionError.Custom === 6001) {
        return 'MERKLE_ROOT_INACTIVE:The merkle root for this key is no longer active. This usually means the key batch has expired or been deactivated by the administrator.';
      }

      // Custom error code 6002 = InvalidMerkleProof
      if (instructionError && instructionError.Custom === 6002) {
        return 'INVALID_PROOF:The merkle proof verification failed. This key may be invalid or corrupted. Please contact support.';
      }

      // Custom error code 6003 = InsufficientFunds
      if (instructionError && instructionError.Custom === 6003) {
        return 'INSUFFICIENT_FUNDS:The treasury does not have enough funds for this withdrawal. Please contact the administrator.';
      }

      // Custom error code 6004 = InvalidSignature
      if (instructionError && instructionError.Custom === 6004) {
        return 'INVALID_SIGNATURE:The signature verification failed. This key may be invalid or corrupted. Please try again or contact support.';
      }

      // Custom error code 6005 = InvalidPublicKey
      if (instructionError && instructionError.Custom === 6005) {
        return 'INVALID_PUBLIC_KEY:The public key does not match the expected key. This key may be invalid or corrupted.';
      }

      // Custom error code 6006 = Paused
      if (instructionError && instructionError.Custom === 6006) {
        return 'SYSTEM_PAUSED:The withdrawal system is currently paused for maintenance. Please try again later.';
      }

      // Generic custom error
      if (instructionError && instructionError.Custom) {
        return `PROGRAM_ERROR:Transaction failed with program error code ${instructionError.Custom}. Please contact support if this persists.`;
      }
    }

    // Check logs for specific error messages
    if (logs && Array.isArray(logs)) {
      const logsText = logs.join('\n');

      if (logsText.includes('NullifierAlreadyUsed') || logsText.includes('Nullifier already used')) {
        return 'KEY_ALREADY_USED:This withdrawal key has already been used. Each key can only be used once for security reasons. Please request a new key to make another withdrawal.';
      }

      if (logsText.includes('MerkleRootNotActive') || logsText.includes('not active')) {
        return 'MERKLE_ROOT_INACTIVE:The merkle root for this key is no longer active. This usually means the key batch has expired or been deactivated.';
      }

      if (logsText.includes('InvalidMerkleProof') || logsText.includes('Invalid merkle proof')) {
        return 'INVALID_PROOF:The merkle proof verification failed. This key may be invalid. Please contact support.';
      }

      if (logsText.includes('InsufficientFunds') || logsText.includes('insufficient funds')) {
        return 'INSUFFICIENT_FUNDS:The treasury does not have enough funds. Please contact the administrator.';
      }
    }

    // Default error message with logs
    const logsFormatted = logs ? `\n\nTransaction logs:\n${logs.join('\n')}` : '';
    return `TRANSACTION_FAILED:Transaction simulation failed: ${JSON.stringify(error)}${logsFormatted}`;
  }
}

export default new SolanaInternullService();
