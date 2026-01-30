// Real DKG service integration
import { ethers } from 'ethers';

const NODE_URLS = [
  process.env.REACT_APP_DKG_NODE_1_URL || 'http://localhost:8080',
  process.env.REACT_APP_DKG_NODE_2_URL || 'http://localhost:8081',
  process.env.REACT_APP_DKG_NODE_3_URL || 'http://localhost:8082'
];

const SUPPORTED_DENOMINATIONS = [0.01, 0.1, 1.0];

export class DKGService {
  constructor() {
    this.nodeUrls = NODE_URLS;
  }

  // Validate requested denominations
  validateDenominations(denominations) {
    const unsupported = denominations.filter(d => !SUPPORTED_DENOMINATIONS.includes(d));
    if (unsupported.length > 0) {
      throw new Error(`Unsupported denominations: ${unsupported.join(', ')}. Supported: ${SUPPORTED_DENOMINATIONS.join(', ')}`);
    }
    return true;
  }

  // Create message for signing (matches Python implementation)
  createWithdrawalMessage(txHash, userAddress, totalAmount, keyAmounts, timestamp, nonce) {
    // CRITICAL: Format numbers to match Python's Decimal string formatting exactly
    // Backend does: JS number -> Python float -> Decimal(str(float)) -> string
    const formatAmount = (amount) => {
      const num = parseFloat(amount);
      
      // Python str(float) always shows .0 for whole numbers that came from floats
      // JavaScript 1.0 -> Python receives as float(1.0) -> str(1.0) -> '1.0'
      // JavaScript 1 -> Python receives as float(1) -> str(1.0) -> '1.0' (since JSON doesn't distinguish)
      
      // Since JSON always sends numbers as floats, Python always gets float types
      // and str(float) for whole numbers includes .0
      if (num % 1 === 0) {
        // Whole number - Python str(float) includes .0
        return num.toString() + '.0';
      } else {
        // Decimal number - same behavior in both languages
        return num.toString();
      }
    };
    
    const formattedTotalAmount = formatAmount(totalAmount);
    const formattedKeyAmounts = keyAmounts.map(amount => formatAmount(amount));
    const keysStr = formattedKeyAmounts.map(amount => `${amount} ETH`).join(', ');
    
    const message = [
      `Withdraw ${formattedTotalAmount} ETH`,
      `From deposit: ${txHash}`,
      `Address: ${userAddress}`,
      `Timestamp: ${Math.floor(timestamp)}`,
      `Nonce: ${nonce}`,
      `Requested keys: ${keysStr}`
    ].join('\n');
    
    console.log('📝 Created withdrawal message:', message);
    console.log('📝 Original amounts:', { totalAmount, keyAmounts });
    console.log('📝 Formatted amounts:', { formattedTotalAmount, formattedKeyAmounts });
    console.log('📝 Exact message for verification:');
    console.log('📝', JSON.stringify(message));
    
    return message;
  }

  // Request withdrawal from DKG nodes
  async requestWithdrawal(txHash, userAddress, keyAmounts, signer) {
    const totalAmount = keyAmounts.reduce((sum, amount) => sum + amount, 0);
    
    // Validate denominations
    this.validateDenominations(keyAmounts);
    
    // IMPORTANT: Get the actual signer address to ensure consistency
    const signerAddress = await signer.getAddress();
    
    console.log('🔑 Requesting withdrawal from DKG nodes...');
    console.log(`   Transaction: ${txHash}`);
    console.log(`   Provided user address: ${userAddress}`);
    console.log(`   Actual signer address: ${signerAddress}`);
    console.log(`   Total amount: ${totalAmount} ETH`);
    console.log(`   Key amounts: ${keyAmounts}`);
    
    // IMPORTANT: Use the signer's address to ensure signature verification passes
    const actualUserAddress = signerAddress;
    
    if (userAddress.toLowerCase() !== signerAddress.toLowerCase()) {
      console.warn(`⚠️  Address mismatch detected:`);
      console.warn(`   - Provided: ${userAddress}`);
      console.warn(`   - Signer:   ${signerAddress}`);
      console.warn(`   - Using signer address for consistency`);
    }
    
    // Create timestamp and nonce
    const timestamp = Date.now() / 1000;
    const nonce = Math.floor(timestamp * 1000000);
    
    console.log('📝 Timestamp:', timestamp);
    console.log('📝 Nonce:', nonce);
    console.log('📝 Key amounts:', keyAmounts);
    console.log('📝 Total amount:', totalAmount);
    
    // Create message for signing
    const message = this.createWithdrawalMessage(
      txHash, 
      actualUserAddress, 
      totalAmount, 
      keyAmounts, 
      timestamp, 
      nonce
    );
    
    console.log('📝 Signing message:', message);
    console.log('📝 Message bytes:', new TextEncoder().encode(message));
    console.log('📝 Message length:', message.length);
    
    // Sign the message
    console.log('📝 About to sign with signer address:', await signer.getAddress());
    const signature = await signer.signMessage(message);
    console.log('📝 Generated signature:', signature);
    
    // Prepare withdrawal data
    const withdrawalData = {
      user_address: actualUserAddress,
      amount: totalAmount,
      deposit_id: txHash,
      transaction_hash: txHash,
      signature: signature,
      timestamp: timestamp,
      nonce: nonce,
      requested_keys: keyAmounts
    };
    
    console.log('📡 Sending withdrawal request to DKG nodes...');
    
    // Send to nodes
    let requestId = null;
    const errors = [];
    
    for (let i = 0; i < this.nodeUrls.length; i++) {
      try {
        const url = this.nodeUrls[i];
        console.log(`   📡 Contacting node ${i} at ${url}...`);
        
        const response = await fetch(`${url}/api/v1/withdrawal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(withdrawalData),
          signal: AbortSignal.timeout(30000) // 30s timeout
        });
        
        if (response.ok) {
          const result = await response.json();
          requestId = result.request_id;
          console.log(`   ✅ Success! Request ID: ${requestId}`);
          break;
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Node ${i} error: ${response.status}`);
          console.log(`      Response: ${errorText}`);
          errors.push(`Node ${i}: ${response.status} - ${errorText}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Node ${i} error: ${error.message}`);
        errors.push(`Node ${i}: ${error.message}`);
      }
    }
    
    if (!requestId) {
      throw new Error(`Failed to get request_id from any node. Errors: ${errors.join('; ')}`);
    }
    
    return {
      requestId,
      totalAmount,
      keyAmounts,
      timestamp,
      nonce
    };
  }

  // Get keyshares from DKG nodes
  async getKeyshares(requestId) {
    console.log(`📥 Fetching keyshares for request ${requestId}...`);
    
    const keyshares = {};
    const errors = [];
    
    for (let i = 0; i < this.nodeUrls.length; i++) {
      try {
        const url = this.nodeUrls[i];
        console.log(`   📡 Contacting node ${i} at ${url}...`);
        
        const response = await fetch(`${url}/api/v1/keyshares/${requestId}`, {
          signal: AbortSignal.timeout(15000) // 15s timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.keyshares && data.keyshares.length > 0) {
            keyshares[i] = data;
            console.log(`   ✅ Node ${i}: Got ${data.keyshares.length} keyshares`);
            
            // Show key indices
            const keyIndices = data.keyshares.map(ks => ks.key_index);
            console.log(`      Key indices: ${keyIndices}`);
          } else {
            console.log(`   ⚠️  Node ${i}: No keyshares available`);
          }
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Node ${i}: HTTP ${response.status}`);
          console.log(`      Response: ${errorText}`);
          errors.push(`Node ${i}: ${response.status} - ${errorText}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Node ${i}: ${error.message}`);
        errors.push(`Node ${i}: ${error.message}`);
      }
    }
    
    console.log(`📊 Results:`);
    console.log(`   Request ID: ${requestId}`);
    console.log(`   Keyshares collected: ${Object.keys(keyshares).length}/${this.nodeUrls.length} nodes`);
    
    if (Object.keys(keyshares).length >= 2) {
      console.log(`   ✅ Sufficient keyshares for reconstruction (threshold: 2)`);
      
      // Show detailed key metadata
      for (const [nodeId, nodeData] of Object.entries(keyshares)) {
        if (nodeData.keys_metadata && nodeData.keys_metadata.length > 0) {
          console.log(`   \n🔑 Node ${nodeId} key details:`);
          nodeData.keys_metadata.forEach((metadata, i) => {
            console.log(`      Key ${i+1}: index=${metadata.key_index}, amount=${metadata.amount || 'unknown'} ETH`);
            console.log(`      Merkle root: ${metadata.merkle_root}`);
            console.log(`      Tree index: ${metadata.tree_index}`);
          });
          break;
        }
      }
      
      return keyshares;
    } else {
      throw new Error(`Insufficient keyshares (need 2, got ${Object.keys(keyshares).length}). Errors: ${errors.join('; ')}`);
    }
  }

  // Complete withdrawal process
  async completeWithdrawal(txHash, userAddress, keyAmounts, signer) {
    try {
      // Step 1: Request withdrawal
      const withdrawalResult = await this.requestWithdrawal(txHash, userAddress, keyAmounts, signer);
      
      // Step 2: Get keyshares
      const keyshares = await this.getKeyshares(withdrawalResult.requestId);
      
      return {
        success: true,
        requestId: withdrawalResult.requestId,
        keyshares: keyshares,
        totalAmount: withdrawalResult.totalAmount,
        keyAmounts: withdrawalResult.keyAmounts,
        message: 'Withdrawal request completed successfully'
      };
      
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      throw error;
    }
  }
}

export default new DKGService();