// High-gas withdrawal service that bypasses gas estimation
import { ethers } from 'ethers';
import withdrawalService from './withdrawalService';

class HighGasWithdrawalService {
  constructor() {
    this.treasuryAddress = process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  }

  // Estimate current gas price from network
  async getCurrentGasPrice(provider) {
    try {
      const gasPrice = await provider.getGasPrice();
      console.log('Current network gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
      return gasPrice;
    } catch (error) {
      console.warn('Could not get gas price, using default:', error.message);
      return ethers.utils.parseUnits('20', 'gwei'); // 20 gwei default
    }
  }

  // Calculate gas cost
  calculateGasCost(gasLimit, gasPrice) {
    const cost = gasLimit.mul(gasPrice);
    return {
      wei: cost,
      eth: ethers.utils.formatEther(cost),
      gwei: ethers.utils.formatUnits(gasPrice, 'gwei')
    };
  }

  // High-gas withdrawal that skips gas estimation
  async withdrawWithMaxGas(provider, signer, withdrawalData, maxGasCostEth = 0.15) {
    console.log('🚀 Starting high-gas withdrawal (bypassing gas estimation)...');
    console.log('📊 Max gas cost limit:', maxGasCostEth, 'ETH');

    try {
      const {
        recipient,
        denomination,
        keyshares,
        keyIndex = 0
      } = withdrawalData;

      console.log('📊 Withdrawal parameters:', { recipient, denomination, keyIndex });

      // First, reconstruct the signature and get all the data we need
      // (reusing the existing logic from withdrawalService)
      const firstNodeKeyshares = Object.values(keyshares)[0];
      if (!firstNodeKeyshares || !firstNodeKeyshares.keyshares || firstNodeKeyshares.keyshares.length === 0) {
        throw new Error('No keyshares available');
      }

      const firstKey = firstNodeKeyshares.keyshares.find(key => key.key_index === keyIndex);
      if (!firstKey) {
        throw new Error(`No keyshare found for key_index ${keyIndex}`);
      }

      // Get merkle data
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
      if (!keyMetadata) {
        throw new Error(`No metadata found for key_index ${keyIndex}`);
      }

      const merkleRoot = keyMetadata.merkle_root;
      const merkleProof = keyMetadata.merkle_proof || [];
      const treeIndex = keyMetadata.tree_index || 0;

      console.log('🌳 Merkle data:', { merkleRoot, proofLength: merkleProof.length, treeIndex });

      // Reconstruct signature using existing service
      const { signature, publicKey } = withdrawalService.reconstructSignature(keyshares, keyIndex);
      
      // Create withdrawal message and sign
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

      // Get merkle root ID from contract
      const merkleRootId = await withdrawalService.getMerkleRootId(provider, merkleRoot);
      const denominationWei = ethers.utils.parseEther(denomination.toString());

      console.log('✅ All data prepared, signature reconstructed');

      // Set up contract with high gas settings
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

      // Get current gas price and calculate high gas settings
      const currentGasPrice = await this.getCurrentGasPrice(provider);
      
      // Use very high gas price (3x current) and very high gas limit
      const highGasPrice = currentGasPrice.mul(300).div(100); // 3x current price
      const highGasLimit = ethers.BigNumber.from('8000000'); // 8M gas limit

      // Calculate cost
      const gasCost = this.calculateGasCost(highGasLimit, highGasPrice);
      console.log('⛽ Gas settings:');
      console.log('  - Gas Limit:', highGasLimit.toString());
      console.log('  - Gas Price:', gasCost.gwei, 'gwei');
      console.log('  - Estimated Cost:', gasCost.eth, 'ETH');

      // Check if cost exceeds limit
      if (parseFloat(gasCost.eth) > maxGasCostEth) {
        throw new Error(`Gas cost ${gasCost.eth} ETH exceeds limit of ${maxGasCostEth} ETH`);
      }

      console.log('🚀 Sending transaction with high gas (NO gas estimation)...');

      // Send transaction directly with high gas - NO gas estimation
      const tx = await contract.withdraw(
        recipient,
        denominationWei,
        merkleRootId,
        signatureBytes32,
        publicKeyBytes32,
        formattedMerkleProof,
        treeIndex,
        {
          gasLimit: highGasLimit,
          gasPrice: highGasPrice
        }
      );

      console.log('✅ Transaction sent with high gas:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.blockNumber);
      console.log('⛽ Actual gas used:', receipt.gasUsed.toString());

      const actualCost = receipt.gasUsed.mul(highGasPrice);
      console.log('💰 Actual gas cost:', ethers.utils.formatEther(actualCost), 'ETH');

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        actualGasCost: ethers.utils.formatEther(actualCost),
        message: 'High-gas withdrawal successful!'
      };

    } catch (error) {
      console.error('❌ High-gas withdrawal failed:', error);

      // Analyze the error
      let errorAnalysis = 'Unknown error';
      if (error.message.includes('JSON-RPC')) {
        errorAnalysis = 'MetaMask JSON-RPC error (data too large or other limit)';
      } else if (error.message.includes('gas')) {
        errorAnalysis = 'Gas-related error';
      } else if (error.message.includes('user rejected')) {
        errorAnalysis = 'User rejected transaction';
      } else if (error.message.includes('insufficient funds')) {
        errorAnalysis = 'Insufficient funds for gas';
      } else if (error.message.includes('InvalidMerkleProof')) {
        errorAnalysis = 'Smart contract validation error';
      }

      return {
        success: false,
        error: error.message,
        errorAnalysis,
        recommendation: this.getRecommendation(errorAnalysis)
      };
    }
  }

  getRecommendation(errorAnalysis) {
    switch (errorAnalysis) {
      case 'MetaMask JSON-RPC error (data too large or other limit)':
        return 'Try transaction splitting or use a different wallet';
      case 'Gas-related error':
        return 'Try adjusting gas settings or check network congestion';
      case 'Insufficient funds for gas':
        return 'Add more ETH to your wallet for gas fees';
      case 'Smart contract validation error':
        return 'Check merkle proof and signature validity';
      default:
        return 'Check console for detailed error information';
    }
  }

  // Test with different gas strategies
  async testGasStrategies(provider, signer, withdrawalData) {
    console.log('🧪 Testing different gas strategies...');

    const strategies = [
      { name: 'Conservative', gasLimit: 3000000, gasPriceMultiplier: 100 }, // 1x
      { name: 'Medium', gasLimit: 4000000, gasPriceMultiplier: 150 },      // 1.5x
      { name: 'High', gasLimit: 5000000, gasPriceMultiplier: 200 },        // 2x
      { name: 'Maximum', gasLimit: 6000000, gasPriceMultiplier: 300 },     // 3x
    ];

    for (const strategy of strategies) {
      try {
        const currentGasPrice = await this.getCurrentGasPrice(provider);
        const gasPrice = currentGasPrice.mul(strategy.gasPriceMultiplier).div(100);
        const gasCost = this.calculateGasCost(
          ethers.BigNumber.from(strategy.gasLimit), 
          gasPrice
        );

        console.log(`${strategy.name} strategy:`);
        console.log(`  Gas Limit: ${strategy.gasLimit}`);
        console.log(`  Gas Price: ${gasCost.gwei} gwei`);
        console.log(`  Est. Cost: ${gasCost.eth} ETH`);

        // Only test if cost is reasonable (< 0.1 ETH)
        if (parseFloat(gasCost.eth) < 0.1) {
          console.log(`  ✅ ${strategy.name} is affordable`);
        } else {
          console.log(`  ❌ ${strategy.name} too expensive`);
        }

      } catch (error) {
        console.error(`  ❌ ${strategy.name} failed:`, error.message);
      }
    }
  }
}

export default new HighGasWithdrawalService();