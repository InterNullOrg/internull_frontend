// Treasury Contract Service
// Interacts with the Treasury smart contract to check key usage status

import { ethers } from 'ethers';

// Treasury contract ABI - only the functions we need
const TREASURY_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32[]", "name": "nullifierHashes", "type": "bytes32[]" }
    ],
    "name": "checkNullifiers",
    "outputs": [
      { "internalType": "bool[]", "name": "", "type": "bool[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "", "type": "bytes32" }
    ],
    "name": "nullifiers",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "denomination", "type": "uint256" }
    ],
    "name": "getMerkleRootIds",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "merkleRoots",
    "outputs": [
      { "internalType": "bytes32", "name": "merkleRoot", "type": "bytes32" },
      { "internalType": "uint256", "name": "denomination", "type": "uint256" },
      { "internalType": "uint256", "name": "expiryTimestamp", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" },
      { "internalType": "bool", "name": "isPaused", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "rootHash", "type": "bytes32" }
    ],
    "name": "getMerkleRootIdByHash",
    "outputs": [
      { "internalType": "bool", "name": "found", "type": "bool" },
      { "internalType": "uint256", "name": "rootId", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Find merkleRootId from merkle root hash and denomination
 * @param {ethers.Contract} contract - The treasury contract instance
 * @param {string} merkleRoot - The merkle root hash
 * @param {string} denomination - The denomination in ETH
 * @returns {Promise<number|null>} - The merkleRootId or null if not found
 */
async function findMerkleRootId(contract, merkleRoot, denomination) {
  try {
    // Format merkle root
    let formattedRoot = merkleRoot;
    if (!formattedRoot.startsWith('0x')) {
      formattedRoot = '0x' + formattedRoot;
    }

    // First try the more efficient getMerkleRootIdByHash method
    try {
      const result = await contract.getMerkleRootIdByHash(formattedRoot);
      if (result.found) {
        console.log(`✅ Found merkle root ID using getMerkleRootIdByHash: ${result.rootId.toString()}`);
        return result.rootId;
      }
    } catch (err) {
      console.log('getMerkleRootIdByHash not available or failed, falling back to manual search');
    }

    // Fall back to manual search if the new method is not available
    // Convert denomination to wei
    const denominationWei = ethers.utils.parseEther(denomination.toString());

    // Get all merkle root IDs for this denomination
    const merkleRootIds = await contract.getMerkleRootIds(denominationWei);
    console.log(`Found ${merkleRootIds.length} merkle root IDs for denomination ${denomination} ETH`);

    if (merkleRootIds.length === 0) {
      console.log('No merkle roots found for this denomination');
      return null;
    }

    // Check each merkle root ID to find the matching one
    for (const id of merkleRootIds) {
      try {
        const rootInfo = await contract.merkleRoots(id);

        // Check if the root info is valid and active
        if (rootInfo && rootInfo.isActive && rootInfo.merkleRoot) {
          if (rootInfo.merkleRoot.toLowerCase() === formattedRoot.toLowerCase()) {
            console.log(`✅ Found matching merkle root ID: ${id.toString()}`);
            return id;
          }
        }
      } catch (err) {
        // Continue to next ID
      }
    }

    console.warn(`⚠️ Merkle root ${formattedRoot.slice(0, 10)}... not found in contract`);
    return null;
  } catch (error) {
    console.error('Error finding merkle root ID:', error);
    return null;
  }
}

/**
 * Check if an ECDSA key has been used
 * @param {ethers.providers.Provider} provider - Ethereum provider
 * @param {Object} keyData - Object containing key information
 * @param {number} [keyData.merkleRootId] - The merkle root ID (if known)
 * @param {string} [keyData.merkleRoot] - The merkle root hash (if ID not known)
 * @param {string} [keyData.denomination] - The denomination (required if using merkleRoot)
 * @param {number} keyData.keyIndex - The key index within that merkle tree
 * @returns {Promise<boolean>} - True if key is used, false otherwise
 */
export async function isKeyUsed(provider, keyData) {
  try {
    if (!provider) {
      throw new Error('Provider is required to check key usage');
    }

    // Use treasury address from key data (chain-specific), or fall back to env var
    const contractAddress = keyData.treasury_address ||
      keyData.treasuryAddress ||
      process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS;

    if (!contractAddress) {
      console.warn('⚠️ No treasury address provided for key check. Skipping.');
      return false;
    }

    // Verify the contract exists at this address
    const code = await provider.getCode(contractAddress);
    if (code === '0x' || code === '0x0') {
      throw new Error(`No Treasury contract deployed at ${contractAddress}`);
    }

    const contract = new ethers.Contract(contractAddress, TREASURY_ABI, provider);

    // Handle null/undefined inputs
    if (!keyData || keyData === null || keyData === undefined) {
      throw new Error('Invalid input: key data is required');
    }

    // If keyData is just a number (for backward compatibility), handle it
    if (typeof keyData === 'number' || (typeof keyData === 'string' && !keyData.startsWith('0x'))) {
      // Legacy single keyIndex check - won't work properly without merkleRoot
      console.warn('⚠️ Warning: Checking key without merkle root. This may not work correctly.');
      // Return false to be safe - we can't properly verify without merkle root
      return false;
    }

    // Ensure we have key index
    if (keyData.keyIndex === null || keyData.keyIndex === undefined) {
      throw new Error('Invalid key data: keyIndex is required');
    }

    let merkleRootId = keyData.merkleRootId;

    // If we don't have merkleRootId but have merkleRoot, find it
    if ((merkleRootId === null || merkleRootId === undefined || merkleRootId === 0) && keyData.merkleRoot) {
      if (!keyData.denomination) {
        throw new Error('Denomination is required when using merkle root hash');
      }

      console.log('🔍 Looking up merkle root ID from hash...');
      merkleRootId = await findMerkleRootId(contract, keyData.merkleRoot, keyData.denomination);

      if (merkleRootId === null) {
        // Merkle root not found in contract - key can't be used
        console.log('Merkle root not in contract, key is available');
        return false;
      }
    }

    // Validate merkle root ID
    const parsedMerkleRootId = parseInt(merkleRootId);
    if (isNaN(parsedMerkleRootId) || parsedMerkleRootId < 0) {
      throw new Error(`Invalid merkle root ID: ${merkleRootId}`);
    }

    const { keyIndex } = keyData;

    // Validate key index
    const parsedKeyIndex = parseInt(keyIndex);
    if (isNaN(parsedKeyIndex) || parsedKeyIndex < 0) {
      throw new Error(`Invalid key index: ${keyIndex}`);
    }

    console.log('🔍 Checking key usage:', {
      merkleRootId: parsedMerkleRootId,
      keyIndex: parsedKeyIndex
    });

    // Create nullifier hash (same as contract: keccak256(abi.encodePacked(merkleRootId, keyIndex)))
    // Note: keyIndex here should be the tree_index (position in the merkle tree)
    const nullifierHash = ethers.utils.solidityKeccak256(
      ['uint256', 'uint256'],
      [parsedMerkleRootId, parsedKeyIndex]
    );

    console.log(`  Nullifier hash: ${nullifierHash}`);

    // Check if the nullifier has been used
    const isUsed = await contract.nullifiers(nullifierHash);
    console.log(`  ✓ Key ${parsedKeyIndex} in batch ${parsedMerkleRootId} is ${isUsed ? '❌ USED' : '✅ AVAILABLE'}`);

    return isUsed;

  } catch (error) {
    // Check for specific contract errors
    if (error.message?.includes('function selector was not recognized')) {
      throw new Error('Treasury contract does not support ECDSA key checking. Please ensure you are using the correct contract version.');
    }

    if (error.code === 'NETWORK_ERROR') {
      throw new Error('Network error: Unable to connect to blockchain. Please check your connection.');
    }

    if (error.code === 'CALL_EXCEPTION') {
      throw new Error('Contract call failed. The Treasury contract may not be deployed or accessible.');
    }

    console.error('Error checking if key is used:', error);
    throw new Error(`Failed to check key usage: ${error.message}`);
  }
}

/**
 * Batch check nullifiers using the contract's checkNullifiers function
 * @param {ethers.providers.Provider} provider - Ethereum provider
 * @param {Array<Object>} keysToCheck - Array of key data with merkleRootId and tree_index
 * @returns {Promise<Array>} - Array of usage status for each key
 */
async function batchCheckNullifiers(provider, keysToCheck) {
  try {
    // Get treasury address from first key (all keys should be for same chain)
    const contractAddress = keysToCheck[0]?.treasury_address ||
      keysToCheck[0]?.treasuryAddress ||
      process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS;

    if (!contractAddress) {
      throw new Error('No treasury address provided for batch check');
    }

    const contract = new ethers.Contract(contractAddress, TREASURY_ABI, provider);

    // Create nullifier hashes for all keys
    const nullifierHashes = keysToCheck.map(keyData => {
      const merkleRootId = parseInt(keyData.merkleRootId || 0);
      const treeIndex = parseInt(keyData.keyIndex || 0); // keyIndex is actually tree_index

      return ethers.utils.solidityKeccak256(
        ['uint256', 'uint256'],
        [merkleRootId, treeIndex]
      );
    });

    // Batch check all nullifiers
    const usageStatuses = await contract.checkNullifiers(nullifierHashes);

    return usageStatuses;
  } catch (error) {
    console.error('Error batch checking nullifiers:', error);
    // Fall back to individual checks
    return null;
  }
}

/**
 * Check multiple keys at once
 * @param {ethers.providers.Provider} provider - Ethereum provider
 * @param {Array<Object>} keysToCheck - Array of key data objects with merkleRootId and keyIndex (tree_index)
 * @returns {Promise<Array>} - Array of results with key identifier, isUsed status, and success flag
 */
export async function checkMultipleKeys(provider, keysToCheck) {
  try {
    if (!Array.isArray(keysToCheck) || keysToCheck.length === 0) {
      throw new Error('No keys provided to check');
    }

    console.log(`🔍 Checking ${keysToCheck.length} keys for usage...`);

    // Try batch checking first (more efficient)
    const batchResults = await batchCheckNullifiers(provider, keysToCheck);

    if (batchResults && batchResults.length === keysToCheck.length) {
      console.log('✅ Used batch nullifier checking');

      const results = keysToCheck.map((keyData, index) => ({
        index,
        keyData,
        isUsed: batchResults[index],
        success: true
      }));

      const usedCount = results.filter(r => r.isUsed).length;
      const availableCount = results.filter(r => !r.isUsed).length;

      console.log(`✅ Key usage check complete:`);
      console.log(`   - ${usedCount} keys are USED`);
      console.log(`   - ${availableCount} keys are AVAILABLE`);

      return results;
    }

    // Fall back to individual checks if batch check fails
    console.log('Falling back to individual nullifier checks...');

    // Process in batches to avoid overwhelming the RPC
    const BATCH_SIZE = 10;
    const results = [];

    for (let i = 0; i < keysToCheck.length; i += BATCH_SIZE) {
      const batch = keysToCheck.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (keyData, batchIndex) => {
        const globalIndex = i + batchIndex;

        try {
          const used = await isKeyUsed(provider, keyData);
          return {
            index: globalIndex,
            keyData,
            isUsed: used,
            success: true
          };
        } catch (error) {
          // Don't log warnings for expected cases
          if (!error.message?.includes('Merkle root') || !error.message?.includes('not found')) {
            console.error(`Error checking key ${keyData.keyIndex}:`, error.message);
          }
          return {
            index: globalIndex,
            keyData,
            isUsed: false, // Default to available if we can't check
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < keysToCheck.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const usedCount = results.filter(r => r.isUsed && r.success).length;
    const availableCount = results.filter(r => !r.isUsed && r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`✅ Key usage check complete:`);
    console.log(`   - ${usedCount} keys are USED`);
    console.log(`   - ${availableCount} keys are AVAILABLE`);
    if (failedCount > 0) {
      console.log(`   - ${failedCount} keys could not be verified`);
    }

    return results;

  } catch (error) {
    console.error('Error checking multiple keys:', error);
    throw new Error(`Failed to check multiple keys: ${error.message}`);
  }
}

// Default export for backward compatibility
export default {
  isKeyUsed,
  checkMultipleKeys
};