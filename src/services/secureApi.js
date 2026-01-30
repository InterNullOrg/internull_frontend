/**
 * Secure API service for signature-based treasury operations
 */

class SecureAPI {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    this.contractAddress = process.env.REACT_APP_TREASURY_CONTRACT;
  }

  /**
   * Get supported denominations
   */
  async getSupportedDenominations() {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/treasury/supported-denominations`);
      return await response.json();
    } catch (error) {
      console.error('Error getting denominations:', error);
      throw error;
    }
  }

  /**
   * Request key allocation (Step 1)
   */
  async requestKeys({ wallet_address, tx_hash, key_requirements }) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/treasury/request-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address,
          tx_hash,
          key_requirements
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error requesting keys:', error);
      throw error;
    }
  }

  /**
   * Claim keys with signature (Step 2)
   */
  async claimKeys({ wallet_address, message, signature }) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/treasury/claim-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address,
          message,
          signature
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error claiming keys:', error);
      throw error;
    }
  }

  /**
   * Unlock key allocation
   */
  async unlockKeys({ wallet_address, message, signature }) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/treasury/unlock-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address,
          message,
          signature
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error unlocking keys:', error);
      throw error;
    }
  }

  /**
   * Verify key allocation status
   */
  async verifyKeyAllocation({ wallet_address, tx_hash }) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/treasury/verify-key-allocation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address,
          tx_hash
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error verifying allocation:', error);
      throw error;
    }
  }

  /**
   * Decrypt keys locally with user password
   */
  async decryptKeysLocally(encryptedPackages, userPassword, encryptionInfo) {
    try {
      // Import crypto functions for client-side decryption
      const CryptoJS = await import('crypto-js');
      
      const decryptedKeys = [];

      for (const encryptedPackage of encryptedPackages) {
        try {
          // Convert hex salt to WordArray
          const salt = CryptoJS.enc.Hex.parse(encryptedPackage.salt);
          
          // Derive key from password using PBKDF2 (same as server)
          const key = CryptoJS.PBKDF2(userPassword, salt, {
            keySize: 256/32,
            iterations: encryptionInfo.iterations || 100000,
            hasher: CryptoJS.algo.SHA256
          });

          // Decrypt the package
          const iv = CryptoJS.enc.Base64.parse(encryptedPackage.iv);
          const encryptedData = CryptoJS.enc.Base64.parse(encryptedPackage.encrypted_data);
          
          const decrypted = CryptoJS.AES.decrypt({
            ciphertext: encryptedData
          }, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
          });

          const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
          const keyData = JSON.parse(decryptedText);

          decryptedKeys.push({
            key_index: encryptedPackage.key_index,
            denomination: encryptedPackage.denomination,
            ...keyData
          });

        } catch (error) {
          console.error(`Failed to decrypt package ${encryptedPackage.key_index}:`, error);
          throw new Error(`Decryption failed for key ${encryptedPackage.key_index}`);
        }
      }

      return {
        success: true,
        decrypted_keys: decryptedKeys,
        total_keys: decryptedKeys.length,
        decrypted_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Local decryption error:', error);
      throw error;
    }
  }

  /**
   * Validate a WOTS key package
   */
  validateKeyPackage(keyPackage) {
    const requiredFields = ['key_index', 'denomination', 'shares', 'public_key'];
    
    for (const field of requiredFields) {
      if (!(field in keyPackage)) {
        return { valid: false, error: `Missing field: ${field}` };
      }
    }

    // Validate shares structure
    if (!Array.isArray(keyPackage.shares) || keyPackage.shares.length === 0) {
      return { valid: false, error: 'Invalid shares structure' };
    }

    // Validate each share has required elements
    for (const share of keyPackage.shares) {
      if (!share.node_id || !share.elements || !Array.isArray(share.elements)) {
        return { valid: false, error: 'Invalid share structure' };
      }
      
      // WOTS should have 67 elements (64 message + 3 checksum)
      if (share.elements.length !== 67) {
        return { valid: false, error: `Invalid WOTS elements count: ${share.elements.length}` };
      }
    }

    return { valid: true };
  }

  /**
   * Reconstruct WOTS private key from threshold shares
   */
  async reconstructWOTSKey(keyPackage) {
    try {
      const validation = this.validateKeyPackage(keyPackage);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const shares = keyPackage.shares;
      const threshold = keyPackage.verification_data?.threshold || 2;
      
      if (shares.length < threshold) {
        throw new Error(`Insufficient shares: need ${threshold}, have ${shares.length}`);
      }

      // Use first 'threshold' shares for reconstruction
      const reconstructionShares = shares.slice(0, threshold);
      
      const privateKeyElements = [];

      // Reconstruct each of the 67 WOTS elements
      for (let elementIndex = 0; elementIndex < 67; elementIndex++) {
        const elementShares = reconstructionShares.map(share => ({
          index: share.share_index || 1,
          value: share.elements[elementIndex]
        }));

        // Lagrange interpolation (simplified - in production use proper big integer math)
        const reconstructedElement = this.lagrangeInterpolate(elementShares);
        privateKeyElements.push(reconstructedElement);
      }

      return {
        success: true,
        private_key: privateKeyElements,
        public_key: keyPackage.public_key,
        key_index: keyPackage.key_index,
        denomination: keyPackage.denomination,
        algorithm: 'winternitz'
      };

    } catch (error) {
      console.error('Key reconstruction error:', error);
      throw error;
    }
  }

  /**
   * Simplified Lagrange interpolation for threshold reconstruction
   * Note: This is a simplified version - production should use proper big integer arithmetic
   */
  lagrangeInterpolate(shares) {
    if (shares.length === 0) return 0;
    if (shares.length === 1) return shares[0].value;

    // For demonstration - in production, use proper field arithmetic
    let result = 0;
    
    for (let i = 0; i < shares.length; i++) {
      let term = parseInt(shares[i].value);
      
      for (let j = 0; j < shares.length; j++) {
        if (i !== j) {
          // Simplified: term *= (0 - shares[j].index) / (shares[i].index - shares[j].index)
          term = term * (0 - shares[j].index) / (shares[i].index - shares[j].index);
        }
      }
      
      result += term;
    }

    return Math.abs(Math.floor(result));
  }

  /**
   * Create a WOTS signature (simplified version)
   */
  async createWOTSSignature(privateKey, message) {
    try {
      if (!privateKey || privateKey.length !== 67) {
        throw new Error('Invalid private key format');
      }

      // Hash the message to get checksum
      const messageHash = await this.sha256(message);
      const messageBytes = this.hexToBytes(messageHash);
      
      // Convert to base-w representation (w=16 for WOTS)
      const messageBase16 = this.toBaseW(messageBytes, 16);
      
      // Calculate checksum
      const checksum = this.calculateChecksum(messageBase16, 16);
      const checksumBase16 = this.toBaseW([checksum], 16);
      
      // Combine message and checksum
      const fullMessage = [...messageBase16, ...checksumBase16];
      
      if (fullMessage.length !== 67) {
        throw new Error('Invalid message length for WOTS');
      }

      // Generate signature by chaining hash function
      const signature = [];
      for (let i = 0; i < 67; i++) {
        let sigElement = privateKey[i];
        
        // Chain hash function 'fullMessage[i]' times
        for (let j = 0; j < fullMessage[i]; j++) {
          sigElement = await this.sha256(sigElement.toString());
        }
        
        signature.push(sigElement);
      }

      return {
        success: true,
        signature: signature,
        message_hash: messageHash,
        algorithm: 'winternitz'
      };

    } catch (error) {
      console.error('WOTS signature error:', error);
      throw error;
    }
  }

  // Helper functions for cryptographic operations

  async sha256(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  toBaseW(bytes, w) {
    const result = [];
    let buffer = 0;
    let bufferBits = 0;
    const bitsPerElement = Math.log2(w);

    for (const byte of bytes) {
      buffer = (buffer << 8) | byte;
      bufferBits += 8;

      while (bufferBits >= bitsPerElement) {
        const element = (buffer >> (bufferBits - bitsPerElement)) & (w - 1);
        result.push(element);
        bufferBits -= bitsPerElement;
      }
    }

    if (bufferBits > 0) {
      const element = (buffer << (bitsPerElement - bufferBits)) & (w - 1);
      result.push(element);
    }

    return result;
  }

  calculateChecksum(messageBase16, w) {
    const sum = messageBase16.reduce((acc, val) => acc + (w - 1 - val), 0);
    return sum;
  }
}

// Export singleton instance
export const secureApi = new SecureAPI();
export default secureApi;