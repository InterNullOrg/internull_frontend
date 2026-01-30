// Merkle proof debugging utility
import { ethers } from 'ethers';

class MerkleDebugger {
  
  // Verify merkle proof locally before sending to contract
  static verifyMerkleProofLocally(publicKey, merkleProof, merkleRoot, treeIndex) {
    console.log('🔍 LOCAL MERKLE PROOF VERIFICATION');
    console.log('=====================================');
    
    try {
      // Step 1: Convert public key to leaf hash (matching smart contract exactly)
      let leafHash;
      if (Array.isArray(publicKey) && publicKey.length === 67) {
        // Convert bytes32 array to packed bytes using abi.encodePacked() equivalent
        console.log('🔧 Computing leaf hash using abi.encodePacked() equivalent...');
        
        // Ensure each element is exactly 32 bytes
        const publicKeyBytes = publicKey.map((hex, index) => {
          const bytes = ethers.utils.arrayify(hex);
          if (bytes.length !== 32) {
            throw new Error(`Public key element ${index} has ${bytes.length} bytes, expected 32`);
          }
          return bytes;
        });
        
        // Concatenate all 67 * 32 = 2144 bytes (matching abi.encodePacked behavior)
        const packedPublicKey = ethers.utils.concat(publicKeyBytes);
        console.log('  - Packed public key length:', packedPublicKey.length, 'bytes (should be 2144)');
        
        // Hash using keccak256 (matching contract)
        leafHash = ethers.utils.keccak256(packedPublicKey);
        console.log('✅ Leaf hash computed using keccak256(abi.encodePacked(publicKey))');
        console.log('  - Leaf hash:', leafHash);
      } else {
        console.error('❌ Invalid public key format');
        return false;
      }
      
      console.log('📊 Verification parameters:');
      console.log('  - Leaf hash:', leafHash);
      console.log('  - Tree index:', treeIndex);
      console.log('  - Merkle root:', merkleRoot);
      console.log('  - Proof length:', merkleProof?.length || 0);
      
      // Debug merkle proof data in detail
      if (merkleProof && merkleProof.length > 0) {
        console.log('🔍 Merkle proof elements:');
        merkleProof.forEach((proof, index) => {
          console.log(`  [${index}]: ${proof} (${typeof proof}, length: ${proof?.length})`);
        });
      } else {
        console.log('⚠️ Empty or missing merkle proof!');
        console.log('🚨 This indicates the key might be a single leaf tree (no proof needed)');
        console.log('   or the merkle proof data is missing from the keyshare');
        
        // For single leaf tree, the leaf hash should equal the merkle root
        const expectedRoot = merkleRoot.startsWith('0x') ? merkleRoot : `0x${merkleRoot}`;
        const singleLeafMatch = leafHash.toLowerCase() === expectedRoot.toLowerCase();
        console.log('📊 Single leaf tree check:');
        console.log('  - Leaf hash:', leafHash);
        console.log('  - Merkle root:', expectedRoot);
        console.log('  - Match:', singleLeafMatch ? '✅ YES (single leaf tree)' : '❌ NO');
        
        if (singleLeafMatch) {
          console.log('✅ SINGLE LEAF TREE VERIFICATION PASSED!');
          return true;
        } else {
          console.error('❌ SINGLE LEAF TREE VERIFICATION FAILED!');
          console.error('Expected empty proof for single leaf, but leaf ≠ root');
          return false;
        }
      }
      
      // Step 2: Verify merkle proof
      let currentHash = leafHash;
      let currentIndex = treeIndex;
      
      console.log('\n🌳 Proof verification steps:');
      console.log(`Initial: hash=${currentHash.slice(0, 10)}..., index=${currentIndex}`);
      
      for (let i = 0; i < merkleProof.length; i++) {
        const proofElement = merkleProof[i];
        console.log(`\nLevel ${i}:`);
        console.log(`  Current: ${currentHash.slice(0, 10)}...`);
        console.log(`  Proof:   ${proofElement.slice(0, 10)}...`);
        console.log(`  Index:   ${currentIndex} (${currentIndex % 2 === 0 ? 'LEFT' : 'RIGHT'})`);
        
        // Ensure proof element is properly formatted
        let formattedProof = proofElement;
        if (!formattedProof.startsWith('0x')) {
          formattedProof = '0x' + formattedProof;
        }
        
        // Convert to bytes for concatenation
        const currentBytes = ethers.utils.arrayify(currentHash);
        const proofBytes = ethers.utils.arrayify(formattedProof);
        
        let combined;
        if (currentIndex % 2 === 0) {
          // Left node: hash(current, sibling) - matching contract logic exactly
          combined = ethers.utils.concat([currentBytes, proofBytes]);
          console.log(`  → LEFT + right combination (current + proof)`);
        } else {
          // Right node: hash(sibling, current) - matching contract logic exactly
          combined = ethers.utils.concat([proofBytes, currentBytes]);
          console.log(`  → left + RIGHT combination (proof + current)`);
        }
        
        // Use keccak256 to match smart contract
        currentHash = ethers.utils.keccak256(combined);
        currentIndex = Math.floor(currentIndex / 2);
        console.log(`  Result:  ${currentHash.slice(0, 10)}..., next index: ${currentIndex}`);
      }
      
      // Step 3: Compare with expected root
      const expectedRoot = merkleRoot.startsWith('0x') ? merkleRoot : `0x${merkleRoot}`;
      const rootsMatch = currentHash.toLowerCase() === expectedRoot.toLowerCase();
      
      console.log('\n📊 FINAL VERIFICATION:');
      console.log('  Computed root:', currentHash);
      console.log('  Expected root:', expectedRoot);
      console.log('  Match:        ', rootsMatch ? '✅ YES' : '❌ NO');
      
      if (!rootsMatch) {
        console.error('\n❌ MERKLE PROOF VERIFICATION FAILED!');
        console.error('This will cause InvalidMerkleProof() in the smart contract');
        
        // Debugging hints
        console.error('\n🔧 DEBUGGING HINTS:');
        console.error('1. Check if tree_index matches the actual position in the merkle tree');
        console.error('2. Verify that merkle_proof is for the correct tree and position');
        console.error('3. Ensure public key matches exactly what was used to build the tree');
        console.error('4. Check if merkle tree was built deterministically');
        console.error('5. Verify merkle root is the correct one stored in the contract');
      } else {
        console.log('\n✅ MERKLE PROOF VERIFICATION PASSED!');
        console.log('This transaction should succeed if other parameters are correct');
      }
      
      return rootsMatch;
      
    } catch (error) {
      console.error('❌ Error during local verification:', error);
      return false;
    }
  }
  
  // Debug keyshare consistency across nodes
  static debugKeyshareConsistency(keyshares, keyIndex) {
    console.log('\n🔍 KEYSHARE CONSISTENCY CHECK');
    console.log('===============================');
    
    const nodeIds = Object.keys(keyshares);
    const metadataByNode = {};
    
    // Collect metadata from all nodes
    for (const nodeId of nodeIds) {
      const nodeData = keyshares[nodeId];
      if (nodeData?.keys_metadata) {
        const keyMetadata = nodeData.keys_metadata.find(meta => meta.key_index === keyIndex);
        if (keyMetadata) {
          metadataByNode[nodeId] = {
            tree_index: keyMetadata.tree_index,
            merkle_root: keyMetadata.merkle_root,
            merkle_proof_length: keyMetadata.merkle_proof?.length || 0,
            denomination: keyMetadata.denomination
          };
        }
      }
    }
    
    console.log('📊 Metadata by node:');
    Object.entries(metadataByNode).forEach(([nodeId, metadata]) => {
      console.log(`  ${nodeId}:`, metadata);
    });
    
    // Check for inconsistencies
    const firstNodeId = nodeIds[0];
    const referenceMetadata = metadataByNode[firstNodeId];
    
    if (!referenceMetadata) {
      console.error('❌ No metadata found for key_index', keyIndex);
      return false;
    }
    
    let consistent = true;
    for (const [nodeId, metadata] of Object.entries(metadataByNode)) {
      if (nodeId === firstNodeId) continue;
      
      if (metadata.tree_index !== referenceMetadata.tree_index) {
        console.error(`❌ TREE INDEX MISMATCH: ${nodeId} has ${metadata.tree_index}, reference has ${referenceMetadata.tree_index}`);
        consistent = false;
      }
      
      if (metadata.merkle_root !== referenceMetadata.merkle_root) {
        console.error(`❌ MERKLE ROOT MISMATCH: ${nodeId} has different merkle root`);
        consistent = false;
      }
      
      if (metadata.merkle_proof_length !== referenceMetadata.merkle_proof_length) {
        console.error(`❌ MERKLE PROOF LENGTH MISMATCH: ${nodeId} has ${metadata.merkle_proof_length}, reference has ${referenceMetadata.merkle_proof_length}`);
        consistent = false;
      }
    }
    
    if (consistent) {
      console.log('✅ All nodes have consistent metadata');
    } else {
      console.error('❌ NODES HAVE INCONSISTENT METADATA - This indicates a serious issue!');
    }
    
    return consistent;
  }
  
  // Check if the merkle root exists in the contract
  static async checkMerkleRootInContract(provider, treasuryAddress, merkleRoot) {
    console.log('\n🔍 MERKLE ROOT CONTRACT CHECK');
    console.log('==============================');
    
    try {
      const abi = [{
        "inputs": [{"internalType": "bytes32", "name": "merkleRoot", "type": "bytes32"}],
        "name": "getMerkleRootIdByRoot",
        "outputs": [{"internalType": "uint256", "name": "merkleRootId", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }];
      
      const contract = new ethers.Contract(treasuryAddress, abi, provider);
      
      // Format merkle root
      const formattedRoot = merkleRoot.startsWith('0x') ? merkleRoot : `0x${merkleRoot}`;
      console.log('🔍 Checking merkle root:', formattedRoot);
      
      const merkleRootId = await contract.getMerkleRootIdByRoot(formattedRoot);
      console.log('📊 Merkle root ID:', merkleRootId.toString());
      
      if (merkleRootId.eq(0)) {
        console.error('❌ MERKLE ROOT NOT FOUND IN CONTRACT!');
        console.error('This merkle root was never registered with the treasury contract');
        console.error('You need to run the set_merkle_root.py script first');
        return false;
      } else {
        console.log('✅ Merkle root found in contract with ID:', merkleRootId.toString());
        return true;
      }
      
    } catch (error) {
      console.error('❌ Error checking merkle root in contract:', error);
      return false;
    }
  }
  
  // Comprehensive debugging for withdrawal issues
  static async runComprehensiveDebug(provider, treasuryAddress, keyshares, keyIndex, publicKey, merkleProof, merkleRoot, treeIndex) {
    console.log('\n🚨 COMPREHENSIVE WITHDRAWAL DEBUG');
    console.log('====================================');
    
    // Step 1: Check keyshare consistency
    const consistencyOk = this.debugKeyshareConsistency(keyshares, keyIndex);
    
    // Step 2: Check merkle root in contract
    const merkleRootOk = await this.checkMerkleRootInContract(provider, treasuryAddress, merkleRoot);
    
    // Step 3: Verify merkle proof locally
    const proofOk = this.verifyMerkleProofLocally(publicKey, merkleProof, merkleRoot, treeIndex);
    
    // Summary
    console.log('\n📊 DEBUG SUMMARY:');
    console.log('=================');
    console.log('✅ Keyshare consistency:', consistencyOk ? 'PASS' : 'FAIL');
    console.log('✅ Merkle root in contract:', merkleRootOk ? 'PASS' : 'FAIL');
    console.log('✅ Local proof verification:', proofOk ? 'PASS' : 'FAIL');
    
    const allOk = consistencyOk && merkleRootOk && proofOk;
    console.log('\n🎯 OVERALL RESULT:', allOk ? '✅ SHOULD SUCCEED' : '❌ WILL FAIL');
    
    if (!allOk) {
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      if (!consistencyOk) {
        console.log('- Restart DKG nodes to fix metadata inconsistencies');
      }
      if (!merkleRootOk) {
        console.log('- Run: python set_merkle_root.py --request <request_id>');
      }
      if (!proofOk) {
        console.log('- Check tree_index and merkle_proof are correct');
        console.log('- Verify public key matches the one in the merkle tree');
      }
    }
    
    return allOk;
  }
}

export default MerkleDebugger;