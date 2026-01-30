import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

// Constants for Winternitz signature
const WINTERNITZ_PARAMETER = 16; // w = 16 (4 bits per element)
const HASH_LENGTH = 32; // 256 bits / 8 bits per byte
const ELEMENTS_PER_SIGNATURE = 67; // Total elements in signature

// Hash function using SHA256
const hash = (data) => {
  const hash = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(data.slice(2)));
  return '0x' + hash.toString(CryptoJS.enc.Hex);
};

// Convert message to base-w representation
const messageToBaseW = (message) => {
  // Remove 0x prefix if present
  const msgHex = message.startsWith('0x') ? message.slice(2) : message;
  
  // Convert to binary string
  let binary = '';
  for (let i = 0; i < msgHex.length; i++) {
    const byte = parseInt(msgHex[i], 16);
    binary += byte.toString(2).padStart(4, '0');
  }
  
  // Split into 4-bit chunks (base-16)
  const elements = [];
  for (let i = 0; i < binary.length; i += 4) {
    const chunk = binary.slice(i, i + 4);
    elements.push(parseInt(chunk, 2));
  }
  
  // Add checksum elements
  const checksum = calculateChecksum(elements);
  return elements.concat(checksum);
};

// Calculate checksum for Winternitz signature
const calculateChecksum = (elements) => {
  let sum = 0;
  for (const element of elements) {
    sum += (WINTERNITZ_PARAMETER - 1) - element;
  }
  
  // Convert sum to base-w
  const checksumElements = [];
  while (sum > 0 && checksumElements.length < 3) { // 3 checksum elements
    checksumElements.push(sum % WINTERNITZ_PARAMETER);
    sum = Math.floor(sum / WINTERNITZ_PARAMETER);
  }
  
  // Pad with zeros if needed
  while (checksumElements.length < 3) {
    checksumElements.push(0);
  }
  
  return checksumElements;
};

// Generate Winternitz signature from private key
export const generateWinternitzSignature = (privateKey, message) => {
  // Ensure private key is properly formatted
  if (!privateKey || typeof privateKey !== 'object') {
    throw new Error('Invalid private key format');
  }

  // Convert message to base-w representation
  const messageElements = messageToBaseW(message);
  
  if (messageElements.length !== ELEMENTS_PER_SIGNATURE) {
    throw new Error(`Message must have exactly ${ELEMENTS_PER_SIGNATURE} elements`);
  }

  // Generate signature by hashing each private key element
  const signature = [];
  
  for (let i = 0; i < ELEMENTS_PER_SIGNATURE; i++) {
    let element = privateKey[i] || privateKey[i.toString()];
    
    // Ensure element is a hex string
    if (!element || typeof element !== 'string') {
      throw new Error(`Missing private key element at index ${i}`);
    }
    
    // Apply hash function messageElements[i] times
    const hashCount = messageElements[i];
    for (let j = 0; j < hashCount; j++) {
      element = hash(element);
    }
    
    // Ensure element is properly padded to 32 bytes
    signature.push(ethers.utils.hexZeroPad(element, 32));
  }
  
  return signature;
};

// Verify Winternitz signature (for testing)
export const verifyWinternitzSignature = (message, signature, publicKey) => {
  // Convert message to base-w representation
  const messageElements = messageToBaseW(message);
  
  if (signature.length !== ELEMENTS_PER_SIGNATURE || publicKey.length !== ELEMENTS_PER_SIGNATURE) {
    return false;
  }

  // Verify each element
  for (let i = 0; i < ELEMENTS_PER_SIGNATURE; i++) {
    let element = signature[i];
    
    // Apply remaining hashes to reach public key
    const remainingHashes = (WINTERNITZ_PARAMETER - 1) - messageElements[i];
    for (let j = 0; j < remainingHashes; j++) {
      element = hash(element);
    }
    
    // Compare with public key element
    if (element.toLowerCase() !== publicKey[i].toLowerCase()) {
      return false;
    }
  }
  
  return true;
};

// Convert DKG private key format to array format
export const formatPrivateKeyFromDKG = (dkgPrivateKey) => {
  // If already in array format
  if (Array.isArray(dkgPrivateKey)) {
    return dkgPrivateKey;
  }
  
  // If in object format with numeric keys
  if (typeof dkgPrivateKey === 'object') {
    const keyArray = [];
    for (let i = 0; i < ELEMENTS_PER_SIGNATURE; i++) {
      const element = dkgPrivateKey[i] || dkgPrivateKey[i.toString()];
      if (!element) {
        throw new Error(`Missing private key element at index ${i}`);
      }
      keyArray.push(element);
    }
    return keyArray;
  }
  
  throw new Error('Invalid DKG private key format');
};

// Generate withdrawal proof with all necessary data
export const generateWithdrawalProof = (privateKey, message) => {
  // Format private key if needed
  const formattedPrivateKey = formatPrivateKeyFromDKG(privateKey);
  
  // Generate signature
  const signature = generateWinternitzSignature(formattedPrivateKey, message);
  
  return {
    signature,
    signatureFormatted: signature // Already in bytes32[67] format
  };
};