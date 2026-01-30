// MetaMask-optimized withdrawal service with different encoding approaches
import { ethers } from 'ethers';
import withdrawalService from './withdrawalService';

class MetaMaskOptimizedService {
  constructor() {
    this.treasuryAddress = process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  }

  // Try different ways to send the same transaction
  async tryDifferentApproaches(provider, signer, withdrawalData) {
    console.log('🔬 Trying different MetaMask approaches...');
    
    const approaches = [
      { name: 'Ultra High Gas (No Estimation)', method: this.ultraHighGasNoEstimation.bind(this) },
      { name: 'Standard Contract Call', method: this.standardContractCall.bind(this) },
      { name: 'Raw Transaction', method: this.rawTransaction.bind(this) },
      { name: 'Different Gas Strategy', method: this.differentGasStrategy.bind(this) },
      { name: 'Mainnet vs Local Test', method: this.networkTest.bind(this) },
    ];

    for (const approach of approaches) {
      try {
        console.log(`\n🧪 Testing: ${approach.name}`);
        const result = await approach.method(provider, signer, withdrawalData);
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

  // Approach 0: Ultra high gas with no estimation
  async ultraHighGasNoEstimation(provider, signer, withdrawalData) {
    const { recipient, denomination, keyshares, keyIndex } = withdrawalData;

    // Prepare all data using existing logic
    const data = await this.prepareWithdrawalData(provider, keyshares, keyIndex, recipient, denomination);
    
    // Use raw transaction with very high gas settings
    const iface = new ethers.utils.Interface([{
      "inputs": [
        {"name": "recipient", "type": "address"},
        {"name": "denomination", "type": "uint256"},
        {"name": "merkleRootId", "type": "uint256"},
        {"name": "signature", "type": "bytes32[67]"},
        {"name": "publicKey", "type": "bytes32[67]"},
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
      data.signatureBytes32,
      data.publicKeyBytes32,
      data.formattedMerkleProof,
      data.treeIndex
    ]);

    // Get current gas price and multiply by 5x
    const currentGasPrice = await provider.getGasPrice();
    const ultraHighGasPrice = currentGasPrice.mul(500).div(100); // 5x current price

    // Send as raw transaction with ultra high gas - NO gas estimation
    const txRequest = {
      to: this.treasuryAddress,
      data: encodedData,
      value: 0,
      gasLimit: ethers.BigNumber.from('10000000'), // 10M gas limit
      gasPrice: ultraHighGasPrice
    };

    console.log('🚀 Ultra high gas settings:');
    console.log('  - Gas Limit: 10M');
    console.log('  - Gas Price: 5x current');
    console.log('  - Est. Cost: ~0.15 ETH');

    const tx = await signer.sendTransaction(txRequest);
    const receipt = await tx.wait();
    return { success: true, txHash: tx.hash, receipt };
  }

  // Approach 1: Standard contract call but with different gas settings
  async standardContractCall(provider, signer, withdrawalData) {
    const { recipient, denomination, keyshares, keyIndex } = withdrawalData;

    // Prepare all data using existing logic
    const data = await this.prepareWithdrawalData(provider, keyshares, keyIndex, recipient, denomination);
    
    const treasuryABI = [{
      "inputs": [
        {"name": "recipient", "type": "address"},
        {"name": "denomination", "type": "uint256"},
        {"name": "merkleRootId", "type": "uint256"},
        {"name": "signature", "type": "bytes32[67]"},
        {"name": "publicKey", "type": "bytes32[67]"},
        {"name": "merkleProof", "type": "bytes32[]"},
        {"name": "keyIndex", "type": "uint256"}
      ],
      "name": "withdraw",
      "type": "function",
      "outputs": [],
      "stateMutability": "nonpayable"
    }];

    const contract = new ethers.Contract(this.treasuryAddress, treasuryABI, signer);

    // Try with automatic gas estimation
    const tx = await contract.withdraw(
      data.recipient,
      data.denominationWei,
      data.merkleRootId,
      data.signatureBytes32,
      data.publicKeyBytes32,
      data.formattedMerkleProof,
      data.treeIndex
      // No gas settings - let MetaMask decide
    );

    const receipt = await tx.wait();
    return { success: true, txHash: tx.hash, receipt };
  }

  // Approach 2: Raw transaction encoding
  async rawTransaction(provider, signer, withdrawalData) {
    const { recipient, denomination, keyshares, keyIndex } = withdrawalData;

    // Prepare all data
    const data = await this.prepareWithdrawalData(provider, keyshares, keyIndex, recipient, denomination);
    
    // Manually encode the transaction
    const iface = new ethers.utils.Interface([{
      "inputs": [
        {"name": "recipient", "type": "address"},
        {"name": "denomination", "type": "uint256"},
        {"name": "merkleRootId", "type": "uint256"},
        {"name": "signature", "type": "bytes32[67]"},
        {"name": "publicKey", "type": "bytes32[67]"},
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
      data.signatureBytes32,
      data.publicKeyBytes32,
      data.formattedMerkleProof,
      data.treeIndex
    ]);

    // Send as raw transaction
    const txRequest = {
      to: this.treasuryAddress,
      data: encodedData,
      value: 0
    };

    const tx = await signer.sendTransaction(txRequest);
    const receipt = await tx.wait();
    return { success: true, txHash: tx.hash, receipt };
  }

  // Approach 3: Different gas strategy
  async differentGasStrategy(provider, signer, withdrawalData) {
    const { recipient, denomination, keyshares, keyIndex } = withdrawalData;

    // Prepare all data
    const data = await this.prepareWithdrawalData(provider, keyshares, keyIndex, recipient, denomination);
    
    const treasuryABI = [{
      "inputs": [
        {"name": "recipient", "type": "address"},
        {"name": "denomination", "type": "uint256"},
        {"name": "merkleRootId", "type": "uint256"},
        {"name": "signature", "type": "bytes32[67]"},
        {"name": "publicKey", "type": "bytes32[67]"},
        {"name": "merkleProof", "type": "bytes32[]"},
        {"name": "keyIndex", "type": "uint256"}
      ],
      "name": "withdraw",
      "type": "function",
      "outputs": [],
      "stateMutability": "nonpayable"
    }];

    const contract = new ethers.Contract(this.treasuryAddress, treasuryABI, signer);

    // Try with EIP-1559 gas strategy instead of legacy
    const feeData = await provider.getFeeData();
    
    const tx = await contract.withdraw(
      data.recipient,
      data.denominationWei,
      data.merkleRootId,
      data.signatureBytes32,
      data.publicKeyBytes32,
      data.formattedMerkleProof,
      data.treeIndex,
      {
        maxFeePerGas: feeData.maxFeePerGas?.mul(4), // 4x recommended
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(4),
        gasLimit: 8000000 // 8M gas limit
      }
    );

    const receipt = await tx.wait();
    return { success: true, txHash: tx.hash, receipt };
  }

  // Approach 4: Test if it's a local network issue
  async networkTest(provider, signer, withdrawalData) {
    const network = await provider.getNetwork();
    console.log('Network info:', network);
    
    if (network.chainId === 31337) {
      console.log('ℹ️ Testing on local Hardhat network');
      console.log('💡 Large transactions might work better on mainnet/testnet');
      
      // Try with different block gas limit settings
      const block = await provider.getBlock('latest');
      console.log('Block gas limit:', block.gasLimit.toString());
      
      if (block.gasLimit.lt(ethers.BigNumber.from('30000000'))) {
        console.log('⚠️ Local network has low gas limit, this might cause issues');
      }
    }

    // For now, just return a test result
    return { 
      success: false, 
      error: 'Network test - this approach would require actual network switching' 
    };
  }

  // Helper: Prepare all withdrawal data
  async prepareWithdrawalData(provider, keyshares, keyIndex, recipient, denomination) {
    // Get keyshare data
    const firstNodeKeyshares = Object.values(keyshares)[0];
    const firstKey = firstNodeKeyshares.keyshares.find(key => key.key_index === keyIndex);
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

    // Reconstruct signature
    const { signature, publicKey } = withdrawalService.reconstructSignature(keyshares, keyIndex);
    const withdrawalMessage = withdrawalService.createWithdrawalMessage(recipient, denomination, merkleRoot);
    const wotsSignature = withdrawalService.signWithdrawalMessage(withdrawalMessage, signature);

    // Convert to bytes32 arrays
    const signatureBytes32 = wotsSignature.map(elem => {
      if (elem instanceof Uint8Array) {
        return ethers.utils.hexlify(elem);
      }
      return ethers.utils.hexlify(elem);
    });

    const publicKeyBytes32 = publicKey.map(elem => {
      if (elem instanceof Uint8Array) {
        return ethers.utils.hexlify(elem);
      }
      return ethers.utils.hexlify(elem);
    });

    // Format merkle proof
    const formattedMerkleProof = merkleProof.map(proof => {
      if (typeof proof === 'string' && !proof.startsWith('0x')) {
        return '0x' + proof;
      }
      return proof;
    });

    // Get other data
    const merkleRootId = await withdrawalService.getMerkleRootId(provider, merkleRoot);
    const denominationWei = ethers.utils.parseEther(denomination.toString());

    return {
      recipient,
      denominationWei,
      merkleRootId,
      signatureBytes32,
      publicKeyBytes32,
      formattedMerkleProof,
      treeIndex
    };
  }

  // Quick test to see which approach might work
  async quickCompatibilityTest(provider, signer) {
    console.log('🔬 Quick compatibility test...');
    
    const tests = [
      { name: 'Basic encoding', test: this.testBasicEncoding.bind(this) },
      { name: 'Gas estimation', test: this.testGasEstimation.bind(this) },
      { name: 'Network config', test: this.testNetworkConfig.bind(this) },
    ];

    const results = {};

    for (const test of tests) {
      try {
        results[test.name] = await test.test(provider, signer);
      } catch (error) {
        results[test.name] = { success: false, error: error.message };
      }
    }

    return results;
  }

  async testBasicEncoding() {
    // Test if we can encode WOTS-sized arrays
    const testSig = new Array(67).fill('0x' + '00'.repeat(32));
    const testPub = new Array(67).fill('0x' + '11'.repeat(32));
    
    const iface = new ethers.utils.Interface([
      'function withdraw(address,uint256,uint256,bytes32[67],bytes32[67],bytes32[],uint256) public'
    ]);
    
    const encoded = iface.encodeFunctionData('withdraw', [
      '0x0000000000000000000000000000000000000000',
      ethers.utils.parseEther('0.1'),
      1,
      testSig,
      testPub,
      [],
      0
    ]);
    
    return {
      success: true,
      dataSize: encoded.length,
      message: 'WOTS encoding works'
    };
  }

  async testGasEstimation(provider, signer) {
    // This is where MetaMask typically fails
    return {
      success: false,
      message: 'Gas estimation test skipped (would likely freeze)'
    };
  }

  async testNetworkConfig(provider) {
    const network = await provider.getNetwork();
    const block = await provider.getBlock('latest');
    
    return {
      success: true,
      chainId: network.chainId,
      gasLimit: block.gasLimit.toString(),
      isLocal: network.chainId === 31337
    };
  }
}

export default new MetaMaskOptimizedService();