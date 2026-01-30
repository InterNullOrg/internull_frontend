import { ethers } from 'ethers';

// Treasury contract ABI - only the functions we need
const TREASURY_ABI = [
  {
    "inputs": [{"internalType": "bytes32", "name": "merkleRoot", "type": "bytes32"}],
    "name": "getMerkleRootIdByRoot",
    "outputs": [{"internalType": "uint256", "name": "merkleRootId", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
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
  }
];

// Function to get contract instance
export const getTreasuryContract = (provider) => {
  const contractAddress = process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('Treasury contract address not configured');
  }
  return new ethers.Contract(contractAddress, TREASURY_ABI, provider);
};

// Get merkleRootId from merkleRoot
export const getMerkleRootId = async (provider, merkleRoot) => {
  try {
    const contract = getTreasuryContract(provider);
    const merkleRootId = await contract.getMerkleRootIdByRoot(merkleRoot);
    
    // Check if merkleRootId is valid (not 0)
    if (merkleRootId.eq(0)) {
      throw new Error('Merkle root not found in contract');
    }
    
    return merkleRootId;
  } catch (error) {
    console.error('Error getting merkle root ID:', error);
    throw error;
  }
};

// Format bytes32 array for contract call
export const formatToBytes32Array = (data, length) => {
  if (!data) {
    throw new Error('Data is required for bytes32 array formatting');
  }

  // If data is already an array
  if (Array.isArray(data)) {
    if (data.length !== length) {
      throw new Error(`Array must have exactly ${length} elements`);
    }
    return data.map(item => {
      if (typeof item === 'string' && item.startsWith('0x')) {
        return ethers.utils.hexZeroPad(item, 32);
      }
      return ethers.utils.hexZeroPad(ethers.utils.hexlify(item), 32);
    });
  }

  // If data is a hex string representing the full array
  if (typeof data === 'string' && data.startsWith('0x')) {
    // Remove 0x prefix
    const hex = data.slice(2);
    
    // Each bytes32 is 64 hex characters
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
};

// Build deposit transaction
export const buildDepositTransaction = (amount) => {
  // Validate amount
  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error('Invalid deposit amount. Must be a positive number.');
  }

  if (amount === Infinity) {
    throw new Error('Deposit amount cannot be infinity.');
  }

  // Validate contract address
  if (!process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS) {
    throw new Error('Treasury contract address not configured. Please set REACT_APP_TREASURY_CONTRACT_ADDRESS.');
  }

  try {
    // Convert amount to wei
    const valueInWei = ethers.utils.parseEther(amount.toString());
    
    // Use the raw function selector for deposit()
    // This matches exactly what the Python script uses
    const depositFunctionSelector = '0xd0e30db0';
    
    return {
      to: process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS,
      value: valueInWei,
      data: depositFunctionSelector
    };
  } catch (error) {
    throw new Error(`Failed to build deposit transaction: ${error.message}`);
  }
};

// Build withdraw transaction
export const buildWithdrawTransaction = async (provider, withdrawData) => {
  // Validate input data
  if (!withdrawData) {
    throw new Error('Withdraw data is required');
  }

  const {
    recipient,
    denomination,
    merkleRoot,
    signature,
    merkleProof,
    keyIndex
  } = withdrawData;

  // Validate required fields
  if (!recipient || !ethers.utils.isAddress(recipient)) {
    throw new Error('Invalid recipient address');
  }

  if (!denomination || isNaN(denomination) || denomination <= 0) {
    throw new Error('Invalid denomination. Must be a positive number.');
  }

  if (!merkleRoot || typeof merkleRoot !== 'string' || !merkleRoot.startsWith('0x')) {
    throw new Error('Invalid merkle root format');
  }

  if (!signature) {
    throw new Error('Signature is required');
  }

  if (!merkleProof || !Array.isArray(merkleProof)) {
    throw new Error('Invalid merkle proof format. Must be an array.');
  }

  if (keyIndex === undefined || keyIndex === null || isNaN(keyIndex)) {
    throw new Error('Invalid key index. Must be a number.');
  }

  if (!provider) {
    throw new Error('Provider is required');
  }

  try {
    // Get merkleRootId from the contract
    const merkleRootId = await getMerkleRootId(provider, merkleRoot);

    // Format ECDSA signature (should be 65 bytes as hex string)
    let formattedSignature;
    if (typeof signature === 'string' && signature.startsWith('0x')) {
      // Already a hex string
      formattedSignature = signature;
    } else if (Array.isArray(signature) && signature.length === 1) {
      // Single element array containing the signature
      formattedSignature = signature[0];
    } else {
      throw new Error('Invalid ECDSA signature format. Expected hex string or single-element array.');
    }

    // Validate signature length (65 bytes = 130 hex chars + 0x prefix = 132 chars)
    if (formattedSignature.length !== 132) {
      throw new Error(`Invalid ECDSA signature length. Expected 132 chars (0x + 130 hex), got ${formattedSignature.length}`);
    }

    // Validate contract address
    if (!process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS) {
      throw new Error('Treasury contract address not configured');
    }

    // Encode the withdraw function call
    const contract = getTreasuryContract(provider);
    const encodedData = contract.interface.encodeFunctionData('withdraw', [
      recipient,
      ethers.utils.parseEther(denomination.toString()), // Convert denomination to wei
      merkleRootId,
      formattedSignature,
      merkleProof, // Already in correct format from DKG
      keyIndex
    ]);

    return {
      to: process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS,
      value: 0,
      data: encodedData
    };
  } catch (error) {
    throw new Error(`Failed to build withdraw transaction: ${error.message}`);
  }
};

// Generate message for Winternitz signature
export const generateWithdrawMessage = (recipient, denomination, merkleRoot, chainId) => {
  // Validate inputs
  if (!recipient || !ethers.utils.isAddress(recipient)) {
    throw new Error('Invalid recipient address for message generation');
  }

  if (!denomination || isNaN(denomination) || denomination <= 0) {
    throw new Error('Invalid denomination for message generation');
  }

  if (!merkleRoot || typeof merkleRoot !== 'string' || !merkleRoot.startsWith('0x')) {
    throw new Error('Invalid merkle root for message generation');
  }

  if (!chainId || isNaN(chainId) || chainId <= 0) {
    throw new Error('Invalid chain ID for message generation');
  }

  try {
    return ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'bytes32', 'uint256'],
      [
        recipient,
        ethers.utils.parseEther(denomination.toString()), // Convert to wei
        merkleRoot,
        chainId
      ]
    );
  } catch (error) {
    throw new Error(`Failed to generate withdraw message: ${error.message}`);
  }
};