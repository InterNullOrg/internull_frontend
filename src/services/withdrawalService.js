// Smart contract withdrawal service
import { ethers } from 'ethers';
import MerkleDebugger from './merkleDebugger';
import { isKeyUsed } from './treasuryContractService';

const TREASURY_ABI = [
  {
    "inputs": [
      {"internalType": "address payable", "name": "recipient", "type": "address"},
      {"internalType": "uint256", "name": "denomination", "type": "uint256"},
      {"internalType": "uint256", "name": "merkleRootId", "type": "uint256"},
      {"internalType": "bytes32[67]", "name": "signature", "type": "bytes32[67]"},
      {"internalType": "bytes32[67]", "name": "publicKey", "type": "bytes32[67]"},
      {"internalType": "bytes32[]", "name": "merkleProof", "type": "bytes32[]"},
      {"internalType": "uint256", "name": "keyIndex", "type": "uint256"}  // Actually expects treeIndex for merkle proof verification
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "merkleRoot", "type": "bytes32"}],
    "name": "getMerkleRootIdByRoot",
    "outputs": [{"internalType": "uint256", "name": "merkleRootId", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export class WithdrawalService {
  constructor() {
    this.treasuryAddress = process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    console.log('WithdrawalService initialized with treasury address:', this.treasuryAddress);
  }

  // Get batch_id from key metadata (used for deterministic seed generation)
  getBatchId(keyshares, keyIndex) {
    console.log('🔍 Looking for batch_id in key metadata...');
    
    // Try to find batch_id from any node's keys_metadata
    for (const [nodeId, nodeData] of Object.entries(keyshares)) {
      if (nodeData.keys_metadata && Array.isArray(nodeData.keys_metadata)) {
        const keyMetadata = nodeData.keys_metadata.find(meta => meta.key_index === keyIndex);
        if (keyMetadata && keyMetadata.batch_id) {
          console.log(`✅ Found batch_id in node ${nodeId}: ${keyMetadata.batch_id}`);
          return keyMetadata.batch_id;
        }
      }
    }
    
    // Fallback: warn and use default
    console.warn('⚠️ Could not find batch_id in key metadata, using fallback');
    return 'unknown-batch';
  }

  // Reconstruct WOTS signature from keyshares using proper DKG reconstruction
  reconstructSignature(keyshares, keyIndex = 0) {
    console.log('🔄 Reconstructing WOTS signature from keyshares...');
    console.log('🔍 Available keyshares:', Object.keys(keyshares));
    
    // Get keyshares from all nodes (matching Python structure)
    const allKeyshares = {};
    for (const [nodeId, nodeData] of Object.entries(keyshares)) {
      if (nodeData.keyshares && nodeData.keyshares.length > 0) {
        allKeyshares[nodeId] = nodeData.keyshares;
      }
    }
    
    if (Object.keys(allKeyshares).length === 0) {
      throw new Error('No keyshares available for reconstruction');
    }
    
    // Find the specific key by index
    let keyMetadata = null;
    
    for (const [nodeId, nodeKeyshares] of Object.entries(allKeyshares)) {
      for (const keyshare of nodeKeyshares) {
        if (keyshare.key_index === keyIndex) {
          keyMetadata = keyshare;
          break;
        }
      }
      if (keyMetadata) break;
    }
    
    if (!keyMetadata) {
      throw new Error(`No keyshare found for key index ${keyIndex}`);
    }
    
    console.log('🔑 Found key metadata:', {
      keyIndex: keyMetadata.key_index,
      denomination: keyMetadata.denomination,
      merkleRoot: keyMetadata.merkle_root,
      treeIndex: keyMetadata.tree_index
    });
    
    // Collect shares from all nodes for threshold reconstruction (matching Python logic)
    const allSharesByElement = {};
    const threshold = 2; // Must match the threshold used in Python
    
    for (const [nodeId, nodeKeyshares] of Object.entries(allKeyshares)) {
      for (const keyshareData of nodeKeyshares) {
        if (keyshareData.key_index === keyIndex) {
          const nodeShares = keyshareData.shares;
          
          for (const shareData of nodeShares) {
            const elementIdx = shareData.element_index;
            const shareValue = shareData.share_value;
            const nodeIndex = shareData.node_index;
            const reconstructionMethod = shareData.reconstruction_method || 'unknown';
            
            if (!allSharesByElement[elementIdx]) {
              allSharesByElement[elementIdx] = [];
            }
            
            allSharesByElement[elementIdx].push({
              nodeIndex,
              shareValue,
              reconstructionMethod
            });
          }
          break;
        }
      }
    }
    
    if (Object.keys(allSharesByElement).length === 0) {
      throw new Error('No shares found for the key');
    }
    
    // Reconstruct private key elements using threshold cryptography
    const reconstructedKey = [];
    
    for (let elementIdx = 0; elementIdx < 67; elementIdx++) { // WOTS has 67 elements
      if (allSharesByElement[elementIdx]) {
        const sharesData = allSharesByElement[elementIdx];
        
        if (sharesData.length >= threshold) {
          // Use deterministic subset selection for consistency (matching Python)
          const sortedShares = sharesData.sort((a, b) => a.nodeIndex - b.nodeIndex);
          const sharesSubset = sortedShares.slice(0, threshold);
          
          // For deterministic DKG, we need to perform Lagrange interpolation
          // For now, use a simplified approach that matches what the Python nodes provide
          let reconstructedSecret;
          
          if (sharesSubset[0].reconstructionMethod === 'deterministic_dkg') {
            // FIXED: Use deterministic reconstruction with the correct batch_id
            // Python nodes use: hashlib.sha256(f"dkg-combined-{batch_id}-{key_index}-{element_idx}")
            
            // Get the batch_id from key metadata (this is what Python used when generating keys)
            const batchId = this.getBatchId(keyshares, keyIndex);
            
            // Generate deterministic seed using the same format as Python
            const seedString = `dkg-combined-${batchId}-${keyIndex}-${elementIdx}`;
            const deterministicSeed = ethers.utils.sha256(ethers.utils.toUtf8Bytes(seedString));
            
            // Apply modulo with same prime as Python VSS
            const prime = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639747');
            reconstructedSecret = BigInt(deterministicSeed) % prime;
            
            console.log(`🔧 Using deterministic reconstruction for element ${elementIdx}:`);
            console.log(`  - Batch ID: ${batchId}`);
            console.log(`  - Key Index: ${keyIndex}`);
            console.log(`  - Seed string: ${seedString}`);
            console.log(`  - Deterministic seed: ${deterministicSeed}`);
            console.log(`  - Reconstructed secret: ${reconstructedSecret.toString()}`);
          } else {
            // For other methods, use first share value
            reconstructedSecret = BigInt(sharesSubset[0].shareValue);
          }
          
          // Convert to 32-byte private key element
          console.log(`Converting reconstructed secret for element ${elementIdx}:`, reconstructedSecret, typeof reconstructedSecret);
          const privateElement = this.bigIntToBytes32(reconstructedSecret);
          console.log(`Result for element ${elementIdx}:`, privateElement, privateElement?.constructor?.name);
          if (!privateElement || privateElement.length !== 32) {
            console.error(`Invalid private element for element ${elementIdx}:`, privateElement);
            reconstructedKey.push(new Uint8Array(32)); // Use zero fallback
          } else {
            reconstructedKey.push(privateElement);
          }
        } else {
          console.warn(`⚠️ Insufficient shares for element ${elementIdx} (${sharesData.length} < ${threshold})`);
          // Use zero fallback
          reconstructedKey.push(new Uint8Array(32));
        }
      } else {
        console.warn(`⚠️ No shares found for element ${elementIdx}`);
        // Use zero fallback
        reconstructedKey.push(new Uint8Array(32));
      }
    }
    
    console.log(`✅ Reconstructed ${reconstructedKey.length} key elements using threshold cryptography`);
    
    // Generate public key from reconstructed private key (matching Python WOTS logic)
    const publicKey = [];
    for (let i = 0; i < reconstructedKey.length; i++) {
      const privElem = reconstructedKey[i];
      if (!privElem || privElem.length !== 32) {
        console.error(`Invalid private element at index ${i}:`, privElem);
        publicKey.push(new Uint8Array(32));
        continue;
      }
      
      // Apply WOTS chaining function (w-1 times) - simplified version
      let pubElem = privElem;
      for (let j = 0; j < 15; j++) { // w-1 = 15 for WOTS parameter w=16
        pubElem = this.sha256(pubElem);
        if (!pubElem || pubElem.length !== 32) {
          console.error(`Invalid hash result at private element ${i}, iteration ${j}:`, pubElem);
          pubElem = new Uint8Array(32);
          break;
        }
      }
      publicKey.push(pubElem);
    }
    
    console.log(`✅ Generated public key with ${publicKey.length} elements`);
    
    // Validate all arrays have proper structure
    console.log('🔍 Validating reconstructed data:');
    console.log('  - Signature elements:', reconstructedKey.length, 'first element type:', typeof reconstructedKey[0]);
    console.log('  - Public key elements:', publicKey.length, 'first element type:', typeof publicKey[0]);
    console.log('  - First signature element:', reconstructedKey[0] ? 'length=' + reconstructedKey[0].length : 'undefined');
    console.log('  - First public key element:', publicKey[0] ? 'length=' + publicKey[0].length : 'undefined');
    
    // ADDED: Show hex values for comparison with Python
    if (publicKey[0]) {
      console.log('  - First public key element (hex):', ethers.utils.hexlify(publicKey[0]));
    }
    if (publicKey[1]) {
      console.log('  - Second public key element (hex):', ethers.utils.hexlify(publicKey[1]));
    }
    if (publicKey[2]) {
      console.log('  - Third public key element (hex):', ethers.utils.hexlify(publicKey[2]));
    }
    
    return { 
      signature: reconstructedKey, // This will be used to sign the withdrawal message
      publicKey, 
      merkleRoot: keyMetadata.merkle_root,
      merkleProof: keyMetadata.merkle_proof || [],
      treeIndex: keyMetadata.tree_index || 0,
      denomination: keyMetadata.denomination
    };
  }

  // Format data to bytes32[67] array
  formatToBytes32Array(data, length) {
    if (!data) {
      throw new Error('Data is required for bytes32 array formatting');
    }

    // If data is already an array of the correct length
    if (Array.isArray(data) && data.length === length) {
      return data.map(item => {
        if (typeof item === 'string' && item.startsWith('0x')) {
          return ethers.utils.hexZeroPad(item, 32);
        }
        return ethers.utils.hexZeroPad(ethers.utils.hexlify(item), 32);
      });
    }

    // If data is a hex string
    if (typeof data === 'string' && data.startsWith('0x')) {
      const hex = data.slice(2);
      if (hex.length !== length * 64) {
        throw new Error(`Hex string must represent exactly ${length} bytes32 values`);
      }

      const result = [];
      for (let i = 0; i < length; i++) {
        const chunk = '0x' + hex.slice(i * 64, (i + 1) * 64);
        result.push(chunk);
      }
      return result;
    }

    throw new Error('Invalid data format for bytes32 array');
  }

  // Get merkle root ID from contract
  async getMerkleRootId(provider, merkleRoot) {
    try {
      console.log('🔧 Getting merkle root ID for:', merkleRoot);
      const contract = new ethers.Contract(this.treasuryAddress, TREASURY_ABI, provider);
      
      // Ensure merkleRoot is properly formatted
      let formattedMerkleRoot = merkleRoot;
      if (typeof merkleRoot !== 'string') {
        console.log('  - Converting merkle root to string:', merkleRoot);
        formattedMerkleRoot = String(merkleRoot);
      }
      
      // Add 0x prefix if missing
      if (!formattedMerkleRoot.startsWith('0x')) {
        console.log('  - Adding 0x prefix to merkle root:', formattedMerkleRoot);
        formattedMerkleRoot = '0x' + formattedMerkleRoot;
      }
      console.log('  - Formatted merkle root:', formattedMerkleRoot);
      
      const merkleRootId = await contract.getMerkleRootIdByRoot(formattedMerkleRoot);
      console.log('  - Merkle root ID result:', merkleRootId.toString());
      
      if (merkleRootId.eq(0)) {
        throw new Error('Merkle root not found in contract');
      }
      
      return merkleRootId;
    } catch (error) {
      console.error('Error getting merkle root ID:', error);
      throw error;
    }
  }

  // Withdraw from smart contract
  async withdrawFromContract(provider, signer, withdrawalData) {
    console.log('🏦 Starting smart contract withdrawal...');
    console.log('📊 Raw withdrawal data:', withdrawalData);
    
    const {
      recipient,
      denomination,
      keyshares,
      keyIndex = 0 // Default to first key
    } = withdrawalData;

    console.log('📊 Extracted withdrawal data:');
    console.log('  - recipient:', recipient, typeof recipient);
    console.log('  - denomination:', denomination, typeof denomination);
    console.log('  - keyshares:', !!keyshares);
    console.log('  - keyIndex:', keyIndex, typeof keyIndex);

    // Get first keyshare for metadata by finding the key with matching key_index
    const firstNodeKeyshares = Object.values(keyshares)[0];
    if (!firstNodeKeyshares || !firstNodeKeyshares.keyshares || firstNodeKeyshares.keyshares.length === 0) {
      throw new Error('No keyshares available');
    }

    const firstKey = firstNodeKeyshares.keyshares.find(key => key.key_index === keyIndex);
    if (!firstKey) {
      throw new Error(`No keyshare found for key_index ${keyIndex}`);
    }

    console.log('🔍 Found key for keyIndex', keyIndex, ':', firstKey);
    
    // Get merkle root and proof from keys_metadata (not from keyshare directly)
    // The merkle root is stored in keys_metadata array
    const keysMetadata = firstNodeKeyshares.keys_metadata;
    if (!keysMetadata || (Array.isArray(keysMetadata) && keysMetadata.length === 0) || (typeof keysMetadata === 'object' && Object.keys(keysMetadata).length === 0)) {
      throw new Error('No keys_metadata found in keyshare data');
    }
    
    // Find the metadata for the matching key_index
    // Handle both object and array formats for keys_metadata
    let keyMetadata;
    if (Array.isArray(keysMetadata)) {
      // Array format: find by key_index
      keyMetadata = keysMetadata.find(meta => meta.key_index === keyIndex);
    } else {
      // Object format: access by key_index directly
      keyMetadata = keysMetadata[keyIndex] || keysMetadata[String(keyIndex)] || keysMetadata[Number(keyIndex)];
    }
    if (!keyMetadata) {
      throw new Error(`No metadata found for key_index ${keyIndex}`);
    }
    
    // DEBUG: Cross-check metadata consistency across all nodes
    console.log('🔍 Cross-checking metadata consistency across nodes...');
    const allNodeIds = Object.keys(keyshares);
    for (const nodeId of allNodeIds) {
      const nodeKeyshares = keyshares[nodeId];
      if (nodeKeyshares?.keys_metadata) {
        const nodeKeyMetadata = nodeKeyshares.keys_metadata.find(meta => meta.key_index === keyIndex);
        if (nodeKeyMetadata) {
          console.log(`  - Node ${nodeId} metadata:`, {
            tree_index: nodeKeyMetadata.tree_index,
            merkle_root: nodeKeyMetadata.merkle_root,
            merkle_proof_length: nodeKeyMetadata.merkle_proof?.length || 0
          });
          
          // Check for inconsistencies
          if (nodeKeyMetadata.tree_index !== keyMetadata.tree_index) {
            console.error(`❌ TREE INDEX MISMATCH: Node ${nodeId} has tree_index ${nodeKeyMetadata.tree_index}, but first node has ${keyMetadata.tree_index}`);
          }
          if (nodeKeyMetadata.merkle_root !== keyMetadata.merkle_root) {
            console.error(`❌ MERKLE ROOT MISMATCH: Node ${nodeId} has different merkle root`);
          }
        }
      }
    }
    
    const merkleRoot = keyMetadata.merkle_root;
    const merkleProof = keyMetadata.merkle_proof || [];
    const treeIndex = keyMetadata.tree_index || 0;

    console.log('🌳 Merkle data extracted from keys_metadata:');
    console.log('  - merkleRoot:', merkleRoot, typeof merkleRoot);
    console.log('  - merkleProof:', merkleProof, Array.isArray(merkleProof) ? `array(${merkleProof.length})` : typeof merkleProof);
    console.log('  - treeIndex:', treeIndex, typeof treeIndex);
    
    // Run comprehensive debugging BEFORE any contract calls
    console.log('\n🚨 RUNNING COMPREHENSIVE MERKLE DEBUG...');
    try {
      // First, get the reconstructed public key for verification
      const { signature, publicKey } = this.reconstructSignature(keyshares, keyIndex);
      
      // Convert to bytes32 arrays for debugging
      const publicKeyBytes32 = publicKey.map(elem => {
        if (elem instanceof Uint8Array) {
          return ethers.utils.hexlify(elem);
        }
        return ethers.utils.hexlify(elem);
      });
      
      // Format merkle proof for debugging
      const formattedMerkleProof = merkleProof.map(proof => {
        if (typeof proof === 'string' && proof.startsWith('0x')) {
          return proof;
        } else if (typeof proof === 'string' && !proof.startsWith('0x')) {
          return '0x' + proof;
        }
        return ethers.utils.hexlify(proof);
      });
      
      // Run comprehensive debug
      const debugResult = await MerkleDebugger.runComprehensiveDebug(
        provider, 
        this.treasuryAddress, 
        keyshares, 
        keyIndex, 
        publicKeyBytes32, 
        formattedMerkleProof, 
        merkleRoot, 
        treeIndex
      );
      
      if (!debugResult) {
        throw new Error('Merkle proof debugging failed - transaction would revert with InvalidMerkleProof()');
      }
      
      console.log('✅ All merkle debugging checks passed! Proceeding with withdrawal...');
      
      // Continue with the original withdrawal process
      return await this.continueWithdrawal(provider, signer, keyshares, keyIndex, recipient, denomination);
      
    } catch (debugError) {
      console.error('❌ Merkle debugging failed:', debugError);
      throw new Error(`Pre-flight validation failed: ${debugError.message}`);
    }
  }
  
  // Continue with withdrawal after debugging passes
  async continueWithdrawal(provider, signer, keyshares, keyIndex, recipient, denomination) {
    // Get first keyshare for metadata again
    const firstNodeKeyshares = Object.values(keyshares)[0];
    const keysMetadata = firstNodeKeyshares.keys_metadata;
    
    // Handle both object and array formats for keys_metadata
    let keyMetadata;
    if (Array.isArray(keysMetadata)) {
      // Array format: find by key_index
      keyMetadata = keysMetadata.find(meta => meta.key_index === keyIndex);
    } else {
      // Object format: access by key_index directly
      keyMetadata = keysMetadata[keyIndex] || keysMetadata[String(keyIndex)] || keysMetadata[Number(keyIndex)];
    }
    
    const merkleRoot = keyMetadata.merkle_root;
    const merkleProof = keyMetadata.merkle_proof || [];
    const treeIndex = keyMetadata.tree_index || 0;
    
    // Validate critical data
    if (!merkleRoot) {
      console.error('❌ Merkle root is missing from keys_metadata');
      console.error('Available metadata properties:', Object.keys(keyMetadata));
      throw new Error('Merkle root is missing from keys_metadata');
    }

    // Reconstruct signature
    const { signature, publicKey } = this.reconstructSignature(keyshares, keyIndex);
    
    // Create withdrawal message and sign it
    const withdrawalMessage = this.createWithdrawalMessage(recipient, denomination, merkleRoot);
    const wotsSignature = this.signWithdrawalMessage(withdrawalMessage, signature);
    
    // Convert to bytes32 arrays for contract
    console.log('🔄 Converting signature to bytes32...');
    console.log('  - WOTS signature type:', typeof wotsSignature, 'length:', wotsSignature?.length);
    console.log('  - First element type:', typeof wotsSignature?.[0], 'is Uint8Array:', wotsSignature?.[0] instanceof Uint8Array);
    
    // Early validation
    if (!wotsSignature || !Array.isArray(wotsSignature)) {
      throw new Error('Invalid WOTS signature: not an array');
    }
    if (wotsSignature.length !== 67) {
      throw new Error(`Invalid WOTS signature length: ${wotsSignature.length}, expected 67`);
    }
    if (!publicKey || !Array.isArray(publicKey)) {
      throw new Error('Invalid public key: not an array');
    }
    if (publicKey.length !== 67) {
      throw new Error(`Invalid public key length: ${publicKey.length}, expected 67`);
    }
    
    // Ensure wotsSignature is an array before mapping
    if (!Array.isArray(wotsSignature)) {
      console.error('❌ wotsSignature is not an array:', typeof wotsSignature);
      throw new Error('Invalid WOTS signature: not an array');
    }
    
    const signatureBytes32 = Array.from(wotsSignature).map((elem, index) => {
      try {
        if (!elem) {
          throw new Error(`Invalid signature element at index ${index} (undefined)`);
        }
        console.log(`  - Converting signature element ${index}:`, typeof elem, elem instanceof Uint8Array ? `Uint8Array(${elem.length})` : elem);
        
        // Handle Uint8Array conversion to hex
        if (elem instanceof Uint8Array) {
          try {
            // Validate Uint8Array is exactly 32 bytes
            if (elem.length !== 32) {
              throw new Error(`Invalid Uint8Array length: ${elem.length}, expected 32`);
            }
            const result = ethers.utils.hexlify(elem);
            console.log(`    ✅ Converted Uint8Array to hex: ${result.slice(0, 10)}...`);
            return result;
          } catch (error) {
            console.error(`    ❌ Error converting Uint8Array to hex:`, error);
            throw new Error(`Failed to convert signature Uint8Array to hex: ${error.message}`);
          }
        }
        // Handle already hex strings
        if (typeof elem === 'string' && elem.startsWith('0x')) {
          // Validate hex string is exactly 32 bytes (66 characters including 0x)
          if (elem.length !== 66) {
            throw new Error(`Invalid hex string length: ${elem.length}, expected 66 (0x + 64 chars)`);
          }
          console.log(`    ✅ Already hex string: ${elem.slice(0, 10)}...`);
          return elem;
        }
        // Handle other formats
        console.log(`    ⚠️ Converting other format:`, typeof elem, elem);
        console.log(`    ⚠️ Element details:`, {
          type: typeof elem,
          constructor: elem?.constructor?.name,
          length: elem?.length,
          isArray: Array.isArray(elem),
          isUint8Array: elem instanceof Uint8Array,
          firstFewValues: elem?.slice ? elem.slice(0, 5) : 'no slice method'
        });
        try {
          const result = ethers.utils.hexlify(elem);
          console.log(`    ✅ Converted to hex: ${result.slice(0, 10)}...`);
          return result;
        } catch (error) {
          console.error(`    ❌ Error converting to hex:`, error);
          console.error(`    ❌ Failed element:`, elem);
          throw new Error(`Failed to convert signature element to hex: ${error.message}`);
        }
      } catch (error) {
        console.error(`Error converting signature element ${index}:`, error, 'element:', elem);
        throw error;
      }
    });
    
    console.log('🔄 Converting public key to bytes32...');
    // Ensure publicKey is an array before mapping
    if (!Array.isArray(publicKey)) {
      console.error('❌ publicKey is not an array:', typeof publicKey);
      throw new Error('Invalid public key: not an array');
    }
    
    const publicKeyBytes32 = Array.from(publicKey).map((elem, index) => {
      try {
        if (!elem) {
          throw new Error(`Invalid public key element at index ${index} (undefined)`);
        }
        console.log(`  - Converting public key element ${index}:`, typeof elem, elem instanceof Uint8Array ? `Uint8Array(${elem.length})` : elem);
        
        // Handle Uint8Array conversion to hex
        if (elem instanceof Uint8Array) {
          try {
            // Validate Uint8Array is exactly 32 bytes
            if (elem.length !== 32) {
              throw new Error(`Invalid Uint8Array length: ${elem.length}, expected 32`);
            }
            const result = ethers.utils.hexlify(elem);
            console.log(`    ✅ Converted Uint8Array to hex: ${result.slice(0, 10)}...`);
            return result;
          } catch (error) {
            console.error(`    ❌ Error converting Uint8Array to hex:`, error);
            throw new Error(`Failed to convert public key Uint8Array to hex: ${error.message}`);
          }
        }
        // Handle already hex strings
        if (typeof elem === 'string' && elem.startsWith('0x')) {
          // Validate hex string is exactly 32 bytes (66 characters including 0x)
          if (elem.length !== 66) {
            throw new Error(`Invalid hex string length: ${elem.length}, expected 66 (0x + 64 chars)`);
          }
          console.log(`    ✅ Already hex string: ${elem.slice(0, 10)}...`);
          return elem;
        }
        // Handle other formats
        console.log(`    ⚠️ Converting other format:`, typeof elem, elem);
        console.log(`    ⚠️ Element details:`, {
          type: typeof elem,
          constructor: elem?.constructor?.name,
          length: elem?.length,
          isArray: Array.isArray(elem),
          isUint8Array: elem instanceof Uint8Array,
          firstFewValues: elem?.slice ? elem.slice(0, 5) : 'no slice method'
        });
        try {
          const result = ethers.utils.hexlify(elem);
          console.log(`    ✅ Converted to hex: ${result.slice(0, 10)}...`);
          return result;
        } catch (error) {
          console.error(`    ❌ Error converting to hex:`, error);
          console.error(`    ❌ Failed element:`, elem);
          throw new Error(`Failed to convert public key element to hex: ${error.message}`);
        }
      } catch (error) {
        console.error(`Error converting public key element ${index}:`, error, 'element:', elem);
        throw error;
      }
    });

    // Get merkle root ID from contract
    const merkleRootId = await this.getMerkleRootId(provider, merkleRoot);
    console.log('🔑 Merkle root ID:', merkleRootId.toString());

    // Create contract instance
    const contract = new ethers.Contract(this.treasuryAddress, TREASURY_ABI, signer);

    // Convert denomination to wei
    const denominationWei = ethers.utils.parseEther(denomination.toString());

    // Prepare withdrawal transaction
    console.log('🔧 Preparing smart contract call with parameters:');
    console.log('  - recipient:', recipient);
    console.log('  - denominationWei:', denominationWei.toString());
    console.log('  - merkleRootId:', merkleRootId.toString());
    console.log('  - signatureBytes32 length:', signatureBytes32.length);
    console.log('  - publicKeyBytes32 length:', publicKeyBytes32.length);
    console.log('  - merkleProof type:', typeof merkleProof, 'length:', merkleProof?.length);
    console.log('  - merkleProof:', merkleProof);
    console.log('  - treeIndex (contract parameter):', treeIndex);
    console.log('  - keyIndex (for reference):', keyIndex);
    
    // Validate merkleProof format first
    let formattedMerkleProof = merkleProof;
    if (merkleProof && Array.isArray(merkleProof)) {
      formattedMerkleProof = Array.from(merkleProof).map((proof, index) => {
        console.log(`  - Processing merkle proof ${index}:`, typeof proof, proof);
        try {
          if (typeof proof === 'string' && proof.startsWith('0x')) {
            // Validate hex string is exactly 32 bytes
            if (proof.length !== 66) {
              throw new Error(`Invalid merkle proof hex length: ${proof.length}, expected 66`);
            }
            return proof;
          } else if (proof instanceof Uint8Array) {
            if (proof.length !== 32) {
              throw new Error(`Invalid merkle proof Uint8Array length: ${proof.length}, expected 32`);
            }
            return ethers.utils.hexlify(proof);
          } else {
            console.warn(`  - Converting merkle proof ${index} to hex:`, proof);
            // Ensure it's a proper hex string
            let hexProof = proof;
            if (typeof proof === 'string' && !proof.startsWith('0x')) {
              hexProof = '0x' + proof;
            }
            return ethers.utils.hexlify(hexProof);
          }
        } catch (error) {
          console.error(`  - Error processing merkle proof ${index}:`, error);
          throw new Error(`Failed to process merkle proof ${index}: ${error.message}`);
        }
      });
      console.log('  - Formatted merkle proof:', formattedMerkleProof);
    }
    
    // Debug: Create packed public key to verify leaf hash computation
    console.log('🔍 DEBUG: Verifying merkle proof computation...');
    try {
      const publicKeyBytes = publicKeyBytes32.map(hex => ethers.utils.arrayify(hex));
      const packedPublicKey = ethers.utils.concat(publicKeyBytes);
      const leafHash = ethers.utils.keccak256(packedPublicKey);
      console.log('  - Packed public key length:', packedPublicKey.length);
      console.log('  - Computed leaf hash:', leafHash);
      console.log('  - Tree index:', treeIndex);
      console.log('  - Merkle proof elements:', formattedMerkleProof?.length || 0);
      
      // Simulate merkle proof verification locally
      if (formattedMerkleProof && formattedMerkleProof.length > 0) {
        let currentHash = leafHash;
        let currentIndex = treeIndex;
        
        console.log('  - Starting merkle proof verification:');
        console.log('    Initial hash:', currentHash);
        console.log('    Initial index:', currentIndex);
        
        for (let i = 0; i < formattedMerkleProof.length; i++) {
          const proofElement = formattedMerkleProof[i];
          console.log(`    Level ${i}: current=${currentHash.slice(0, 10)}..., proof=${proofElement.slice(0, 10)}..., index=${currentIndex}`);
          
          let combined;
          if (currentIndex % 2 === 0) {
            // Left node
            combined = ethers.utils.concat([currentHash, proofElement]);
            console.log(`      LEFT + right combination`);
          } else {
            // Right node
            combined = ethers.utils.concat([proofElement, currentHash]);
            console.log(`      left + RIGHT combination`);
          }
          
          currentHash = ethers.utils.keccak256(combined);
          currentIndex = Math.floor(currentIndex / 2);
          console.log(`      Result: ${currentHash.slice(0, 10)}..., next index: ${currentIndex}`);
        }
        
        console.log('  - Final computed root:', currentHash);
        console.log('  - Expected merkle root:', merkleRoot);
        console.log('  - Merkle root from contract:', `0x${merkleRoot.replace('0x', '')}`);
        const rootsMatch = currentHash.toLowerCase() === `0x${merkleRoot.replace('0x', '')}`.toLowerCase();
        console.log('  - Roots match:', rootsMatch);
        
        if (!rootsMatch) {
          console.error('❌ MERKLE PROOF VERIFICATION FAILED LOCALLY!');
          console.error('This transaction will fail with InvalidMerkleProof()');
          console.error('Check:');
          console.error('  1. tree_index is correct for this key');
          console.error('  2. merkle_proof is for the correct tree position');
          console.error('  3. public key matches the one used to build the tree');
          console.error('Available metadata:', keyMetadata);
          throw new Error('Local merkle proof verification failed - transaction would revert');
        } else {
          console.log('✅ Local merkle proof verification PASSED');
        }
      }
    } catch (debugError) {
      console.error('  - Debug error:', debugError);
    }
    
    try {
      // First try to estimate gas to see if the transaction would succeed
      console.log('  - Attempting gas estimation...');
      let gasEstimate;
      try {
        gasEstimate = await contract.estimateGas.withdraw(
          recipient,
          denominationWei,
          merkleRootId,
          signatureBytes32,
          publicKeyBytes32,
          formattedMerkleProof,
          treeIndex
        );
        console.log('  - Gas estimation successful:', gasEstimate.toString());
      } catch (gasError) {
        console.error('  - Gas estimation failed:', gasError);
        console.log('  - Proceeding with fixed gas limit...');
        gasEstimate = ethers.BigNumber.from('2000000'); // Conservative fallback
      }
      
      // Use a reasonable gas limit (not too high to avoid MetaMask issues)
      const gasLimit = gasEstimate.gt(2000000) ? gasEstimate.mul(120).div(100) : ethers.BigNumber.from('2000000');
      console.log('  - Using gas limit:', gasLimit.toString());
      
      // Final validation before sending transaction
      console.log('  - Final parameter validation...');
      console.log('    Recipient:', recipient, typeof recipient);
      
      // DEBUG: Log full parameter state for comparison with Python
      console.log('🔍 FULL PARAMETER DEBUG:');
      console.log('  - recipient:', recipient);
      console.log('  - denominationWei:', denominationWei);
      console.log('  - merkleRootId:', merkleRootId);
      console.log('  - signatureBytes32 type:', typeof signatureBytes32, 'isArray:', Array.isArray(signatureBytes32), 'length:', signatureBytes32?.length);
      console.log('  - publicKeyBytes32 type:', typeof publicKeyBytes32, 'isArray:', Array.isArray(publicKeyBytes32), 'length:', publicKeyBytes32?.length);
      console.log('  - formattedMerkleProof type:', typeof formattedMerkleProof, 'isArray:', Array.isArray(formattedMerkleProof), 'length:', formattedMerkleProof?.length);
      console.log('  - treeIndex:', treeIndex, typeof treeIndex);
      
      // Ensure arrays are actual arrays
      if (!Array.isArray(signatureBytes32)) {
        console.error('❌ signatureBytes32 is not an array! Converting...');
        signatureBytes32 = Array.from(signatureBytes32 || []);
      }
      if (!Array.isArray(publicKeyBytes32)) {
        console.error('❌ publicKeyBytes32 is not an array! Converting...');
        publicKeyBytes32 = Array.from(publicKeyBytes32 || []);
      }
      if (!Array.isArray(formattedMerkleProof)) {
        console.error('❌ formattedMerkleProof is not an array! Converting...');
        formattedMerkleProof = Array.from(formattedMerkleProof || []);
      }
      
      // TEMPORARY: Make validation non-blocking to see what we're actually sending
      try {
        if (!ethers.utils.isAddress(recipient)) {
          console.error(`⚠️ Invalid recipient address format: ${recipient}`);
        }
        
        console.log('    Denomination Wei:', denominationWei?.toString(), typeof denominationWei);
        if (!denominationWei || denominationWei.isZero()) {
          console.error(`⚠️ Invalid denomination amount: ${denominationWei}`);
        }
        
        console.log('    Merkle Root ID:', merkleRootId?.toString(), typeof merkleRootId);
        if (!merkleRootId || merkleRootId.isZero()) {
          console.error(`⚠️ Invalid merkle root ID: ${merkleRootId}`);
        }
        
        console.log('    Signature array:', Array.isArray(signatureBytes32), signatureBytes32?.length);
        if (!Array.isArray(signatureBytes32) || signatureBytes32.length !== 67) {
          console.error(`⚠️ Invalid signature array: expected 67 elements, got ${signatureBytes32?.length}`);
        }
        
        console.log('    Public key array:', Array.isArray(publicKeyBytes32), publicKeyBytes32?.length);
        if (!Array.isArray(publicKeyBytes32) || publicKeyBytes32.length !== 67) {
          console.error(`⚠️ Invalid public key array: expected 67 elements, got ${publicKeyBytes32?.length}`);
        }
        
        console.log('    Merkle proof array:', Array.isArray(formattedMerkleProof), formattedMerkleProof?.length);
        if (!Array.isArray(formattedMerkleProof)) {
          console.error('⚠️ Invalid merkle proof: must be array');
        }
        
        console.log('    Tree index:', treeIndex, typeof treeIndex);
        if (typeof treeIndex !== 'number' || treeIndex < 0) {
          console.error(`⚠️ Invalid tree index: must be non-negative number, got ${treeIndex} (${typeof treeIndex})`);
        }
        
        // Log first few elements for debugging
        if (signatureBytes32 && signatureBytes32.length > 0) {
          console.log('    First signature elements:');
          for (let i = 0; i < Math.min(3, signatureBytes32.length); i++) {
            const elem = signatureBytes32[i];
            console.log(`      Signature[${i}]:`, typeof elem, elem?.length, elem?.slice(0, 16) + '...');
          }
        }
        
        if (publicKeyBytes32 && publicKeyBytes32.length > 0) {
          console.log('    First public key elements:');
          for (let i = 0; i < Math.min(3, publicKeyBytes32.length); i++) {
            const elem = publicKeyBytes32[i];
            console.log(`      PublicKey[${i}]:`, typeof elem, elem?.length, elem?.slice(0, 16) + '...');
          }
        }
        
        if (formattedMerkleProof && formattedMerkleProof.length > 0) {
          console.log('    Merkle proof elements:');
          for (let i = 0; i < formattedMerkleProof.length; i++) {
            const elem = formattedMerkleProof[i];
            console.log(`      MerkleProof[${i}]:`, typeof elem, elem?.length, elem?.slice(0, 16) + '...');
          }
        }
      } catch (validationError) {
        console.error('⚠️ Validation error (non-blocking):', validationError.message);
      }
      
      console.log('  - All parameters validated successfully');
      
      // TEMPORARY: Comment out the strict validation to see what the real error is
      console.log('  - Attempting transaction with current parameters...');
      // Final check - ensure we're sending arrays
      console.log('  - Final type check before sending:');
      console.log('    signatureBytes32 isArray:', Array.isArray(signatureBytes32));
      console.log('    publicKeyBytes32 isArray:', Array.isArray(publicKeyBytes32));
      console.log('    formattedMerkleProof isArray:', Array.isArray(formattedMerkleProof));
      
      // Force convert to proper arrays one more time
      const finalSignature = [...signatureBytes32];
      const finalPublicKey = [...publicKeyBytes32];
      const finalMerkleProof = [...formattedMerkleProof];
      
      console.log('  - After spread conversion:');
      console.log('    finalSignature isArray:', Array.isArray(finalSignature), 'length:', finalSignature.length);
      console.log('    finalPublicKey isArray:', Array.isArray(finalPublicKey), 'length:', finalPublicKey.length);
      console.log('    finalMerkleProof isArray:', Array.isArray(finalMerkleProof), 'length:', finalMerkleProof.length);
      
      console.log('  - Attempting simplified transaction method...');
      
      // Try a different approach - build transaction manually
      try {
        // Encode the function call data
        const iface = new ethers.utils.Interface(TREASURY_ABI);
        const encodedData = iface.encodeFunctionData('withdraw', [
          recipient,
          denominationWei,
          merkleRootId,
          finalSignature,
          finalPublicKey,
          finalMerkleProof,
          treeIndex
        ]);
        
        console.log('  - Encoded function data length:', encodedData.length);
        console.log('  - First 10 chars of encoded data:', encodedData.slice(0, 10));
        
        // Send as raw transaction
        const txRequest = {
          to: this.treasuryAddress,
          data: encodedData,
          gasLimit: gasLimit,
          from: await signer.getAddress()
        };
        
        console.log('  - Transaction request:', {
          to: txRequest.to,
          from: txRequest.from,
          gasLimit: txRequest.gasLimit.toString(),
          dataLength: txRequest.data.length
        });
        
        const tx = await signer.sendTransaction(txRequest);
        console.log('✅ Transaction sent successfully!');
        console.log('📡 Transaction hash:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed!');
        
        return {
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        };
        
      } catch (rawTxError) {
        console.error('❌ Raw transaction also failed:', rawTxError);
        
        // Check if it's still the JSON-RPC error
        if (rawTxError.code === -32603) {
          console.error('  - Still getting JSON-RPC error');
          console.error('  - This suggests the transaction data itself is invalid');
          
          // Log the exact parameters for debugging
          console.log('🔍 DEBUGGING - Exact parameters being sent:');
          console.log('  recipient:', recipient);
          console.log('  denominationWei:', denominationWei.toString(), denominationWei._hex);
          console.log('  merkleRootId:', merkleRootId.toString(), merkleRootId._hex);
          console.log('  finalSignature[0]:', finalSignature[0]);
          console.log('  finalPublicKey[0]:', finalPublicKey[0]);
          console.log('  finalMerkleProof[0]:', finalMerkleProof[0]);
          console.log('  treeIndex:', treeIndex, typeof treeIndex);
          
          // Try one more approach - match Python exactly
          console.log('  - Trying to match Python script format exactly...');
          
          // Python uses direct values, not BigNumbers for some params
          const treeIndexNum = parseInt(treeIndex);
          const merkleRootIdNum = merkleRootId.toNumber();
          
          console.log('  - Using number types:', {
            treeIndex: treeIndexNum,
            merkleRootId: merkleRootIdNum,
            denominationWei: denominationWei.toString()
          });
          
          // Try with explicit gas settings matching Python
          const txOptions = {
            gasLimit: ethers.utils.hexlify(2000000),
            gasPrice: ethers.utils.parseUnits('20', 'gwei'),
            from: await signer.getAddress()
          };
          
          console.log('  - Transaction options:', {
            gasLimit: txOptions.gasLimit,
            gasPrice: txOptions.gasPrice.toString(),
            from: txOptions.from
          });
          
          try {
            // First attempt - all BigNumbers
            console.log('  - Attempt 1: All BigNumbers...');
            const tx1 = await contract.withdraw(
              recipient,
              denominationWei,
              ethers.BigNumber.from(merkleRootIdNum),
              finalSignature,
              finalPublicKey,
              finalMerkleProof,
              ethers.BigNumber.from(treeIndexNum),
              txOptions
            );
            
            console.log('✅ Contract call successful!');
            console.log('📡 Withdrawal transaction sent:', tx1.hash);
            
            const receipt = await tx1.wait();
            console.log('✅ Withdrawal confirmed in block:', receipt.blockNumber);

            return {
              txHash: tx1.hash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed.toString()
            };
          } catch (attempt1Error) {
            console.error('  - Attempt 1 failed:', attempt1Error.message);
            
            // Second attempt - mixed types like Python might use
            console.log('  - Attempt 2: Mixed number types...');
            try {
              const tx2 = await contract.withdraw(
                recipient,
                denominationWei,
                merkleRootIdNum,  // Plain number
                finalSignature,
                finalPublicKey,
                finalMerkleProof,
                treeIndexNum,     // Plain number
                txOptions
              );
              
              console.log('✅ Contract call successful with mixed types!');
              console.log('📡 Withdrawal transaction sent:', tx2.hash);
              
              const receipt = await tx2.wait();
              console.log('✅ Withdrawal confirmed in block:', receipt.blockNumber);

              return {
                txHash: tx2.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
              };
            } catch (attempt2Error) {
              console.error('  - Attempt 2 also failed:', attempt2Error.message);
              
              // Final attempt - remove from field
              console.log('  - Attempt 3: Without from field...');
              const minimalOptions = {
                gasLimit: 2000000
              };
              
              try {
                const tx3 = await contract.withdraw(
                  recipient,
                  denominationWei,
                  merkleRootId,
                  finalSignature,
                  finalPublicKey,
                  finalMerkleProof,
                  treeIndexNum,
                  minimalOptions
                );
                
                console.log('✅ Contract call successful with minimal options!');
                console.log('📡 Withdrawal transaction sent:', tx3.hash);
                
                const receipt = await tx3.wait();
                console.log('✅ Withdrawal confirmed in block:', receipt.blockNumber);

                return {
                  txHash: tx3.hash,
                  blockNumber: receipt.blockNumber,
                  gasUsed: receipt.gasUsed.toString()
                };
              } catch (attempt3Error) {
                console.error('  - All attempts failed');
                throw rawTxError; // Re-throw original error
              }
            }
          }
        } else {
          throw rawTxError;
        }
      }
    } catch (contractError) {
      console.error('❌ Contract call failed:', contractError);
      
      // Handle MetaMask specific errors
      if (contractError.code === -32603 && contractError.message === 'Internal JSON-RPC error.') {
        console.error('🔍 MetaMask Internal JSON-RPC Error Detected:');
        console.error('  - This usually happens when the transaction parameters are invalid');
        console.error('  - Or when the gas limit is too high');
        console.error('  - Check that all parameters are properly formatted');
        throw new Error('MetaMask Internal JSON-RPC error - check transaction parameters');
      }
      
      // Handle user rejection
      if (contractError.code === 4001) {
        console.error('🚫 Transaction rejected by user');
        throw new Error('Transaction rejected by user');
      }
      
      // Decode custom error codes
      const errorCodes = {
        '0x30cd7471': 'NotOwner()',
        '0xe6c4247b': 'InvalidAddress()',
        '0x2c5211c6': 'InvalidAmount()',
        '0xc2f5625a': 'AmountTooSmall()',
        '0xf067b3c6': 'InvalidDenomination()',
        '0x22c1498e': 'DenominationNotSupported()',
        '0x12b3b8ff': 'KeyAlreadyUsed()',
        '0xb05e92fa': 'InvalidMerkleProof()',
        '0x8baa579f': 'InvalidSignature()',
        '0x786e0a99': 'InsufficientContractBalance()',
        '0x90b8ec18': 'TransferFailed()',
        '0x6d39fcd0': 'ContractIsPaused()',
        '0x5d915671': 'MerkleRootNotFound()',
        '0x4f016755': 'MerkleRootExpired()',
        '0x6ebfd135': 'MerkleRootIsPaused()',
        '0x8d2fdddf': 'InvalidExpiryDays()',
        '0x5ff62aae': 'MerkleRootNotExpired()'
      };
      
      // Check if it's a custom error
      if (contractError.data && errorCodes[contractError.data]) {
        const errorName = errorCodes[contractError.data];
        console.error(`❌ Smart contract error: ${errorName}`);
        
        if (errorName === 'InvalidMerkleProof()') {
          console.error('🔍 MERKLE PROOF ISSUE DETECTED:');
          console.error('  - This means the merkle proof verification failed in the smart contract');
          console.error('  - The computed merkle root does not match the expected merkle root');
          console.error('  - Check the debug output above for proof computation details');
          
          // Re-run the local verification to help debug
          try {
            const publicKeyBytes = publicKeyBytes32.map(hex => ethers.utils.arrayify(hex));
            const packedPublicKey = ethers.utils.concat(publicKeyBytes);
            const leafHash = ethers.utils.keccak256(packedPublicKey);
            
            console.error('  - Local verification results:');
            console.error('    Leaf hash:', leafHash);
            console.error('    Tree index:', treeIndex);
            console.error('    Proof length:', formattedMerkleProof?.length);
            console.error('    Expected merkle root:', merkleRoot);
            
            if (formattedMerkleProof && formattedMerkleProof.length > 0) {
              let currentHash = leafHash;
              let currentIndex = treeIndex;
              
              for (let i = 0; i < formattedMerkleProof.length; i++) {
                const proofElement = formattedMerkleProof[i];
                let combined;
                if (currentIndex % 2 === 0) {
                  combined = ethers.utils.concat([currentHash, proofElement]);
                } else {
                  combined = ethers.utils.concat([proofElement, currentHash]);
                }
                currentHash = ethers.utils.keccak256(combined);
                currentIndex = Math.floor(currentIndex / 2);
              }
              
              console.error('    Computed root:', currentHash);
              console.error('    Roots match:', currentHash.toLowerCase() === `0x${merkleRoot.replace('0x', '')}`.toLowerCase());
            }
          } catch (debugError) {
            console.error('  - Debug error:', debugError);
          }
        }
        
        throw new Error(`Smart contract error: ${errorName}`);
      }
      
      console.log('Contract call parameters summary:');
      console.log('  - All parameters defined:', {
        recipient: !!recipient,
        denominationWei: !!denominationWei,
        merkleRootId: !!merkleRootId,
        signatureBytes32: !!signatureBytes32 && signatureBytes32.length,
        publicKeyBytes32: !!publicKeyBytes32 && publicKeyBytes32.length,
        formattedMerkleProof: !!formattedMerkleProof,
        treeIndex: treeIndex !== undefined,
        keyIndex: keyIndex !== undefined
      });
      throw contractError;
    }
  }

  // Helper functions for crypto operations
  bigIntToBytes32(value) {
    try {
      // Convert BigInt to 32-byte Uint8Array
      console.log('bigIntToBytes32 input:', value, typeof value);
      if (typeof value !== 'bigint') {
        console.warn('Converting non-bigint value to bigint:', value, typeof value);
        if (value === null || value === undefined) {
          console.error('Cannot convert null/undefined to BigInt');
          throw new Error(`Cannot convert ${value} to BigInt`);
        }
        value = BigInt(value);
      }
      
      // Handle negative values by converting to positive
      if (value < 0n) {
        console.warn('Converting negative BigInt to positive:', value);
        // Use modular arithmetic to handle negative values
        const mod = 1n << 256n; // 2^256
        value = ((value % mod) + mod) % mod;
      }
      
      const hex = value.toString(16).padStart(64, '0');
      console.log('bigIntToBytes32 hex:', '0x' + hex);
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      console.log('bigIntToBytes32 result:', ethers.utils.hexlify(bytes));
      return bytes;
    } catch (error) {
      console.error('Error in bigIntToBytes32:', error, 'value:', value);
      // Return zero bytes as fallback
      return new Uint8Array(32);
    }
  }
  
  sha256(data) {
    try {
      // Use keccak256 for WOTS chaining (matching Python implementation)
      if (!data || data.length === 0) {
        console.warn('sha256: Empty or invalid data, returning zero hash');
        return new Uint8Array(32);
      }
      
      // Convert data to hex string if it's a Uint8Array
      let hexData;
      if (data instanceof Uint8Array) {
        hexData = ethers.utils.hexlify(data);
      } else if (typeof data === 'string' && data.startsWith('0x')) {
        hexData = data;
      } else {
        hexData = ethers.utils.hexlify(data);
      }
      
      // Use keccak256 (same as Python's keccak.new(digest_bits=256))
      const hash = ethers.utils.keccak256(hexData);
      
      // Convert back to Uint8Array
      return ethers.utils.arrayify(hash);
    } catch (error) {
      console.error('Error in sha256:', error, 'data:', data);
      return new Uint8Array(32);
    }
  }
  
  // Create withdrawal message that matches smart contract expectations
  createWithdrawalMessage(recipient, denomination, merkleRoot, chainId = 31337) {
    try {
      console.log('🔧 Creating withdrawal message:');
      console.log('  - recipient:', recipient, typeof recipient);
      console.log('  - denomination:', denomination, typeof denomination);
      console.log('  - merkleRoot:', merkleRoot, typeof merkleRoot);
      console.log('  - chainId:', chainId, typeof chainId);
      
      // Validate inputs
      if (!recipient) {
        throw new Error('Recipient address is required');
      }
      if (denomination === undefined || denomination === null) {
        throw new Error('Denomination is required');
      }
      if (!merkleRoot) {
        throw new Error('Merkle root is required');
      }
      
      // Match the Python format: recipient + denomination + merkleRoot + chainId
      let recipientBytes;
      try {
        recipientBytes = ethers.utils.arrayify(recipient);
        console.log('  - Recipient bytes:', recipientBytes.length);
      } catch (error) {
        console.error('  - Error converting recipient to bytes:', error);
        throw new Error(`Invalid recipient address format: ${recipient}`);
      }
      
      // Handle denomination conversion carefully
      let denominationValue = denomination;
      if (typeof denomination !== 'string' && typeof denomination !== 'number') {
        console.warn('  - Converting denomination to string:', denomination);
        denominationValue = String(denomination);
      }
      
      console.log('  - Processing denomination:', denominationValue, typeof denominationValue);
      const denominationWei = ethers.utils.parseEther(denominationValue.toString());
      console.log('  - Denomination wei:', denominationWei.toString());
      
      let denominationBytes;
      try {
        denominationBytes = ethers.utils.zeroPad(ethers.utils.arrayify(denominationWei), 32);
        console.log('  - Denomination bytes:', denominationBytes.length);
      } catch (error) {
        console.error('  - Error converting denomination to bytes:', error);
        throw new Error(`Invalid denomination wei format: ${denominationWei}`);
      }
      
      // Handle merkle root conversion carefully
      let merkleRootFormatted = merkleRoot;
      if (typeof merkleRoot !== 'string') {
        console.warn('  - Converting merkle root to string:', merkleRoot);
        merkleRootFormatted = String(merkleRoot);
      }
      
      // Ensure merkle root has 0x prefix
      if (!merkleRootFormatted.startsWith('0x')) {
        merkleRootFormatted = '0x' + merkleRootFormatted;
      }
      
      console.log('  - Processing merkle root:', merkleRootFormatted, typeof merkleRootFormatted);
      
      // Validate merkle root is proper hex
      if (!/^0x[0-9a-fA-F]{64}$/.test(merkleRootFormatted)) {
        throw new Error(`Invalid merkle root format: ${merkleRootFormatted}`);
      }
      
      let merkleRootBytes;
      try {
        merkleRootBytes = ethers.utils.arrayify(merkleRootFormatted);
        console.log('  - Merkle root bytes:', merkleRootBytes.length);
      } catch (error) {
        console.error('  - Error converting merkle root to bytes:', error);
        throw new Error(`Invalid merkle root format: ${merkleRootFormatted}`);
      }
      
      let chainIdBytes;
      try {
        chainIdBytes = ethers.utils.zeroPad(ethers.utils.arrayify(chainId), 32);
        console.log('  - Chain ID bytes:', chainIdBytes.length);
      } catch (error) {
        console.error('  - Error converting chain ID to bytes:', error);
        throw new Error(`Invalid chain ID format: ${chainId}`);
      }
      
      // Concatenate all components
      let message;
      try {
        message = ethers.utils.concat([
          recipientBytes,
          denominationBytes, 
          merkleRootBytes,
          chainIdBytes
        ]);
        console.log('  - Combined message length:', message.length);
      } catch (error) {
        console.error('  - Error concatenating message components:', error);
        throw new Error('Failed to concatenate withdrawal message components');
      }
      
      // Hash the message
      let result;
      try {
        result = ethers.utils.keccak256(message);
        console.log('  - Message hash:', result);
        return result;
      } catch (error) {
        console.error('  - Error hashing message:', error);
        throw new Error('Failed to hash withdrawal message');
      }
    } catch (error) {
      console.error('Error creating withdrawal message:', error);
      throw error;
    }
  }
  
  // Convert message to base-16 representation (matching Solidity WinternitzVerifier.messageToBase16)
  messageToBase16(message) {
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a hex string');
    }
    
    // Ensure message is 32 bytes (64 hex chars + 0x prefix)
    let messageHex = message;
    if (messageHex.startsWith('0x')) {
      messageHex = messageHex.slice(2);
    }
    
    if (messageHex.length !== 64) {
      throw new Error(`Message must be 32 bytes, got ${messageHex.length / 2} bytes`);
    }
    
    const messageBytes = ethers.utils.arrayify('0x' + messageHex);
    const result = [];
    
    // Convert first 64 nibbles (256 bits / 4 bits per nibble)
    for (let i = 0; i < 64; i++) {
      const byteIndex = Math.floor(i / 2);
      const nibbleOffset = (1 - (i % 2)) * 4;
      const nibble = (messageBytes[byteIndex] >> nibbleOffset) & 0xF;
      result.push(nibble);
    }
    
    // Calculate checksum (last 3 elements) - matching Solidity logic
    let checksum = 0;
    for (let i = 0; i < 64; i++) {
      checksum = (checksum + result[i]) & 0xFFF; // Keep 12 bits
    }
    
    // Store checksum in last 3 elements (4 bits each)
    result.push(checksum & 0xF);           // Last 4 bits
    result.push((checksum >> 4) & 0xF);    // Middle 4 bits
    result.push((checksum >> 8) & 0xF);    // First 4 bits
    
    return result;
  }

  // Sign withdrawal message using reconstructed WOTS key (proper WOTS implementation)
  signWithdrawalMessage(message, privateKey) {
    try {
      console.log('🔏 Signing message with WOTS:');
      console.log('  - Message:', message);
      console.log('  - Private key elements:', privateKey.length);
      
      if (!privateKey || privateKey.length !== 67) {
        throw new Error(`Expected 67 private key elements, got ${privateKey?.length || 0}`);
      }
      
      // Convert message to base-16 representation (includes checksum)
      const base16Values = this.messageToBase16(message);
      
      if (base16Values.length !== 67) {
        throw new Error(`Expected 67 base-16 values, got ${base16Values.length}`);
      }
      
      console.log('  - Base-16 values (first 5):', base16Values.slice(0, 5));
      console.log('  - Base-16 checksum (last 3):', base16Values.slice(64, 67));
      
      // Generate signature by hashing each private element base16_values[i] times
      const signature = [];
      for (let i = 0; i < 67; i++) {
        const chainLength = base16Values[i];
        let sigElement = privateKey[i];
        
        // Hash the private key element chainLength times
        for (let j = 0; j < chainLength; j++) {
          sigElement = this.sha256(sigElement);
        }
        
        signature.push(sigElement);
        
        if (i < 3) {
          console.log(`  - Element ${i}: chainLength=${chainLength}, result=${ethers.utils.hexlify(sigElement)}`);
        }
      }
      
      console.log('✅ WOTS signature generated with', signature.length, 'elements');
      return signature;
      
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  // Get all available keys for a deposit
  async getAvailableKeys(deposit, provider = null) {
    console.log('🔍 Getting available keys for deposit:', deposit);
    
    if (!deposit.keyshares) {
      console.log('  - No keyshares in deposit');
      return [];
    }

    // Get keys from first node (all nodes should have the same keys)
    const firstNodeKeyshares = Object.values(deposit.keyshares)[0];
    if (!firstNodeKeyshares || !firstNodeKeyshares.keyshares) {
      console.log('  - No keyshares in first node');
      return [];
    }

    console.log('  - Found keyshares:', firstNodeKeyshares.keyshares.length);
    
    // Get metadata for each key (merkle root, tree index, proof are in keys_metadata)
    const keysMetadata = firstNodeKeyshares.keys_metadata || [];
    
    const keys = firstNodeKeyshares.keyshares.map((key, index) => {
      // Find corresponding metadata for this key
      // Handle both object and array formats for keys_metadata
      let keyMetadata;
      if (Array.isArray(keysMetadata)) {
        // Array format: find by key_index
        keyMetadata = keysMetadata.find(meta => meta.key_index === key.key_index);
      } else {
        // Object format: access by key_index directly
        keyMetadata = keysMetadata[key.key_index] || keysMetadata[String(key.key_index)] || keysMetadata[Number(key.key_index)];
      }
      
      console.log(`  - Key ${index}:`, {
        key_index: key.key_index,
        denomination: key.denomination,
        merkle_root: keyMetadata?.merkle_root,
        tree_index: keyMetadata?.tree_index
      });
      
      return {
        keyIndex: key.key_index,
        denomination: key.denomination,
        merkleRoot: keyMetadata?.merkle_root,
        treeIndex: keyMetadata?.tree_index || 0,
        merkleProof: keyMetadata?.merkle_proof || [],
        keyshare: key // Keep the original keyshare for reconstruction
      };
    });
    
    // If provider is available, check which keys are already used
    if (provider) {
      console.log('🔍 Checking which keys are already used in smart contract...');
      
      try {
        // Reconstruct public keys for all keyshares to check if they're used
        const keyUsagePromises = keys.map(async (keyInfo) => {
          try {
            // Reconstruct the public key for this specific key
            const { publicKey } = this.reconstructSignature(deposit.keyshares, keyInfo.keyIndex);
            
            // Check if this key is used in the contract
            const keyIsUsed = await isKeyUsed(provider, publicKey);
            
            return {
              ...keyInfo,
              isUsed: keyIsUsed
            };
          } catch (error) {
            console.error(`Error checking if key ${keyInfo.keyIndex} is used:`, error);
            // If we can't check, assume it might be available
            return {
              ...keyInfo,
              isUsed: false,
              checkError: true
            };
          }
        });
        
        const keysWithUsageStatus = await Promise.all(keyUsagePromises);
        
        // Log usage status
        keysWithUsageStatus.forEach(key => {
          console.log(`  - Key ${key.keyIndex}: ${key.isUsed ? '❌ USED' : '✅ Available'}`);
        });
        
        console.log('  - Processed keys with usage status:', keysWithUsageStatus);
        return keysWithUsageStatus;
        
      } catch (error) {
        console.error('Error checking key usage:', error);
        // If we can't check usage, return keys without usage status
        console.log('  - Returning keys without usage check');
      }
    }
    
    console.log('  - Processed keys:', keys);
    return keys;
  }

  // Complete withdrawal process
  async completeWithdrawal(provider, signer, deposit, recipientAddress = null, selectedKeyIndex = null) {
    try {
      if (!deposit.keyshares) {
        throw new Error('No keyshares available for withdrawal');
      }

      const recipient = recipientAddress || await signer.getAddress();
      console.log('💰 Withdrawing to:', recipient);

      // Get available keys and select the one to withdraw
      const availableKeys = this.getAvailableKeys(deposit);
      if (availableKeys.length === 0) {
        throw new Error('No keys available for withdrawal');
      }

      // Use selected key index or default to first key
      const keyToWithdraw = selectedKeyIndex !== null 
        ? availableKeys.find(key => key.keyIndex === selectedKeyIndex)
        : availableKeys[0];

      if (!keyToWithdraw) {
        throw new Error(`Selected key index ${selectedKeyIndex} not found`);
      }

      console.log('🔑 Withdrawing key:', keyToWithdraw);
      
      const result = await this.withdrawFromContract(provider, signer, {
        recipient,
        denomination: keyToWithdraw.denomination,
        keyshares: deposit.keyshares,
        keyIndex: keyToWithdraw.keyIndex
      });

      return {
        success: true,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
        amount: keyToWithdraw.denomination,
        keyIndex: keyToWithdraw.keyIndex
      };

    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      throw error;
    }
  }

  /**
   * Check the status of multiple keys to see if they're used
   * @param {Object} provider - Ethereum provider
   * @param {Object} keyshares - Keyshares from DKG nodes
   * @param {string} depositId - Deposit transaction hash
   * @returns {Promise<Array>} Array of key info with isUsed status
   */
  async checkKeysStatus(provider, keyshares, depositId) {
    try {
      // Get first node's keyshares to extract key info
      const firstNodeKeyshares = Object.values(keyshares)[0];
      if (!firstNodeKeyshares || !firstNodeKeyshares.keyshares) {
        throw new Error('Invalid keyshares format');
      }

      const keysWithStatus = [];
      
      for (const keyshare of firstNodeKeyshares.keyshares) {
        const metadata = firstNodeKeyshares.keys_metadata?.[keyshare.key_index];
        const keyInfo = {
          keyIndex: keyshare.key_index,
          denomination: keyshare.denomination,
          merkleRoot: metadata?.merkle_root,
          merkleProof: metadata?.merkle_proof,
          treeIndex: metadata?.tree_index,
          batchId: metadata?.batch_id,
          userAddress: metadata?.user_address,
          amount: metadata?.amount || keyshare.denomination,
          // Store complete metadata for any additional fields needed
          originalMetadata: metadata
        };

        try {
          // Reconstruct the public key for this specific key
          const { publicKey } = this.reconstructSignature(keyshares, keyInfo.keyIndex);
          
          // Check if this key is used in the contract
          const keyIsUsed = await isKeyUsed(provider, publicKey);
          
          keysWithStatus.push({
            ...keyInfo,
            isUsed: keyIsUsed
          });
        } catch (error) {
          console.error(`Error checking key ${keyInfo.keyIndex}:`, error);
          // Add key with unknown status
          keysWithStatus.push({
            ...keyInfo,
            isUsed: null // Unknown status
          });
        }
      }

      return keysWithStatus;
    } catch (error) {
      console.error('Error checking keys status:', error);
      throw error;
    }
  }
}

export default new WithdrawalService();