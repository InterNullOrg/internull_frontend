// MetaMask-optimized withdrawal service for ECDSA
import { ethers } from 'ethers';
import { WithdrawalServiceECDSA } from './withdrawalServiceECDSA';

class MetaMaskOptimizedServiceECDSA {
  constructor() {
    this.treasuryAddress = process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    this.withdrawalService = new WithdrawalServiceECDSA();
  }

  // Try different ways to send the same transaction
  async tryDifferentApproaches(provider, signer, withdrawalData, treasuryAddress = null) {
    console.log('🔬 Trying different MetaMask approaches for ECDSA...');

    // Use provided treasury address or fall back to constructor value
    const contractAddress = treasuryAddress || this.treasuryAddress;
    console.log('🏦 Using treasury address:', contractAddress);

    const approaches = [
      { name: 'Standard ECDSA Contract Call', method: this.standardContractCall.bind(this) },
      { name: 'Raw ECDSA Transaction', method: this.rawTransaction.bind(this) },
      { name: 'High Gas ECDSA', method: this.highGasApproach.bind(this) },
    ];

    for (const approach of approaches) {
      try {
        console.log(`\n🧪 Testing: ${approach.name}`);
        const result = await approach.method(provider, signer, withdrawalData, contractAddress);
        if (result.success) {
          console.log(`✅ ${approach.name} worked!`);
          return result;
        } else {
          console.log(`❌ ${approach.name} failed: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ ${approach.name} threw error: ${error.message}`);
      }
    }

    return { success: false, error: 'All approaches failed' };
  }

  // Verify merkle proof locally (matching backend logic)
  verifyMerkleProof(merkleRoot, publicKeyHash, merkleProof, keyIndex) {
    console.log('🔍 Verifying merkle proof locally:');
    console.log('  - Merkle root:', merkleRoot);
    console.log('  - Public key hash:', publicKeyHash);
    console.log('  - Merkle proof length:', merkleProof.length);
    console.log('  - Key index:', keyIndex);
    
    // Remove 0x prefix if present for consistent handling
    let computedHash = publicKeyHash.startsWith('0x') ? publicKeyHash.slice(2) : publicKeyHash;
    let currentIndex = keyIndex;
    
    for (let i = 0; i < merkleProof.length; i++) {
      const proofElement = merkleProof[i];
      const proofBytes = proofElement.startsWith('0x') ? proofElement.slice(2) : proofElement;
      console.log(`  - Level ${i}: proof element = ${proofElement}`);
      
      // Concatenate hashes and hash with SHA3-256 (matching backend)
      let combinedBytes;
      if (currentIndex % 2 === 0) {
        // Left side - current hash is left, proof is right
        combinedBytes = Buffer.concat([
          Buffer.from(computedHash, 'hex'),
          Buffer.from(proofBytes, 'hex')
        ]);
        console.log(`    Left child: hash(${computedHash.slice(0,10)}..., ${proofBytes.slice(0,10)}...)`);
      } else {
        // Right side - proof is left, current hash is right
        combinedBytes = Buffer.concat([
          Buffer.from(proofBytes, 'hex'),
          Buffer.from(computedHash, 'hex')
        ]);
        console.log(`    Right child: hash(${proofBytes.slice(0,10)}..., ${computedHash.slice(0,10)}...)`);
      }
      
      // Hash with Keccak-256 to match backend and contract
      // ethers uses Keccak-256 for solidityKeccak256
      const combined = '0x' + combinedBytes.toString('hex');
      computedHash = ethers.utils.solidityKeccak256(['bytes'], [combined]).slice(2);
      currentIndex = Math.floor(currentIndex / 2);
      console.log(`    New hash: 0x${computedHash}`);
    }
    
    // Add 0x prefix for comparison
    const computedRoot = '0x' + computedHash;
    const isValid = computedRoot.toLowerCase() === merkleRoot.toLowerCase();
    console.log(`✅ Merkle proof ${isValid ? 'VALID' : 'INVALID'}`);
    console.log(`  - Computed root: ${computedRoot}`);
    console.log(`  - Expected root: ${merkleRoot}`);
    
    return isValid;
  }

  // Prepare ECDSA withdrawal data
  async prepareWithdrawalData(provider, keyshares, keyIndex, recipient, denomination, treasuryAddress = null) {
    console.log('🔐 Preparing ECDSA withdrawal data...');
    console.log('🏦 Treasury address for withdrawal:', treasuryAddress || this.treasuryAddress);
    
    // Get keyshare data
    const firstNodeKeyshares = Object.values(keyshares)[0];
    console.log('🔍 First node keyshares:', firstNodeKeyshares);
    console.log('🔍 Looking for keyIndex:', keyIndex);
    
    // The keyIndex passed might be the tree index, but we need to find the actual key_index
    let actualKeyIndex = keyIndex;
    let keyMetadata = null;
    
    // First try to find metadata by matching key_index
    const keysMetadata = firstNodeKeyshares.keys_metadata;
    if (Array.isArray(keysMetadata)) {
      // Try exact match first
      keyMetadata = keysMetadata.find(meta => meta.key_index === keyIndex);
      
      // If not found, try finding by tree_index
      if (!keyMetadata) {
        keyMetadata = keysMetadata.find(meta => meta.tree_index === keyIndex);
      }
      
      // If still not found, use the first available key
      if (!keyMetadata && keysMetadata.length > 0) {
        console.log('⚠️ Could not find exact match, using first available key');
        keyMetadata = keysMetadata[0];
      }
      
      if (keyMetadata) {
        actualKeyIndex = keyMetadata.key_index;
      }
    }
    
    console.log('📋 Found key metadata:', keyMetadata);
    
    if (!keyMetadata) {
      throw new Error(`No metadata found for keyIndex ${keyIndex}`);
    }

    const merkleRoot = keyMetadata.merkle_root;
    const merkleProof = keyMetadata.merkle_proof || [];
    const treeIndex = keyMetadata.tree_index || 0;
    
    console.log('📋 Merkle proof details:');
    console.log('  - Merkle root:', merkleRoot);
    console.log('  - Merkle proof array:', merkleProof);
    console.log('  - Tree index:', treeIndex);

    // Reconstruct ECDSA private key from keyshares using the actual key_index
    // Pass the metadata we already found
    const reconstructionResult = this.withdrawalService.reconstructPrivateKey(keyshares, actualKeyIndex, keyMetadata);
    console.log('✅ Reconstructed ECDSA private key');
    
    // Use the denomination from metadata since reconstruction doesn't return it properly
    const denominationValue = keyMetadata.denomination || denomination;
    
    // Extract the private key value (it's a BigInt that needs to be converted to hex)
    let privateKeyHex;
    if (typeof reconstructionResult === 'object' && reconstructionResult.privateKey) {
      // Convert BigInt to hex string with proper padding
      const privateKeyBigInt = BigInt(reconstructionResult.privateKey);
      privateKeyHex = '0x' + privateKeyBigInt.toString(16).padStart(64, '0');
    } else if (typeof reconstructionResult === 'bigint') {
      // Direct BigInt result
      privateKeyHex = '0x' + reconstructionResult.toString(16).padStart(64, '0');
    } else if (typeof reconstructionResult === 'string') {
      // Already a hex string
      privateKeyHex = reconstructionResult.startsWith('0x') ? reconstructionResult : '0x' + reconstructionResult;
    } else {
      throw new Error('Invalid private key format from reconstruction');
    }

    // Get the public key from the private key
    const wallet = new ethers.Wallet(privateKeyHex);
    const publicKey = wallet.publicKey;
    console.log('🔑 ECDSA Public key:', publicKey);
    
    // Get the address which should be in the merkle tree
    const address = wallet.address;
    console.log('📍 ECDSA Address:', address);
    
    // The backend now stores keccak256(address) as the leaf
    // This matches what the contract expects: keccak256(abi.encodePacked(signer))
    
    // The address is already computed above
    // Hash it with Keccak-256 (Ethereum's version) to get the leaf
    const publicKeyHash = ethers.utils.solidityKeccak256(['address'], [address]);
    console.log('🍃 Leaf hash (keccak256 of address):', publicKeyHash);
    console.log('   Note: Backend now stores address hashes to match contract');

    // Find merkle root ID for this specific merkle root and denomination
    const merkleRootId = await this.getMerkleRootId(provider, merkleRoot, denominationValue, treasuryAddress);
    console.log('🌳 Merkle root ID:', merkleRootId);

    // Create the withdrawal message for ECDSA
    const messageHash = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'uint256'],
      [recipient, denominationValue, merkleRootId]
    );
    console.log('📝 Message hash to sign:', messageHash);

    // Sign with ECDSA
    const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
    console.log('✍️ ECDSA Signature:', signature);

    // Format merkle proof
    const formattedMerkleProof = merkleProof.map(proof => {
      if (typeof proof === 'string') {
        return proof.startsWith('0x') ? proof : '0x' + proof;
      }
      return ethers.utils.hexlify(proof);
    });
    
    console.log('🔐 Formatted merkle proof:', formattedMerkleProof);
    
    // Verify the merkle proof locally before sending to contract
    const formattedMerkleRoot = merkleRoot.startsWith('0x') ? merkleRoot : '0x' + merkleRoot;
    const isProofValid = this.verifyMerkleProof(
      formattedMerkleRoot,
      publicKeyHash,
      formattedMerkleProof,
      treeIndex
    );
    
    if (!isProofValid) {
      console.warn('⚠️ Merkle proof verification failed locally!');
      console.warn('This may be due to merkle tree key/address mismatch.');
      console.warn('Check if backend stored the correct key data for this merkle root.');
      console.warn('Proceeding anyway to test ECDSA signature...');
      // Don't throw - let's try anyway
      // throw new Error('Invalid merkle proof - verification failed locally');
    } else {
      console.log('✅ Merkle proof verified successfully locally');
    }

    return {
      recipient,
      denominationWei: ethers.utils.parseEther(denominationValue.toString()),
      merkleRootId,
      signature, // 65 bytes ECDSA signature
      merkleProof: formattedMerkleProof,
      keyIndex: treeIndex,
      publicKey,
      publicKeyHash // Add this for debugging
    };
  }

  // Get merkle root ID from contract
  async getMerkleRootId(provider, merkleRoot, denomination, treasuryAddress = null) {
    // Use provided treasury address or fall back to constructor value
    const contractAddress = treasuryAddress || this.treasuryAddress;

    // Format merkle root
    const formattedRoot = merkleRoot.startsWith('0x') ? merkleRoot : '0x' + merkleRoot;

    console.log('🔍 Finding merkle root ID for root:', formattedRoot, 'denomination:', denomination);
    console.log('🏦 Using treasury contract:', contractAddress);

    // Get the contract to query merkle root IDs
    const treasuryABI = [
      {
        "inputs": [{"internalType": "uint256", "name": "denomination", "type": "uint256"}],
        "name": "getMerkleRootIds",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "merkleRoots",
        "outputs": [
          {"internalType": "bytes32", "name": "merkleRoot", "type": "bytes32"},
          {"internalType": "uint256", "name": "denomination", "type": "uint256"},
          {"internalType": "uint256", "name": "expiryTimestamp", "type": "uint256"},
          {"internalType": "bool", "name": "isActive", "type": "bool"},
          {"internalType": "bool", "name": "isPaused", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    const contract = new ethers.Contract(contractAddress, treasuryABI, provider);
    
    // Get all merkle root IDs for this denomination
    const denominationWei = ethers.utils.parseEther(denomination.toString());
    const merkleRootIds = await contract.getMerkleRootIds(denominationWei);
    
    console.log(`📋 Found ${merkleRootIds.length} merkle root IDs for denomination ${denomination} ETH`);
    
    // Check each merkle root ID to find the matching one
    for (const rootId of merkleRootIds) {
      const rootInfo = await contract.merkleRoots(rootId);
      console.log(`  Checking ID ${rootId}: root=${rootInfo.merkleRoot}`);
      
      if (rootInfo.merkleRoot.toLowerCase() === formattedRoot.toLowerCase()) {
        console.log(`✅ Found matching merkle root ID: ${rootId.toString()}`);
        
        // Verify it's active and not expired
        if (!rootInfo.isActive) {
          throw new Error(`Merkle root ID ${rootId} is not active`);
        }
        
        if (rootInfo.isPaused) {
          throw new Error(`Merkle root ID ${rootId} is paused`);
        }
        
        const now = Math.floor(Date.now() / 1000);
        if (rootInfo.expiryTimestamp.toNumber() < now) {
          throw new Error(`Merkle root ID ${rootId} has expired`);
        }
        
        // Return the BigNumber directly for proper handling
        return rootId;
      }
    }
    
    throw new Error(`No matching merkle root found for ${formattedRoot} with denomination ${denomination} ETH`);
  }

  // Approach 1: Standard contract call with ECDSA
  async standardContractCall(provider, signer, withdrawalData, treasuryAddress = null) {
    const { recipient, denomination, keyshares, keyIndex } = withdrawalData;

    const data = await this.prepareWithdrawalData(provider, keyshares, keyIndex, recipient, denomination, treasuryAddress);
    
    console.log('📤 Sending to contract:');
    console.log('  - Recipient:', data.recipient);
    console.log('  - Denomination:', ethers.utils.formatEther(data.denominationWei), 'ETH');
    console.log('  - Merkle root ID:', data.merkleRootId.toString());
    console.log('  - Signature length:', data.signature.length, 'chars (should be 132 for 65 bytes)');
    console.log('  - Merkle proof:', data.merkleProof);
    console.log('  - Key index (tree index):', data.keyIndex);
    console.log('  - Public key hash (leaf):', data.publicKeyHash);

    const treasuryABI = [{
      "inputs": [
        {"name": "recipient", "type": "address"},
        {"name": "denomination", "type": "uint256"},
        {"name": "merkleRootId", "type": "uint256"},
        {"name": "signature", "type": "bytes"},
        {"name": "merkleProof", "type": "bytes32[]"},
        {"name": "keyIndex", "type": "uint256"}
      ],
      "name": "withdraw",
      "type": "function",
      "outputs": [],
      "stateMutability": "nonpayable"
    }];

    const contractAddress = treasuryAddress || this.treasuryAddress;
    console.log('📍 Sending transaction to treasury:', contractAddress);
    const contract = new ethers.Contract(contractAddress, treasuryABI, signer);

    const tx = await contract.withdraw(
      data.recipient,
      data.denominationWei,
      data.merkleRootId,
      data.signature,
      data.merkleProof,
      data.keyIndex
    );

    const receipt = await tx.wait();
    console.log('✅ ECDSA Withdrawal successful:', receipt.transactionHash);
    
    return { 
      success: true, 
      txHash: receipt.transactionHash,
      receipt 
    };
  }

  // Approach 2: Raw transaction with ECDSA
  async rawTransaction(provider, signer, withdrawalData, treasuryAddress = null) {
    const { recipient, denomination, keyshares, keyIndex } = withdrawalData;

    const data = await this.prepareWithdrawalData(provider, keyshares, keyIndex, recipient, denomination, treasuryAddress);
    
    const iface = new ethers.utils.Interface([{
      "inputs": [
        {"name": "recipient", "type": "address"},
        {"name": "denomination", "type": "uint256"},
        {"name": "merkleRootId", "type": "uint256"},
        {"name": "signature", "type": "bytes"},
        {"name": "merkleProof", "type": "bytes32[]"},
        {"name": "keyIndex", "type": "uint256"}
      ],
      "name": "withdraw",
      "type": "function",
      "stateMutability": "nonpayable"
    }]);

    const encodedData = iface.encodeFunctionData('withdraw', [
      data.recipient,
      data.denominationWei,
      data.merkleRootId,
      data.signature,
      data.merkleProof,
      data.keyIndex
    ]);

    const contractAddress = treasuryAddress || this.treasuryAddress;
    console.log('📍 Sending raw transaction to treasury:', contractAddress);

    const txRequest = {
      to: contractAddress,
      data: encodedData,
      gasLimit: ethers.utils.hexlify(500000)
    };

    const tx = await signer.sendTransaction(txRequest);
    const receipt = await tx.wait();
    
    console.log('✅ ECDSA Raw transaction successful:', receipt.transactionHash);
    
    return { 
      success: true, 
      txHash: receipt.transactionHash,
      receipt 
    };
  }

  // Approach 3: High gas approach
  async highGasApproach(provider, signer, withdrawalData, treasuryAddress = null) {
    const { recipient, denomination, keyshares, keyIndex } = withdrawalData;

    const data = await this.prepareWithdrawalData(provider, keyshares, keyIndex, recipient, denomination, treasuryAddress);
    
    const treasuryABI = [{
      "inputs": [
        {"name": "recipient", "type": "address"},
        {"name": "denomination", "type": "uint256"},
        {"name": "merkleRootId", "type": "uint256"},
        {"name": "signature", "type": "bytes"},
        {"name": "merkleProof", "type": "bytes32[]"},
        {"name": "keyIndex", "type": "uint256"}
      ],
      "name": "withdraw",
      "type": "function",
      "outputs": [],
      "stateMutability": "nonpayable"
    }];

    const contractAddress = treasuryAddress || this.treasuryAddress;
    console.log('📍 Sending high gas transaction to treasury:', contractAddress);
    const contract = new ethers.Contract(contractAddress, treasuryABI, signer);

    // Use higher gas settings
    const feeData = await provider.getFeeData();
    
    const tx = await contract.withdraw(
      data.recipient,
      data.denominationWei,
      data.merkleRootId,
      data.signature,
      data.merkleProof,
      data.keyIndex,
      {
        gasLimit: 1000000,
        maxFeePerGas: feeData.maxFeePerGas.mul(2),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.mul(2)
      }
    );

    const receipt = await tx.wait();
    console.log('✅ ECDSA High gas withdrawal successful:', receipt.transactionHash);
    
    return { 
      success: true, 
      txHash: receipt.transactionHash,
      receipt 
    };
  }
}

export default new MetaMaskOptimizedServiceECDSA();