// Smart contract withdrawal service for ECDSA
import { ethers } from 'ethers';
import MerkleDebugger from './merkleDebugger';
import { isKeyUsed } from './treasuryContractService';
import ECDSALib from './ecdsaLib';

const TREASURY_ABI = [
  {
    "inputs": [
      {"internalType": "address payable", "name": "recipient", "type": "address"},
      {"internalType": "uint256", "name": "denomination", "type": "uint256"},
      {"internalType": "uint256", "name": "merkleRootId", "type": "uint256"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"},
      {"internalType": "bytes32[]", "name": "merkleProof", "type": "bytes32[]"},
      {"internalType": "uint256", "name": "keyIndex", "type": "uint256"}
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

export class WithdrawalServiceECDSA {
  constructor() {
    this.treasuryAddress = process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS;
    console.log('WithdrawalServiceECDSA initialized with treasury address:', this.treasuryAddress);
  }

  // Reconstruct ECDSA private key from keyshares using Lagrange interpolation
  reconstructPrivateKey(keyshares, keyIndex = 0, providedMetadata = null) {
    console.log('🔄 Reconstructing ECDSA private key from keyshares...');
    console.log('🔍 Available keyshares:', Object.keys(keyshares));
    
    // Get keyshares from all nodes
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
    let keyMetadata = providedMetadata; // Use provided metadata if available
    let keySharesForReconstruction = [];
    
    for (const [nodeId, nodeKeyshares] of Object.entries(allKeyshares)) {
      for (const keyshare of nodeKeyshares) {
        if (keyshare.key_index === keyIndex) {
          // Only update keyMetadata if not provided
          if (!keyMetadata) {
            keyMetadata = keyshare;
          }
          // ECDSA has only 1 share element (not 67 like WOTS)
          if (keyshare.shares && keyshare.shares.length > 0) {
            const share = keyshare.shares[0]; // ECDSA only has one element
            console.log(`Share from ${nodeId}:`, share);
            // The share has element_index and share_value
            // For Lagrange interpolation, we need the node index (1, 2, 3) not element_index
            // nodeId is like "node0", "node1", "node2" - extract the number and add 1
            const nodeNumber = parseInt(nodeId.replace('node', '')) + 1;
            
            // Handle share_value which should now be a hex string from the backend
            let shareValueHex;
            if (typeof share.share_value === 'string' && share.share_value.startsWith('0x')) {
              // Already a hex string - use as is
              shareValueHex = share.share_value;
            } else if (typeof share.share_value === 'number' || typeof share.share_value === 'string') {
              // Fallback for old format (scientific notation)
              const shareValueStr = share.share_value.toString();
              if (shareValueStr.includes('e')) {
                // Handle scientific notation (shouldn't happen with fixed backend)
                console.warn('⚠️ Received share in scientific notation - precision may be lost!');
                const [mantissa, exponent] = shareValueStr.split('e');
                const exp = parseInt(exponent);
                const mantissaInt = mantissa.replace('.', '');
                const zeros = '0'.repeat(Math.max(0, exp - (mantissaInt.length - mantissa.indexOf('.') - 1)));
                shareValueHex = '0x' + BigInt(mantissaInt + zeros).toString(16);
              } else {
                shareValueHex = '0x' + BigInt(share.share_value).toString(16);
              }
            } else {
              shareValueHex = share.share_value;
            }
            
            console.log(`  Share value (hex): ${shareValueHex}`);
            
            keySharesForReconstruction.push({
              nodeIndex: nodeNumber,  // 1, 2, or 3 for Lagrange
              shareValue: shareValueHex,
              nodeId: nodeId
            });
          }
          break;
        }
      }
    }
    
    if (!keySharesForReconstruction.length) {
      throw new Error(`No keyshare found for key index ${keyIndex}`);
    }
    
    console.log('🔑 Found key metadata:', {
      keyIndex: keyIndex,
      denomination: keyMetadata?.denomination,
      merkleRoot: keyMetadata?.merkle_root,
      treeIndex: keyMetadata?.tree_index,
      sharesCollected: keySharesForReconstruction.length,
      hasProvidedMetadata: !!providedMetadata
    });
    
    // Need at least 2 shares for 2-of-3 threshold
    const threshold = 2;
    if (keySharesForReconstruction.length < threshold) {
      throw new Error(`Insufficient shares for reconstruction: ${keySharesForReconstruction.length} < ${threshold}`);
    }
    
    // Use first 2 shares for reconstruction
    const sharesToUse = keySharesForReconstruction.slice(0, threshold);
    console.log('📊 Using shares from nodes:', sharesToUse.map(s => s.nodeId));
    console.log('📊 Share details:', sharesToUse.map(s => ({
      nodeId: s.nodeId,
      nodeIndex: s.nodeIndex,
      shareValue: s.shareValue,
      hasNodeIndex: s.nodeIndex !== undefined,
      hasShareValue: s.shareValue !== undefined
    })));
    
    // Validate shares before interpolation
    for (const share of sharesToUse) {
      if (share.nodeIndex === undefined || share.nodeIndex === null) {
        throw new Error(`Share from node ${share.nodeId} missing nodeIndex`);
      }
      if (share.shareValue === undefined || share.shareValue === null) {
        throw new Error(`Share from node ${share.nodeId} missing shareValue`);
      }
    }
    
    // Reconstruct both private key (for signing) and public key (for verification)
    // Private key: Use Lagrange interpolation on the shares
    // Public key: Use sum of public shares method
    const publicKeyFromShares = this.reconstructPublicKeyFromShares(sharesToUse);
    console.log('✅ Reconstructed ECDSA public key using sum of public shares (matches DKG nodes)');
    
    // For ECDSA, we also need the private key which is the Lagrange interpolation of the shares
    const privateKey = this.lagrangeInterpolateAtZero(sharesToUse);
    console.log('🔑 Reconstructed ECDSA private key using Lagrange interpolation');
    
    return {
      privateKey: privateKey,  // Add the actual private key
      publicKey: publicKeyFromShares,
      ethereumAddress: publicKeyFromShares.address,
      merkleRoot: keyMetadata?.merkle_root,
      merkleProof: keyMetadata?.merkle_proof || [],
      treeIndex: keyMetadata?.tree_index || 0,
      denomination: keyMetadata?.denomination
    };
  }
  
  // Lagrange interpolation at x=0 to reconstruct the private key
  lagrangeInterpolateAtZero(shares) {
    const SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
    
    let result = 0n;
    
    for (let i = 0; i < shares.length; i++) {
      const share_i = shares[i];
      
      // Parse share value
      let hexValue = share_i.shareValue;
      if (hexValue.startsWith('0x')) {
        hexValue = hexValue.slice(2);
      }
      const y_i = BigInt('0x' + hexValue);
      const x_i = BigInt(share_i.nodeIndex);
      
      // Calculate Lagrange basis polynomial at x=0
      let numerator = 1n;
      let denominator = 1n;
      
      for (let j = 0; j < shares.length; j++) {
        if (i !== j) {
          const x_j = BigInt(shares[j].nodeIndex);
          numerator = (numerator * (0n - x_j)) % SECP256K1_N;
          denominator = (denominator * (x_i - x_j)) % SECP256K1_N;
        }
      }
      
      // Modular inverse of denominator
      const denomInv = this.modInverseForLagrange(denominator, SECP256K1_N);
      
      // Add this term to result
      const term = (y_i * numerator * denomInv) % SECP256K1_N;
      result = (result + term) % SECP256K1_N;
    }
    
    // Ensure positive result
    return (result + SECP256K1_N) % SECP256K1_N;
  }
  
  // Modular inverse for Lagrange interpolation
  modInverseForLagrange(a, m) {
    a = ((a % m) + m) % m;
    let [old_r, r] = [a, m];
    let [old_s, s] = [1n, 0n];
    
    while (r !== 0n) {
      const quotient = old_r / r;
      [old_r, r] = [r, old_r - quotient * r];
      [old_s, s] = [s, old_s - quotient * s];
    }
    
    if (old_r > 1n) {
      throw new Error('Modular inverse does not exist');
    }
    
    return ((old_s % m) + m) % m;
  }
  
  // CORRECTED METHOD: Sum of public shares (matches DKG node implementation)
  reconstructPublicKeyFromShares(shares) {
    console.log('🔧 Using CORRECT method: Sum of public shares');
    console.log('📊 This matches exactly what the DKG nodes do');
    
    // Use ECDSALib for curve operations
    const ecdsa = new ECDSALib();
    
    let combinedPublic = null;
    
    // For each share: compute P_i = s_i * G, then sum all P_i
    for (const share of shares) {
      // Handle hex strings - DO NOT pad, use as-is
      let hexValue = share.shareValue;
      if (hexValue.startsWith('0x')) {
        hexValue = hexValue.slice(2);
      }
      // Convert to BigInt directly without padding
      const shareValue = BigInt('0x' + hexValue);
      
      console.log(`Computing P_${share.nodeIndex} = s_${share.nodeIndex} * G`);
      console.log(`  Share value: 0x${hexValue}`);
      
      // Compute public share: s_i * G
      let publicShare;
      try {
        publicShare = ecdsa.pointMultiply(shareValue, ecdsa.G);
      } catch (error) {
        console.error(`  ERROR in pointMultiply for share ${share.nodeIndex}:`, error.message);
        throw error;
      }
      
      console.log(`  P_${share.nodeIndex}: x=${publicShare.x.toString(16).substring(0, 20)}...`);
      
      // Sum the public shares
      if (combinedPublic === null) {
        combinedPublic = publicShare;
      } else {
        combinedPublic = ecdsa.pointAdd(combinedPublic, publicShare);
      }
    }
    
    console.log('✅ Combined public key computed');
    console.log(`  x: ${combinedPublic.x.toString(16)}`);
    console.log(`  y: ${combinedPublic.y.toString(16)}`);
    
    // Convert to Ethereum address
    const address = this.publicKeyToAddress(combinedPublic);
    
    console.log(`🔑 Ethereum address: ${address}`);
    
    return {
      x: combinedPublic.x,
      y: combinedPublic.y,
      address: address
    };
  }
  
  // SECP256K1 elliptic curve operations
  pointMultiply(scalar, point) {
    // Simplified elliptic curve point multiplication
    // Using a safer implementation that avoids edge cases
    const SECP256K1_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
    const SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
    const SECP256K1_A = 0n;  // Curve parameter a = 0 for secp256k1
    
    if (scalar === 0n) {
      return { x: 0n, y: 0n }; // Point at infinity
    }
    
    let k = scalar % SECP256K1_N;
    if (k === 0n) {
      return { x: 0n, y: 0n }; // Point at infinity
    }
    
    // Use double-and-add algorithm with inline operations to avoid recursion issues
    let result = { x: 0n, y: 0n }; // Point at infinity
    let temp = { x: point.x, y: point.y };
    
    // Process bits from right to left (least significant first)
    while (k > 0n) {
      if (k & 1n) {
        // Add temp to result inline to avoid function call issues
        if (result.x === 0n && result.y === 0n) {
          result = { x: temp.x, y: temp.y };
        } else if (temp.x === 0n && temp.y === 0n) {
          // result stays the same
        } else if (result.x === temp.x) {
          if (result.y === temp.y) {
            // Double the point inline
            if (result.y === 0n) {
              result = { x: 0n, y: 0n };
            } else {
              try {
                const s_num = (3n * result.x * result.x) % this.SECP256K1_P;
                const s_den = (2n * result.y) % this.SECP256K1_P;
                const s = (s_num * this.modInverse(s_den, this.SECP256K1_P)) % this.SECP256K1_P;
                const x3 = (s * s - 2n * result.x) % this.SECP256K1_P;
                const y3 = (s * (result.x - x3) - result.y) % this.SECP256K1_P;
                result = {
                  x: (x3 + this.SECP256K1_P) % this.SECP256K1_P,
                  y: (y3 + this.SECP256K1_P) % this.SECP256K1_P
                };
              } catch (e) {
                console.error('Error doubling in multiply:', e);
                result = { x: 0n, y: 0n };
              }
            }
          } else {
            // Points are inverses
            result = { x: 0n, y: 0n };
          }
        } else {
          // Regular point addition inline
          try {
            const dx = (temp.x - result.x + this.SECP256K1_P) % this.SECP256K1_P;
            const dy = (temp.y - result.y + this.SECP256K1_P) % this.SECP256K1_P;
            const s = (dy * this.modInverse(dx, this.SECP256K1_P)) % this.SECP256K1_P;
            const x3 = (s * s - result.x - temp.x) % this.SECP256K1_P;
            const y3 = (s * (result.x - x3) - result.y) % this.SECP256K1_P;
            result = {
              x: (x3 + this.SECP256K1_P) % this.SECP256K1_P,
              y: (y3 + this.SECP256K1_P) % this.SECP256K1_P
            };
          } catch (e) {
            console.error('Error adding in multiply:', e);
            result = { x: 0n, y: 0n };
          }
        }
      }
      
      // Double temp for next bit inline
      if (temp.x === 0n && temp.y === 0n) {
        // temp stays as point at infinity
      } else if (temp.y === 0n) {
        temp = { x: 0n, y: 0n };
      } else {
        try {
          const s_num = (3n * temp.x * temp.x) % this.SECP256K1_P;
          const s_den = (2n * temp.y) % this.SECP256K1_P;
          const s = (s_num * this.modInverse(s_den, this.SECP256K1_P)) % this.SECP256K1_P;
          const x3 = (s * s - 2n * temp.x) % this.SECP256K1_P;
          const y3 = (s * (temp.x - x3) - temp.y) % this.SECP256K1_P;
          temp = {
            x: (x3 + this.SECP256K1_P) % this.SECP256K1_P,
            y: (y3 + this.SECP256K1_P) % this.SECP256K1_P
          };
        } catch (e) {
          console.error('Error doubling temp in multiply:', e);
          temp = { x: 0n, y: 0n };
        }
      }
      
      k = k >> 1n;
    }
    
    return result;
  }
  
  // Safe point operations that handle edge cases
  safePointAdd(p1, p2) {
    // Handle point at infinity
    if (p1.x === 0n && p1.y === 0n) return p2;
    if (p2.x === 0n && p2.y === 0n) return p1;
    
    // Handle same x-coordinate
    if (p1.x === p2.x) {
      if (p1.y === p2.y) {
        return this.safePointDouble(p1);
      } else {
        return { x: 0n, y: 0n }; // Points are inverses
      }
    }
    
    // Regular point addition
    return this.pointAdd(p1, p2);
  }
  
  safePointDouble(point) {
    // Handle point at infinity
    if (point.x === 0n && point.y === 0n) {
      return { x: 0n, y: 0n };
    }
    
    // Handle y = 0 (point of order 2)
    if (point.y === 0n) {
      return { x: 0n, y: 0n };
    }
    
    return this.pointDouble(point);
  }
  
  pointAdd(p1, p2) {
    const SECP256K1_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
    
    // Handle point at infinity
    if (p1.x === 0n && p1.y === 0n) return p2;
    if (p2.x === 0n && p2.y === 0n) return p1;
    
    if (p1.x === p2.x) {
      if (p1.y === p2.y) {
        return this.pointDouble(p1);
      } else {
        return { x: 0n, y: 0n }; // Point at infinity
      }
    }
    
    const dx = ((p2.x - p1.x) % SECP256K1_P + SECP256K1_P) % SECP256K1_P;
    const dy = ((p2.y - p1.y) % SECP256K1_P + SECP256K1_P) % SECP256K1_P;
    const dxInv = this.modInverse(dx, SECP256K1_P);
    const slope = (dy * dxInv) % SECP256K1_P;
    
    const x3 = (slope * slope - p1.x - p2.x) % SECP256K1_P;
    const y3 = (slope * (p1.x - x3) - p1.y) % SECP256K1_P;
    
    return {
      x: (x3 + SECP256K1_P) % SECP256K1_P,
      y: (y3 + SECP256K1_P) % SECP256K1_P
    };
  }
  
  pointDouble(point) {
    const SECP256K1_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
    
    // Handle point at infinity
    if (point.x === 0n && point.y === 0n) {
      return { x: 0n, y: 0n }; // Point at infinity
    }
    
    // Handle the case where y = 0 (point has order 2)
    if (point.y === 0n) {
      return { x: 0n, y: 0n }; // Point at infinity
    }
    
    const slope = (3n * point.x * point.x * this.modInverse(2n * point.y, SECP256K1_P)) % SECP256K1_P;
    const x3 = (slope * slope - 2n * point.x) % SECP256K1_P;
    const y3 = (slope * (point.x - x3) - point.y) % SECP256K1_P;
    
    return {
      x: (x3 + SECP256K1_P) % SECP256K1_P,
      y: (y3 + SECP256K1_P) % SECP256K1_P
    };
  }
  
  publicKeyToAddress(publicKey) {
    // Convert public key to Ethereum address
    const pubKeyBytes = new Uint8Array(64);
    
    // Convert x coordinate to 32 bytes (big endian)
    const xBytes = publicKey.x.toString(16).padStart(64, '0');
    for (let i = 0; i < 32; i++) {
      pubKeyBytes[i] = parseInt(xBytes.slice(i * 2, i * 2 + 2), 16);
    }
    
    // Convert y coordinate to 32 bytes (big endian)
    const yBytes = publicKey.y.toString(16).padStart(64, '0');
    for (let i = 0; i < 32; i++) {
      pubKeyBytes[32 + i] = parseInt(yBytes.slice(i * 2, i * 2 + 2), 16);
    }
    
    // Keccak256 hash of the public key
    const hash = ethers.utils.keccak256(pubKeyBytes);
    
    // Take last 20 bytes as address
    return ethers.utils.getAddress('0x' + hash.slice(-40));
  }
  
  // Modular inverse using extended Euclidean algorithm
  modInverse(a, m) {
    // Check for zero input which would cause division by zero
    if (a === 0n || a % m === 0n) {
      console.error(`modInverse called with a=${a.toString(16)}, m=${m.toString(16)}`);
      throw new RangeError('Division by zero - cannot find modular inverse of 0');
    }
    
    a = ((a % m) + m) % m;
    
    let m0 = m;
    let x0 = 0n;
    let x1 = 1n;
    
    if (m === 1n) return 0n;
    
    while (a > 1n) {
      const q = a / m;
      let t = m;
      
      m = a % m;
      a = t;
      t = x0;
      
      x0 = x1 - q * x0;
      x1 = t;
    }
    
    if (x1 < 0n) x1 += m0;
    
    return x1;
  }

  // Get merkle root ID from contract
  async getMerkleRootId(provider, merkleRoot) {
    try {
      console.log('🔧 Getting merkle root ID for:', merkleRoot);
      const contract = new ethers.Contract(this.treasuryAddress, TREASURY_ABI, provider);
      
      let formattedMerkleRoot = merkleRoot;
      if (!formattedMerkleRoot.startsWith('0x')) {
        formattedMerkleRoot = '0x' + formattedMerkleRoot;
      }
      
      const merkleRootId = await contract.getMerkleRootIdByRoot(formattedMerkleRoot);
      console.log('  - Merkle root ID:', merkleRootId.toString());
      
      if (merkleRootId.eq(0)) {
        throw new Error('Merkle root not found in contract');
      }
      
      return merkleRootId;
    } catch (error) {
      console.error('Error getting merkle root ID:', error);
      throw error;
    }
  }

  // Create withdrawal message that matches smart contract
  createWithdrawalMessage(recipient, denomination, merkleRoot, chainId = 31337) {
    console.log('🔧 Creating withdrawal message for ECDSA signature:');
    console.log('  - recipient:', recipient);
    console.log('  - denomination:', denomination);
    console.log('  - merkleRoot:', merkleRoot);
    console.log('  - chainId:', chainId);
    
    // Match the format in TreasuryECDSA.sol
    const denominationWei = ethers.utils.parseEther(denomination.toString());
    
    const message = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'bytes32', 'uint256'],
      [recipient, denominationWei, merkleRoot, chainId]
    );
    
    console.log('  - Message hash:', message);
    return message;
  }

  // Sign message with ECDSA
  async signWithECDSA(message, privateKey) {
    console.log('🔏 Signing message with ECDSA');
    
    // Convert BigInt private key to hex string
    let privateKeyHex;
    if (typeof privateKey === 'bigint') {
      privateKeyHex = '0x' + privateKey.toString(16).padStart(64, '0');
    } else if (typeof privateKey === 'string' && !privateKey.startsWith('0x')) {
      privateKeyHex = '0x' + privateKey;
    } else {
      privateKeyHex = privateKey;
    }
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKeyHex);
    
    // Sign the message hash directly (no additional hashing)
    // The message is already hashed in createWithdrawalMessage
    const signature = await wallet.signMessage(ethers.utils.arrayify(message));
    
    console.log('✅ ECDSA signature generated:', signature);
    return signature;
  }

  // Withdraw from smart contract
  async withdrawFromContract(provider, signer, withdrawalData) {
    console.log('🏦 Starting ECDSA smart contract withdrawal...');
    
    const {
      recipient,
      denomination,
      keyshares,
      keyIndex = 0
    } = withdrawalData;

    // Get metadata from first node
    const firstNodeKeyshares = Object.values(keyshares)[0];
    if (!firstNodeKeyshares || !firstNodeKeyshares.keyshares || firstNodeKeyshares.keyshares.length === 0) {
      throw new Error('No keyshares available');
    }

    const firstKey = firstNodeKeyshares.keyshares.find(key => key.key_index === keyIndex);
    if (!firstKey) {
      throw new Error(`No keyshare found for key_index ${keyIndex}`);
    }

    // Get merkle data from metadata
    const keysMetadata = firstNodeKeyshares.keys_metadata;
    let keyMetadata;
    if (Array.isArray(keysMetadata)) {
      keyMetadata = keysMetadata.find(meta => meta.key_index === keyIndex);
    } else {
      keyMetadata = keysMetadata[keyIndex] || keysMetadata[String(keyIndex)];
    }
    
    if (!keyMetadata) {
      throw new Error(`No metadata found for key_index ${keyIndex}`);
    }

    const merkleRoot = keyMetadata.merkle_root;
    const merkleProof = keyMetadata.merkle_proof || [];
    const treeIndex = keyMetadata.tree_index || 0;

    console.log('🌳 Merkle data:', {
      merkleRoot,
      merkleProof: merkleProof.length,
      treeIndex,
      keyIndex
    });

    // Reconstruct ECDSA private key
    const { privateKey } = this.reconstructPrivateKey(keyshares, keyIndex);
    
    // Create withdrawal message
    const chainId = await provider.getNetwork().then(n => n.chainId);
    const withdrawalMessage = this.createWithdrawalMessage(recipient, denomination, merkleRoot, chainId);
    
    // Sign with ECDSA
    const signature = await this.signWithECDSA(withdrawalMessage, privateKey);
    
    // Get merkle root ID
    const merkleRootId = await this.getMerkleRootId(provider, merkleRoot);
    
    // Format merkle proof
    const formattedMerkleProof = merkleProof.map(proof => {
      if (typeof proof === 'string' && !proof.startsWith('0x')) {
        return '0x' + proof;
      }
      return proof;
    });

    // Create contract instance
    const contract = new ethers.Contract(this.treasuryAddress, TREASURY_ABI, signer);
    
    // Convert denomination to wei
    const denominationWei = ethers.utils.parseEther(denomination.toString());

    console.log('📋 Contract call parameters:', {
      recipient,
      denominationWei: denominationWei.toString(),
      merkleRootId: merkleRootId.toString(),
      signature: signature.slice(0, 10) + '...',
      merkleProof: formattedMerkleProof.length,
      keyIndex
    });

    try {
      // Estimate gas
      const gasEstimate = await contract.estimateGas.withdraw(
        recipient,
        denominationWei,
        merkleRootId,
        signature,
        formattedMerkleProof,
        keyIndex
      );
      
      console.log('⛽ Gas estimate:', gasEstimate.toString());
      
      // Send transaction
      const tx = await contract.withdraw(
        recipient,
        denominationWei,
        merkleRootId,
        signature,
        formattedMerkleProof,
        keyIndex,
        { gasLimit: gasEstimate.mul(120).div(100) } // 20% buffer
      );
      
      console.log('✅ Transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
      
    } catch (error) {
      console.error('❌ Contract call failed:', error);
      
      // Handle custom errors
      if (error.data) {
        const errorCodes = {
          '0x12b3b8ff': 'KeyAlreadyUsed',
          '0xb05e92fa': 'InvalidMerkleProof',
          '0x8baa579f': 'InvalidSignature',
          '0x786e0a99': 'InsufficientContractBalance'
        };
        
        if (errorCodes[error.data]) {
          throw new Error(`Smart contract error: ${errorCodes[error.data]}`);
        }
      }
      
      throw error;
    }
  }

  // Get all available keys for a deposit
  async getAvailableKeys(deposit, provider = null) {
    console.log('🔍 Getting available keys for deposit');
    
    if (!deposit.keyshares) {
      return [];
    }

    const firstNodeKeyshares = Object.values(deposit.keyshares)[0];
    if (!firstNodeKeyshares || !firstNodeKeyshares.keyshares) {
      return [];
    }

    const keysMetadata = firstNodeKeyshares.keys_metadata || [];
    
    const keys = firstNodeKeyshares.keyshares.map(key => {
      let keyMetadata;
      if (Array.isArray(keysMetadata)) {
        keyMetadata = keysMetadata.find(meta => meta.key_index === key.key_index);
      } else {
        keyMetadata = keysMetadata[key.key_index];
      }
      
      return {
        keyIndex: key.key_index,
        denomination: key.denomination,
        merkleRoot: keyMetadata?.merkle_root,
        treeIndex: keyMetadata?.tree_index || 0,
        merkleProof: keyMetadata?.merkle_proof || [],
        keyshare: key
      };
    });
    
    // Check if keys are used (if provider available)
    if (provider) {
      // For ECDSA, we'd need to check against signer addresses in merkle tree
      // This is simplified - in production you'd reconstruct the address
      for (const key of keys) {
        try {
          // Reconstruct to get the address that would be in the merkle tree
          const reconstructed = this.reconstructPrivateKey(deposit.keyshares, key.keyIndex);
          
          if (!reconstructed.privateKey) {
            console.error(`No private key reconstructed for key ${key.keyIndex}`);
            key.isUsed = false;
            continue;
          }
          
          const privateKeyHex = '0x' + reconstructed.privateKey.toString(16).padStart(64, '0');
          const wallet = new ethers.Wallet(privateKeyHex);
          const address = await wallet.getAddress();
          
          // The contract tracks by merkleRootId + keyIndex
          // We'd need to check if this specific key has been used
          key.signerAddress = address;
          key.isUsed = false; // Would need contract method to check
        } catch (error) {
          console.error(`Error checking key ${key.keyIndex}:`, error);
          key.isUsed = false;
        }
      }
    }
    
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

      // Get available keys
      const availableKeys = await this.getAvailableKeys(deposit, provider);
      if (availableKeys.length === 0) {
        throw new Error('No keys available for withdrawal');
      }

      // Select key to withdraw
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
}

export default new WithdrawalServiceECDSA();