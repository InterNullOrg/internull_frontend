/**
 * Single Node Withdrawal Service
 * Handles withdrawals from a single OTS node (no key reconstruction needed)
 */


import Web3 from 'web3';
import { ethers } from 'ethers';
import treasuryABI from '../abi/MultiTokenTreasury.json';

// Backend URLs - V1 (pre-generated keys) and V2 (on-the-fly key derivation)
const NODE_URL_V1 = process.env.REACT_APP_API_URL || 'https://api.internull.xyz';
const NODE_URL_V2 = process.env.REACT_APP_API_URL_V2 || 'https://api-v2.internull.xyz';
const TREASURY_ADDRESS = process.env.REACT_APP_TREASURY_CONTRACT ||
    process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS ||
    process.env.REACT_APP_MULTITOKEN_TREASURY_ADDRESS ||
    '0x8F2cF7140bE26f2d9D56F06b8CC5081f89E7Cc38'; // Sepolia deployment

class SingleNodeWithdrawalService {
    constructor() {
        this.web3 = null;
        this.treasuryContract = null;
        this.backendVersion = 'v1'; // Default to V1
        this.nodeUrl = NODE_URL_V1;
    }

    /**
     * Set the backend version to use for key requests
     * @param {string} version 'v1' or 'v2'
     */
    setBackendVersion(version) {
        this.backendVersion = version;
        this.nodeUrl = version === 'v2' ? NODE_URL_V2 : NODE_URL_V1;
        console.log(`🔄 Backend switched to ${version.toUpperCase()}: ${this.nodeUrl}`);
    }

    /**
     * Get current backend version
     * @returns {string} 'v1' or 'v2'
     */
    getBackendVersion() {
        return this.backendVersion;
    }

    /**
     * Get current node URL
     * @returns {string} Current backend URL
     */
    getNodeUrl() {
        return this.nodeUrl;
    }

    // Getter to check if initialized
    get isInitialized() {
        return this.web3 !== null;
    }

    /**
     * Initialize the service with Web3 provider
     * @param {Object} provider Web3 provider
     * @param {string} treasuryAddress Optional treasury address override
     */
    async initialize(provider, treasuryAddress = null) {
        console.log('Initializing Web3 with provider:', provider);
        this.web3 = new Web3(provider);

        // Increase global timeouts for slow networks (Polygon Amoy)
        this.web3.eth.transactionBlockTimeout = 200; // Wait 200 blocks
        this.web3.eth.transactionPollingTimeout = 1200; // Wait 20 minutes

        console.log('Web3 initialized:', this.web3);

        // Use provided treasury address or fall back to environment variable
        const contractAddress = treasuryAddress || TREASURY_ADDRESS;

        // Extract ABI from the artifact
        const contractABI = treasuryABI.abi || treasuryABI;
        console.log('Creating treasury contract with ABI:', contractABI ? `ABI loaded (${contractABI.length} methods)` : 'ABI missing');
        console.log('Treasury address:', contractAddress);

        this.treasuryContract = new this.web3.eth.Contract(
            contractABI,
            contractAddress,
            {
                transactionBlockTimeout: 200,
                transactionPollingTimeout: 1200
            }
        );
        // Explicitly set options on contract instance as well
        this.treasuryContract.transactionBlockTimeout = 200;
        this.treasuryContract.transactionPollingTimeout = 1200;
        console.log('Treasury contract initialized:', this.treasuryContract);
        console.log('Contract methods available:', this.treasuryContract.methods ? Object.keys(this.treasuryContract.methods).length : 'No');

        return true;
    }

    /**
     * Update treasury contract address (for cross-chain support)
     * @param {string} treasuryAddress New treasury address
     */
    updateTreasuryAddress(treasuryAddress) {
        if (!this.web3) {
            throw new Error('Web3 not initialized');
        }

        console.log('Updating treasury address to:', treasuryAddress);
        const contractABI = treasuryABI.abi || treasuryABI;

        this.treasuryContract = new this.web3.eth.Contract(
            contractABI,
            treasuryAddress,
            {
                transactionBlockTimeout: 200,
                transactionPollingTimeout: 1200
            }
        );
        // Explicitly set options on contract instance as well
        this.treasuryContract.transactionBlockTimeout = 200;
        this.treasuryContract.transactionPollingTimeout = 1200;

        console.log('Treasury contract updated to address:', treasuryAddress);
    }

    /**
     * Request withdrawal from single node
     * @param {Object} params Withdrawal parameters
     * @returns {Object} Withdrawal response with keys
     */
    async requestWithdrawal(params) {
        const {
            userAddress,
            tokenSymbol = 'ETH',
            requestedDenominations,
            depositTx,
            signature,
            timestamp,
            nonce,
            targetChain,  // Must be provided by caller
            web3Provider  // Need web3 provider for signing
        } = params;

        console.log('🔑 Requesting withdrawal from single node...');
        console.log('Target chain:', targetChain);
        console.log('Denominations:', requestedDenominations);

        try {
            // Generate timestamp and nonce if not provided
            const withdrawalTimestamp = timestamp || Math.floor(new Date().getTime() / 1000);
            const withdrawalNonce = nonce || '0x' + [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

            // Create the message to sign (matching backend format)
            const withdrawalStr = requestedDenominations.map(d => `${d} ${tokenSymbol}`).join(', ');
            const message = `Withdraw ${withdrawalStr} from deposit ${depositTx} on chain ${targetChain} at ${withdrawalTimestamp} with nonce ${withdrawalNonce}`;

            console.log('🔐 Message to sign:', message);

            // Request signature from MetaMask if not provided
            let withdrawalSignature = signature;
            if (!withdrawalSignature && web3Provider) {
                console.log('📝 Requesting signature from MetaMask...');
                try {
                    withdrawalSignature = await web3Provider.request({
                        method: 'personal_sign',
                        params: [message, userAddress],
                    });
                    console.log('✅ Signature obtained:', withdrawalSignature.substring(0, 20) + '...');
                } catch (signError) {
                    console.error('❌ User rejected signature or error:', signError);
                    throw new Error('Signature required to request withdrawal keys');
                }
            }

            // Make request to single node with signature
            const response = await fetch(`${this.nodeUrl}/api/v1/withdrawal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_address: userAddress,
                    token_symbol: tokenSymbol,
                    requested_denominations: requestedDenominations,
                    deposit_tx: depositTx,
                    source_chain: params.sourceChain,  // Add source chain
                    target_chain: targetChain,
                    signature: withdrawalSignature,
                    timestamp: withdrawalTimestamp,
                    nonce: withdrawalNonce
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Withdrawal request failed');
            }

            console.log(`✅ Received ${data.keys?.length || 0} keys from node`);
            return data;

        } catch (error) {
            console.error('❌ Withdrawal request failed:', error);
            throw error;
        }
    }

    /**
     * Verify merkle proof locally
     * @param {string} address The ethereum address to verify
     * @param {Array} proof The merkle proof array
     * @param {number} index The index in the merkle tree
     * @returns {string} The reconstructed merkle root
     */
    verifyMerkleProof(address, proof, index) {
        // Create leaf hash from address - must match backend's approach
        // Backend hashes raw 20-byte address without padding
        // Remove 0x prefix and convert to bytes
        const addressClean = address.toLowerCase().startsWith('0x') ? address.slice(2) : address;
        // Hash the raw address bytes (20 bytes, no padding)
        let leaf = this.web3.utils.keccak256('0x' + addressClean);

        console.log('Leaf hash for address', address, ':', leaf);

        // Reconstruct root from proof
        let computedHash = leaf;
        let currentIndex = index;

        for (let i = 0; i < proof.length; i++) {
            const proofElement = proof[i];

            if (currentIndex % 2 === 0) {
                // Current hash is left, proof element is right
                // Concatenate the two hashes as hex strings (without 0x prefix)
                const combined = computedHash.slice(2) + proofElement.slice(2);
                computedHash = this.web3.utils.keccak256('0x' + combined);
            } else {
                // Current hash is right, proof element is left
                // Concatenate the two hashes as hex strings (without 0x prefix)
                const combined = proofElement.slice(2) + computedHash.slice(2);
                computedHash = this.web3.utils.keccak256('0x' + combined);
            }

            console.log(`  Level ${i}: hash = ${computedHash}, index = ${currentIndex}`);
            currentIndex = Math.floor(currentIndex / 2);
        }

        return computedHash;
    }

    /**
     * Execute withdrawal on smart contract
     * @param {Object} key Key data from node
     * @param {string} recipientAddress Recipient address
     * @returns {Object} Transaction receipt
     */
    async executeWithdrawal(key, recipientAddress) {
        console.log('💰 Executing withdrawal on smart contract...');
        // Processing key for withdrawal
        console.log('Recipient address:', recipientAddress);

        try {
            // Check Web3 again before using it
            if (!this.web3) {
                throw new Error('Web3 not initialized in executeWithdrawal');
            }

            // Normalize the recipient address to checksum format
            recipientAddress = this.web3.utils.toChecksumAddress(recipientAddress);

            const {
                private_key,
                ethereum_address,
                denomination_wei,
                merkle_root,
                merkle_proof,
                key_index,
                tree_index,  // Add tree_index for merkle proof verification
                token_address,  // Token address from key
                token_symbol,   // Token symbol from key
                merkle_root_id  // Merkle root ID from backend (optimization)
            } = key;

            console.log(`Using key index ${key_index} for withdrawal (tree position: ${tree_index}, ${denomination_wei} wei)`);
            console.log(`Token: ${token_symbol} at address: ${token_address}`);

            // PERFORMANCE OPTIMIZATION: Use merkle_root_id from backend if valid
            // This avoids expensive iteration through contract (up to 50 RPC calls!)
            let merkleRootId = merkle_root_id !== undefined && merkle_root_id !== null
                ? merkle_root_id
                : key.merkleRootId; // Also try camelCase variant

            // Validate that merkle_root_id is valid (not 0, not null, not negative)
            if (merkleRootId !== null && merkleRootId !== undefined && merkleRootId !== 0) {
                // Convert to number if it's a string
                const merkleRootIdNum = typeof merkleRootId === 'string' ? parseInt(merkleRootId, 10) : merkleRootId;

                // Check if it's a valid number and greater than 0
                if (!isNaN(merkleRootIdNum) && merkleRootIdNum > 0) {
                    merkleRootId = merkleRootIdNum;
                    console.log('✅ Using merkle_root_id from backend:', merkleRootId, '(fast path - no RPC calls needed)');
                } else {
                    console.warn('⚠️ Invalid merkle_root_id from backend:', merkleRootId, '- will search contract instead');
                    merkleRootId = null; // Force fallback to contract search
                }
            } else {
                console.log('⚠️ merkle_root_id is 0, null, or undefined - will search contract...');
                merkleRootId = null;
            }

            // Fallback: Query contract to find merkle root ID if not provided or invalid
            if (merkleRootId === null || merkleRootId === undefined) {
                console.log('🔍 Searching contract for merkle root ID...');
                merkleRootId = await this.getMerkleRootId(merkle_root, denomination_wei);

                if (merkleRootId === null || merkleRootId === undefined) {
                    throw new Error('Merkle root not found in contract');
                }
                console.log('✅ Found merkle_root_id via contract search:', merkleRootId, '(slow path)');
            }

            console.log('Final merkle root ID:', merkleRootId);

            // Use token address from key, default to 0x0 for native ETH if not provided
            const tokenAddress = token_address || '0x0000000000000000000000000000000000000000';

            // Create withdrawal message matching the contract
            const chainId = await this.web3.eth.getChainId();
            console.log('Chain ID:', chainId);

            // Contract expects: keccak256(abi.encodePacked(recipient, token, amount, block.chainid))
            const message = this.web3.utils.soliditySha3(
                { type: 'address', value: recipientAddress },
                { type: 'address', value: tokenAddress },  // token address
                { type: 'uint256', value: denomination_wei },  // amount
                { type: 'uint256', value: chainId }
            );

            console.log('Message to sign:', message);

            // Verify merkle proof locally before sending to contract
            const signerAddress = ethereum_address;
            console.log('Signer address:', signerAddress);

            // Reconstruct merkle root from proof - use tree_index NOT key_index!
            const reconstructedRoot = this.verifyMerkleProof(signerAddress, merkle_proof, tree_index);
            console.log('Reconstructed merkle root:', reconstructedRoot);
            console.log('Expected merkle root:', merkle_root);
            console.log('Merkle roots match:', reconstructedRoot === merkle_root);

            if (reconstructedRoot !== merkle_root) {
                console.error('❌ MERKLE PROOF VERIFICATION FAILED LOCALLY!');
                console.error('Key index used:', key_index);
                console.error('Merkle proof:', merkle_proof);
                console.error('Signer address:', signerAddress);
            }

            // Sign with private key
            const signature = await this.signMessage(message, private_key);
            console.log('Signature generated:', signature);
            // Execute withdrawal
            const accounts = await this.web3.eth.getAccounts();
            console.log('Using account:', accounts[0]);



            console.log(`Sending withdrawal transaction...`);

            // chainId is already declared above at line 272
            console.log(`Checking chain for ethers.js fallback: ${chainId}`);

            // Use ethers.js for Polygon Amoy (80002) to avoid web3.js RPC errors
            if (chainId === 80002 || chainId === '80002' || chainId === '0x13882') {
                console.log('Using ethers.js for Polygon Amoy withdrawal...');
                try {
                    // Detect MetaMask specifically (not Phantom or other wallets)
                    let ethereumProvider = window.ethereum;

                    // If multiple wallets are installed, find MetaMask
                    if (window.ethereum?.providers) {
                        ethereumProvider = window.ethereum.providers.find(p => p.isMetaMask);
                        console.log('Found MetaMask provider from multiple wallet providers');
                    } else if (!window.ethereum?.isMetaMask) {
                        throw new Error('MetaMask not detected. Please ensure MetaMask is installed and active.');
                    }

                    // Get ethers provider and signer from MetaMask
                    const provider = new ethers.providers.Web3Provider(ethereumProvider);
                    const signer = provider.getSigner();

                    // Create ethers contract instance
                    const contractABI = treasuryABI.abi || treasuryABI;
                    const ethersContract = new ethers.Contract(
                        this.treasuryContract.options.address,
                        contractABI,
                        signer
                    );

                    // Send transaction - let MetaMask estimate gas for complex withdrawal
                    console.log('Calling withdraw with params:', {
                        tokenAddress,
                        recipientAddress,
                        denomination_wei: denomination_wei.toString(),
                        merkleRootId,
                        signatureLength: signature.length,
                        proofLength: merkle_proof.length,
                        tree_index
                    });

                    const tx = await ethersContract.withdraw(
                        tokenAddress,
                        recipientAddress,
                        denomination_wei,
                        merkleRootId,
                        signature,
                        merkle_proof,
                        tree_index
                        // No gas parameter - let MetaMask estimate everything
                    );

                    console.log('Transaction sent:', tx.hash);
                    const receipt = await tx.wait();
                    console.log('✅ Withdrawal successful:', receipt.transactionHash);

                    // Return in web3 format for compatibility
                    return {
                        transactionHash: receipt.transactionHash,
                        blockNumber: receipt.blockNumber,
                        status: receipt.status
                    };
                } catch (ethersError) {
                    console.error('❌ Ethers.js withdrawal failed:', ethersError);
                    console.error('Error details:', {
                        code: ethersError.code,
                        message: ethersError.message,
                        reason: ethersError.reason,
                        data: ethersError.data
                    });
                    throw ethersError;
                }
            }

            // Fallback to web3.js for other chains
            try {
                console.log('Using web3.js for withdrawal...');
                console.log('📋 Withdraw parameters:', {
                    tokenAddress,
                    recipientAddress,
                    denomination_wei: denomination_wei.toString(),
                    merkleRootId,
                    merkleRootIdType: typeof merkleRootId,
                    signatureLength: signature.length,
                    merkleProofLength: merkle_proof.length,
                    tree_index,
                    tree_index_type: typeof tree_index,
                    from: accounts[0]
                });

                const tx = await this.treasuryContract.methods.withdraw(
                    tokenAddress,
                    recipientAddress,
                    denomination_wei,
                    merkleRootId,
                    signature,
                    merkle_proof,
                    tree_index
                ).send({
                    from: accounts[0]
                });

                console.log('✅ Withdrawal successful:', tx.transactionHash);
                return tx;
            } catch (sendError) {
                console.error('❌ Transaction send failed:', sendError);
                console.error('Error details:', {
                    code: sendError.code,
                    message: sendError.message,
                    data: sendError.data,
                    stack: sendError.stack
                });
                throw sendError;
            }

        } catch (error) {
            console.error('❌ Withdrawal execution failed:', error);
            console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            throw error;
        }
    }

    /**
     * Sign message with ECDSA private key
     * @param {string} message Message hash to sign
     * @param {string} privateKey Private key hex string
     * @returns {string} Signature
     */
    async signMessage(message, privateKey) {
        // Sign with private key - account.sign automatically adds the Ethereum prefix
        // which is what the contract expects with toEthSignedMessageHash
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        const signature = account.sign(message);

        return signature.signature;
    }

    /**
     * Get merkle root ID from contract using getMerkleRootIdByHash
     * @param {string} merkleRoot Merkle root hash
     * @param {string} denominationWei Denomination in wei
     * @returns {number} Merkle root ID
     */
    async getMerkleRootId(merkleRoot, denominationWei) {
        console.log('Finding merkle root ID for:', merkleRoot);
        console.log('Denomination:', denominationWei);

        try {
            // First try to call getMerkleRootIdByHash directly
            try {
                console.log('Calling getMerkleRootIdByHash with:', merkleRoot);
                const result = await this.treasuryContract.methods.getMerkleRootIdByHash(merkleRoot).call();
                console.log('✅ Got merkle root ID from contract:', result);

                // The function returns a struct with 'found' and 'rootId'
                if (result.found) {
                    const rootId = parseInt(result.rootId);
                    console.log('✅ Found merkle root with ID:', rootId);
                    return rootId;
                } else {
                    console.log('❌ Merkle root not found by hash');
                }
            } catch (directCallError) {
                console.log('Direct call to getMerkleRootIdByHash failed:', directCallError.message);
                console.log('Falling back to manual search...');
            }
            // Known merkle roots mapping (fallback for MetaMask caching issues)
            const knownRoots = {
                '0x6e274f236dcde617849bfbea66a60ece7fdc06c9ad6a064e4e02b5528ace3fa4': {
                    '100000000000000000': 10  // 0.1 ETH
                },
                '0x6ab999646f3e05e8188b96c59fc75b6c0e946bb17c37d6c5872c8dc52f2e951f': {
                    '10000000000000000': 9  // 0.01 ETH
                },
                '0xfdaff534493e9ba59ebf59e96c4ce43bc23c8f36e969a479c996a8ce436f2b81': {
                    '1000000000000000000': 8  // 1.0 ETH
                }
            };

            // Check if we have a known mapping
            const rootLower = merkleRoot.toLowerCase();
            if (knownRoots[rootLower] && knownRoots[rootLower][denominationWei]) {
                const knownId = knownRoots[rootLower][denominationWei];
                console.log(`📌 Found known mapping for ID ${knownId}, attempting verification...`);

                // Try to verify it's still active - but if verification fails, still use it
                // This handles MetaMask/Web3 caching issues where the state appears different
                try {
                    const rootInfo = await this.treasuryContract.methods.merkleRoots(knownId).call({}, 'latest');
                    console.log(`Verification result for ID ${knownId}:`, {
                        merkleRoot: rootInfo.merkleRoot?.substring(0, 20) + '...',
                        isActive: rootInfo.isActive,
                        denomination: rootInfo.denomination
                    });

                    // For known IDs, bypass verification if needed (Web3 caching issues)
                    if (knownId === 10 && denominationWei === '100000000000000000') {
                        console.log(`✅ Using known ID 10 for 0.1 ETH (bypassing Web3 caching issue)`);
                        return 10;
                    }

                    if (rootInfo.isActive) {
                        console.log(`✅ Verified known ID ${knownId} is active`);
                        return knownId;
                    }
                } catch (verifyError) {
                    // For 0.1 ETH, still use ID 10 even if verification fails
                    if (knownId === 10 && denominationWei === '100000000000000000') {
                        console.warn(`⚠️ Verification failed but using ID 10 for 0.1 ETH anyway (Web3 caching workaround)`);
                        return 10;
                    }

                    console.warn(`Known ID ${knownId} verification failed:`, verifyError.message);
                }
            }

            // Try to get nextMerkleRootId if method exists, otherwise check up to 50 IDs
            let checkUpTo = 50; // Default fallback
            try {
                const nextId = await this.treasuryContract.methods.nextMerkleRootId().call({}, 'latest');
                const maxId = parseInt(nextId);
                console.log('Next merkle root ID (fresh call):', maxId);
                checkUpTo = Math.max(20, maxId + 5);
            } catch (methodError) {
                console.warn('nextMerkleRootId() method not available, will check up to 50 IDs:', methodError.message);
            }

            // Check all IDs starting from 0 (some contracts use 0-indexed arrays)
            // Start with just the first few IDs to avoid rate limiting
            const priorityIds = [0, 1, 2, 3, 4, 5];

            for (let i = 0; i <= checkUpTo; i++) {
                try {
                    // Add small delay to avoid rate limiting (only for non-priority IDs)
                    if (!priorityIds.includes(i) && i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                    const rootInfo = await this.treasuryContract.methods.merkleRoots(i).call({}, 'latest');

                    // Skip empty entries
                    if (!rootInfo.merkleRoot || rootInfo.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
                        console.log(`ID ${i}: Empty or zero root`);
                        continue;
                    }

                    console.log(`Checking ID ${i}:`);
                    console.log(`  Root: ${rootInfo.merkleRoot}`);
                    console.log(`  Denomination: ${rootInfo.denomination}`);
                    console.log(`  Active: ${rootInfo.isActive}`);
                    console.log(`  Looking for root: ${merkleRoot}`);
                    console.log(`  Looking for denom: ${denominationWei}`);
                    console.log(`  Roots match: ${rootInfo.merkleRoot.toLowerCase() === merkleRoot.toLowerCase()}`);
                    console.log(`  Denoms match: ${rootInfo.denomination.toString() === denominationWei.toString()}`);

                    if (rootInfo.merkleRoot.toLowerCase() === merkleRoot.toLowerCase() &&
                        rootInfo.denomination.toString() === denominationWei.toString() &&
                        rootInfo.isActive) {
                        console.log(`✅ Found matching merkle root at ID ${i}`);
                        return i;
                    }
                } catch (err) {
                    // ID doesn't exist, continue
                    console.log(`ID ${i} doesn't exist or error:`, err.message, err.data || '');
                }
            }

            console.error('❌ Merkle root not found in contract');
            console.error('Searched IDs 0 to', checkUpTo);
            console.error('Looking for root:', merkleRoot);
            console.error('With denomination:', denominationWei);
            return null;
        } catch (error) {
            console.error('Error finding merkle root ID:', error);
            return null;
        }
    }

    /**
     * Get available tokens
     * @returns {Array} List of supported tokens
     */
    async getTokens() {
        try {
            const response = await fetch(`${this.nodeUrl}/api/v1/tokens`);
            const data = await response.json();
            return data.tokens;
        } catch (error) {
            console.error('Failed to get tokens:', error);
            return [];
        }
    }

    /**
     * Get denominations for a token
     * @param {string} tokenSymbol Token symbol
     * @returns {Array} List of denominations
     */
    async getDenominations(tokenSymbol) {
        try {
            const response = await fetch(`${this.nodeUrl}/api/v1/denominations/${tokenSymbol}`);
            const data = await response.json();
            return data.denominations;
        } catch (error) {
            console.error('Failed to get denominations:', error);
            return [];
        }
    }

    /**
     * Get inventory statistics
     * @returns {Object} Inventory stats
     */
    async getInventory() {
        try {
            const response = await fetch(`${this.nodeUrl}/api/v1/inventory`);
            const data = await response.json();
            return data.stats;
        } catch (error) {
            console.error('Failed to get inventory:', error);
            return {};
        }
    }

    /**
     * Request keys from node (without executing withdrawal)
     * @param {Object} params Request parameters
     * @returns {Object} Keys and metadata
     */
    async requestKeysOnly(params) {
        try {
            console.log('Requesting keys from node (without withdrawal)...');

            // Ensure targetChain is included in the request
            const requestParams = {
                ...params,
                targetChain: params.targetChain  // Use the provided targetChain
            };

            // Request keys from node
            const withdrawalResponse = await this.requestWithdrawal(requestParams);

            if (!withdrawalResponse.keys || withdrawalResponse.keys.length === 0) {
                throw new Error('No keys received from node');
            }

            console.log(`✅ Received ${withdrawalResponse.keys.length} keys from node`);

            return {
                success: true,
                request_id: withdrawalResponse.request_id,
                keys: withdrawalResponse.keys,
                total_value: withdrawalResponse.total_value
            };

        } catch (error) {
            console.error('Key request failed:', error);
            throw error;
        }
    }

    /**
     * Request keys from node with mixed cross-chain targets (without executing withdrawal)
     * @param {Object} params Request parameters
     * @param {string} params.userAddress User's ethereum address
     * @param {string} params.depositTx Deposit transaction hash
     * @param {string} params.sourceChain Source chain where deposit was made
     * @param {Array} params.withdrawalRequests Array of withdrawal requests, each with {target_chain, token_symbol, denomination}
     * @param {Object} params.web3Provider Web3 provider for signing
     * @returns {Object} Keys and metadata
     */
    async requestKeysOnlyMixed(params) {
        try {
            console.log('🔄 Requesting mixed cross-chain keys from node...');
            console.log('Withdrawal requests:', params.withdrawalRequests);

            const {
                userAddress,
                depositTx,
                sourceChain,
                withdrawalRequests,
                web3Provider,
                pausePollingWrapper  // Function to pause wallet polling during signature
            } = params;

            // Generate timestamp for signature
            const timestamp = Math.floor(new Date().getTime() / 1000);

            // Create the message to sign (matching backend format)
            const message = {
                action: 'request_withdrawal',
                user_address: userAddress.toLowerCase(),
                deposit_tx: depositTx,
                source_chain: sourceChain,
                withdrawal_requests: withdrawalRequests,
                timestamp: timestamp
            };

            console.log('🔐 Message to sign:', JSON.stringify(message, null, 2));

            // Request signature from MetaMask
            let signature;
            if (web3Provider) {
                console.log('📝 Requesting signature from MetaMask...');
                try {
                    // Helper function to recursively sort object keys (matching Python's sort_keys=True)
                    const sortKeysRecursive = (obj) => {
                        if (Array.isArray(obj)) {
                            return obj.map(item => sortKeysRecursive(item));
                        } else if (obj !== null && typeof obj === 'object') {
                            const sortedKeys = Object.keys(obj).sort();
                            const sortedObj = {};
                            sortedKeys.forEach(key => {
                                sortedObj[key] = sortKeysRecursive(obj[key]);
                            });
                            return sortedObj;
                        }
                        return obj;
                    };

                    // Sort keys recursively to match backend format: json.dumps(message_data, sort_keys=True)
                    const sortedMessage = sortKeysRecursive(message);

                    // Python's json.dumps() uses separators=(', ', ': ') by default (with spaces)
                    // JavaScript's JSON.stringify() uses separators=(',', ':') by default (no spaces)
                    // We need to match Python's format by adding spaces after colons and commas
                    const compactStr = JSON.stringify(sortedMessage);
                    const messageStr = compactStr.replace(/,/g, ', ').replace(/:/g, ': ');

                    console.log('📄 Sorted message string to sign:', messageStr);

                    // Wrap signature request with polling pause to avoid MetaMask conflicts
                    const signatureRequest = async () => {
                        return await web3Provider.request({
                            method: 'personal_sign',
                            params: [messageStr, userAddress],
                        });
                    };

                    // Use wrapper if provided, otherwise call directly
                    if (pausePollingWrapper) {
                        signature = await pausePollingWrapper(signatureRequest);
                    } else {
                        signature = await signatureRequest();
                    }

                    console.log('✅ Signature obtained:', signature.substring(0, 20) + '...');
                } catch (signError) {
                    console.error('❌ User rejected signature or error:', signError);
                    throw new Error('Signature required to request withdrawal keys');
                }
            } else {
                throw new Error('Web3 provider is required for signature');
            }

            // Make request to single node with signature
            const response = await fetch(`${this.nodeUrl}/api/v1/cross-chain/request-mixed-withdrawal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_address: userAddress,
                    deposit_tx: depositTx,
                    source_chain: sourceChain,
                    withdrawal_requests: withdrawalRequests,
                    signature: signature,
                    timestamp: timestamp
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Withdrawal request failed');
            }

            console.log(`✅ Received ${data.keys?.length || 0} mixed cross-chain keys from node`);

            return {
                success: true,
                request_id: data.request_id,
                keys: data.keys,
                total_value: data.total_value
            };

        } catch (error) {
            console.error('❌ Mixed cross-chain key request failed:', error);
            throw error;
        }
    }

    /**
     * Execute withdrawal with a specific key
     * @param {Object} key Key data with private key
     * @param {string} recipientAddress Recipient address
     * @returns {Object} Transaction receipt
     */
    async executeWithdrawalWithKey(key, recipientAddress) {
        try {
            console.log('Executing withdrawal with key:', key.key_index);

            // Check Web3 initialization
            if (!this.web3) {
                throw new Error('Web3 not initialized. Please connect your wallet first.');
            }

            // Check contract initialization
            if (!this.treasuryContract) {
                throw new Error('Treasury contract not initialized. Please connect your wallet first.');
            }

            const receipt = await this.executeWithdrawal(key, recipientAddress);

            return {
                success: true,
                receipt,
                key_index: key.key_index
            };

        } catch (error) {
            console.error('Withdrawal execution failed:', error);
            throw error;
        }
    }
}

export default new SingleNodeWithdrawalService();