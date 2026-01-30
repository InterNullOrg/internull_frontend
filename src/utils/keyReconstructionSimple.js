import CryptoJS from 'crypto-js';

/**
 * Simplified key reconstruction utilities (no BigInt dependency)
 * For demo purposes - uses regular JavaScript numbers
 */

export class SimpleKeyReconstructor {
  constructor() {
    this.threshold = 2; // Default threshold
  }

  /**
   * Reconstruct key from keyshares (simplified version)
   * @param {Object} keyData - Key data from DKG including shares, merkle proof, etc.
   * @returns {Object} Reconstructed key data
   */
  reconstructKey(keyData) {
    try {
      // Validate inputs
      if (!keyData || !keyData.shares || !keyData.public_key) {
        throw new Error('Missing required parameters for key reconstruction');
      }

      // Extract data from DKG response
      const { shares, public_key, merkle_proof, merkle_root, key_index, denomination } = keyData;

      // Extract and combine shares (simplified approach)
      const combinedShares = this.combineShares(shares);
      
      // Generate reconstructed key from combined shares
      const reconstructedKey = this.generateKeyFromShares(combinedShares);
      
      // Simple verification (placeholder)
      const isValid = this.verifyKey(reconstructedKey, public_key);
      
      return {
        success: true,
        privateKey: reconstructedKey,
        publicKey: public_key,
        merkleProof: merkle_proof,
        merkleRoot: merkle_root,
        keyIndex: key_index,
        denomination: denomination,
        isValid: isValid,
        elements: Object.keys(shares).length,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Key reconstruction failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Combine shares using simple hashing (placeholder for real crypto)
   * @param {Object} shares - Raw shares from API
   * @returns {string} Combined share data
   */
  combineShares(shares) {
    let combined = '';
    
    // Sort elements by index for consistency
    const sortedElements = Object.keys(shares).sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const elementIndex of sortedElements) {
      const elementShares = shares[elementIndex];
      
      // Sort shares within each element
      const sortedShares = Object.keys(elementShares).sort((a, b) => parseInt(a) - parseInt(b));
      
      for (const shareIndex of sortedShares) {
        const shareValue = elementShares[shareIndex];
        // Simple hash-based combination
        combined += CryptoJS.SHA256(shareValue + elementIndex + shareIndex).toString();
      }
    }
    
    return combined;
  }

  /**
   * Generate final key from combined shares
   * @param {string} combinedShares - Combined share data
   * @returns {string} Final private key
   */
  generateKeyFromShares(combinedShares) {
    // Hash the combined shares to get a deterministic key
    return CryptoJS.SHA256(combinedShares).toString();
  }

  /**
   * Simple key verification (placeholder)
   * @param {string} privateKey - Reconstructed private key
   * @param {string} expectedPublicKey - Expected public key
   * @returns {boolean} Whether verification passed
   */
  verifyKey(privateKey, expectedPublicKey) {
    // Placeholder verification - in production this would:
    // 1. Derive public key from private key
    // 2. Compare with expected public key
    
    // For demo, just check key format
    return privateKey && privateKey.length === 64 && /^[a-f0-9]+$/i.test(privateKey);
  }

  /**
   * Generate withdrawal proof for smart contract
   * @param {string} privateKey - Reconstructed private key
   * @param {Array} merkleProof - Merkle proof
   * @returns {Object} Withdrawal proof object
   */
  generateWithdrawalProof(privateKey, merkleProof) {
    try {
      // Generate key commitment
      const keyCommitment = CryptoJS.SHA256(privateKey).toString();
      
      // Prepare merkle proof for smart contract
      const formattedProof = (merkleProof || []).map(p => {
        if (typeof p === 'string' && p.startsWith('0x')) {
          return p;
        }
        return '0x' + p;
      });
      
      return {
        keyCommitment: '0x' + keyCommitment,
        merkleProof: formattedProof,
        privateKey: privateKey // Keep for local use only
      };
      
    } catch (error) {
      console.error('Failed to generate withdrawal proof:', error);
      throw error;
    }
  }

  /**
   * Encrypt key data for local storage
   * @param {Object} keyData - Key data to encrypt
   * @param {string} password - Password for encryption
   * @returns {string} Encrypted data
   */
  encryptKeyData(keyData, password) {
    try {
      const dataString = JSON.stringify(keyData);
      const encrypted = CryptoJS.AES.encrypt(dataString, password).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt key data from local storage
   * @param {string} encryptedData - Encrypted data
   * @param {string} password - Password for decryption
   * @returns {Object} Decrypted key data
   */
  decryptKeyData(encryptedData, password) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, password);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Invalid password or corrupted data');
      }
      
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt key data. Please check your password.');
    }
  }

  /**
   * Reconstruct key from DKG response (compatible with new format)
   * @param {Object} dkgResponse - Full DKG response from backend
   * @returns {Object} Reconstructed key data with all contract parameters
   */
  reconstructKeyFromDKG(dkgResponse) {
    try {
      // Validate DKG response structure
      if (!dkgResponse || !dkgResponse.key_data) {
        throw new Error('Invalid DKG response format');
      }

      const { key_data } = dkgResponse;
      
      // Extract required fields
      const {
        shares,
        public_key,
        merkle_proof,
        merkle_root,
        denomination,
        key_index
      } = key_data;

      // Validate required fields
      if (!shares || !public_key || !merkle_proof || !merkle_root) {
        throw new Error('Missing required fields in DKG response');
      }

      // Use existing reconstructKey method for backwards compatibility
      const reconstructedKey = this.reconstructKey(shares, merkle_proof, public_key);
      
      if (!reconstructedKey.success) {
        return reconstructedKey;
      }

      // Return enhanced format with DKG data
      return {
        success: true,
        privateKey: reconstructedKey.privateKey,
        publicKey: public_key,
        merkleProof: merkle_proof,
        merkleRoot: merkle_root,
        denomination: denomination || 0.1,
        keyIndex: key_index || 0,
        isValid: reconstructedKey.isValid,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('DKG key reconstruction failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Simple key derivation for demo purposes
   * @param {string} seed - Seed value
   * @param {number} index - Key index
   * @returns {string} Derived key
   */
  deriveKey(seed, index) {
    const combined = seed + index.toString();
    return CryptoJS.SHA256(combined).toString();
  }

  /**
   * Validate key format
   * @param {string} key - Key to validate
   * @returns {boolean} Whether key is valid format
   */
  validateKeyFormat(key) {
    return typeof key === 'string' && 
           key.length === 64 && 
           /^[a-f0-9]+$/i.test(key);
  }
}

export default new SimpleKeyReconstructor();