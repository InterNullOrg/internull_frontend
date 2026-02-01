import { ethers } from 'ethers';
import MultiTokenTreasuryABI from '../contracts/MultiTokenTreasury.json';

// Backend URLs - V1 (pre-generated keys) and V2 (on-the-fly key derivation)
const BACKEND_URL_V1 = process.env.REACT_APP_API_URL || 'https://api.internull.xyz';
const BACKEND_URL_V2 = process.env.REACT_APP_API_URL_V2 || 'https://api-v2.internull.xyz';

class MultiTokenTreasuryService {
  constructor() {
    this.contractAddress = null;
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.supportedTokens = new Map();
    this.supportedChains = new Map();
    this.chainContractAddresses = new Map(); // Maps chainId -> treasury address
    this.backendVersion = 'v1';
    this.backendUrl = BACKEND_URL_V1;
    this.chainsLoaded = false;
  }

  /**
   * Set the backend version to use
   * @param {string} version 'v1' or 'v2'
   */
  setBackendVersion(version) {
    this.backendVersion = version;
    this.backendUrl = version === 'v2' ? BACKEND_URL_V2 : BACKEND_URL_V1;
    // Reset chains loaded flag so they can be reloaded from the new backend
    this.chainsLoaded = false;
    console.log(`🔄 MultiToken backend switched to ${version.toUpperCase()}: ${this.backendUrl}`);
  }

  /**
   * Get current backend version
   * @returns {string} 'v1' or 'v2'
   */
  getBackendVersion() {
    return this.backendVersion;
  }

  async initialize(provider, signer, contractAddress) {
    this.provider = provider;
    this.signer = signer;
    this.contractAddress = contractAddress; // Use the address passed from the component

    // Get current chain ID
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    // REMOVED the logic that was overwriting the contract address.
    // Now it will correctly use the one set from Purchase.js

    if (!this.contractAddress) {
      console.error("Contract address not provided for chainId:", chainId);
      throw new Error("Contract address not set for the current network.");
    }

    this.contract = new ethers.Contract(
      this.contractAddress,
      MultiTokenTreasuryABI.abi,
      this.signer || this.provider
    );

    // Load supported tokens
    await this.loadSupportedTokens();

    console.log('MultiTokenTreasury initialized at:', this.contractAddress);
    return this.contract;
  }

  async loadSupportedTokens() {
    try {
      // Get current chain ID
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;

      // 1. Try to load from backend first
      if (!this.chainsLoaded) {
        await this.loadChainsFromBackend();
      }

      // 2. Check if we have backend data for this chain
      if (this.chainsLoaded && this.supportedChains.has(chainId)) {
        const chainInfo = this.supportedChains.get(chainId);
        console.log(`✅ Using backend data for chain ${chainId} (${chainInfo.name})`);

        // If we have tokens from backend, return them
        // loadTokensFromBackend already populates this.supportedTokens map
        if (chainInfo.tokens && chainInfo.tokens.length > 0) {
          console.log(`Loaded ${chainInfo.tokens.length} tokens from backend for current chain`);
          return chainInfo.tokens;
        }

        console.warn(`⚠️ Chain ${chainId} found in backend but no tokens listed.`);
        return [];
      }

      console.warn(`⚠️ Chain ${chainId} not found in backend data.`);
      return [];
    } catch (error) {
      console.error('Error loading supported tokens:', error);
      return [];
    }
  }

  async getSupportedTokens(chainId) {
    // Load chains from backend if not already loaded
    if (!this.chainsLoaded) {
      await this.loadChainsFromBackend();
    }

    console.log(`🔍 getSupportedTokens called with chainId:`, chainId, typeof chainId);
    console.log(`🔍 Available chains in map:`, Array.from(this.supportedChains.keys()));

    // Get tokens for specific chain from backend data
    if (chainId !== undefined && chainId !== null && chainId !== '') {
      const chainInfo = this.supportedChains.get(chainId);
      console.log(`🔍 Chain info for ${chainId}:`, chainInfo);

      if (chainInfo && chainInfo.tokens && chainInfo.tokens.length > 0) {
        console.log(`✅ Returning ${chainInfo.tokens.length} tokens from backend for chain ${chainId}:`,
          chainInfo.tokens.map(t => `${t.symbol} (${t.address})`));
        return chainInfo.tokens;
      }

      // Fallback to old method if backend data not available
      console.warn(`⚠️ No tokens found in backend for chain ${chainId}, using fallback`);
      if (this.supportedTokens.size === 0) {
        await this.loadSupportedTokens();
      }
      const filtered = Array.from(this.supportedTokens.values())
        .filter(token => token.chainId === chainId);
      console.log(`⚠️ Fallback returned ${filtered.length} tokens`);
      return filtered;
    }

    // If no chainId specified, return empty array (don't mix tokens from different chains!)
    console.warn(`⚠️ getSupportedTokens called without chainId - returning empty array`);
    return [];
  }

  async getTokenInfo(tokenAddress) {
    // Get current chain ID
    const network = await this.provider.getNetwork();
    const chainId = network.chainId;

    // Try composite key first (chainId:address)
    const compositeKey = `${chainId}:${tokenAddress}`;
    let token = this.supportedTokens.get(compositeKey);

    // Fallback: try just the address (for backward compatibility)
    if (!token) {
      token = this.supportedTokens.get(tokenAddress);
    }

    // If still not found and chains are loaded, search in chain tokens
    if (!token && this.chainsLoaded) {
      const chainInfo = this.supportedChains.get(chainId);
      if (chainInfo && chainInfo.tokens) {
        token = chainInfo.tokens.find(t => t.address === tokenAddress);
        if (token) {
          // Cache it with composite key for future lookups
          this.supportedTokens.set(compositeKey, token);
        }
      }
    }

    return token;
  }

  async deposit(tokenAddress, amount) {
    if (!this.contract || !this.signer) {
      throw new Error('Service not initialized with signer');
    }

    // Get token info using the getTokenInfo method which searches both Map and chain tokens
    let token = await this.getTokenInfo(tokenAddress);

    // For localhost, always support ETH even if not in the map
    if (!token && tokenAddress === '0x0000000000000000000000000000000000000000') {
      // Default ETH token for localhost
      token = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        denominations: [0.001, 0.01, 0.1, 0.5, 1.0]
      };
      this.supportedTokens.set(tokenAddress, token);
    }

    if (!token) {
      console.error('❌ Token not found in supportedTokens Map:', tokenAddress);
      console.error('Available tokens:', Array.from(this.supportedTokens.keys()));
      throw new Error('Token not supported');
    }

    console.log('✅ Using token for deposit:', token);

    // Convert amount to proper decimals
    const amountWei = ethers.utils.parseUnits(amount.toString(), token.decimals);

    try {
      let tx;

      if (token.isNative) {
        // For native token (ETH/POL/BNB), send value with transaction
        console.log(`Depositing ${amount} ${token.symbol} to MultiTokenTreasury...`);

        // Let ethers.js and MetaMask handle ALL gas parameters (like withdrawals)
        const overrides = {
          value: amountWei
        };

        console.log('🚀 Sending transaction with overrides:', {
          value: overrides.value.toString()
        });

        tx = await this.contract.deposit(tokenAddress, amountWei, overrides);
      } else {
        // For ERC20 tokens, need to approve first
        console.log(`Depositing ${amount} ${token.symbol} to MultiTokenTreasury...`);

        // Get ERC20 contract
        const erc20ABI = [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ];
        const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, this.signer);

        // Check current allowance
        const currentAllowance = await tokenContract.allowance(
          await this.signer.getAddress(),
          this.contractAddress
        );

        // Approve if needed
        if (currentAllowance.lt(amountWei)) {
          console.log('Approving token spend...');
          const approveTx = await tokenContract.approve(this.contractAddress, amountWei);
          await approveTx.wait();
          console.log('Token spend approved');
        }


        // Let ethers.js and MetaMask handle ALL gas parameters (like withdrawals)
        console.log('🚀 Sending ERC20 deposit');

        // Now deposit
        tx = await this.contract.deposit(tokenAddress, amountWei);
      }

      console.log('Deposit transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Deposit confirmed:', receipt.transactionHash);

      return {
        success: true,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Deposit error:', error);
      throw error;
    }
  }

  async withdraw(tokenAddress, recipient, amount, merkleRootId, signature, merkleProof, keyIndex) {
    if (!this.contract || !this.signer) {
      throw new Error('Service not initialized with signer');
    }

    const token = this.supportedTokens.get(tokenAddress);
    if (!token) {
      throw new Error('Token not supported');
    }

    const amountWei = ethers.utils.parseUnits(amount.toString(), token.decimals);

    try {
      console.log(`Withdrawing ${amount} ${token.symbol} from MultiTokenTreasury...`);

      const tx = await this.contract.withdraw(
        tokenAddress,
        recipient,
        amountWei,
        merkleRootId,
        signature,
        merkleProof,
        keyIndex,
        { gasLimit: 300000 }
      );

      console.log('Withdrawal transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Withdrawal confirmed:', receipt.transactionHash);

      return {
        success: true,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Withdrawal error:', error);
      throw error;
    }
  }

  async getUserBalance(userAddress, tokenAddress) {
    if (!this.contract) {
      throw new Error('Service not initialized');
    }

    try {
      const balance = await this.contract.userBalances(userAddress, tokenAddress);
      const token = this.supportedTokens.get(tokenAddress);

      if (token) {
        return ethers.utils.formatUnits(balance, token.decimals);
      }

      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error getting user balance:', error);
      return '0';
    }
  }

  async getTreasuryBalance(tokenAddress) {
    if (!this.provider) {
      throw new Error('Service not initialized');
    }

    try {
      const token = this.supportedTokens.get(tokenAddress);

      if (token && token.isNative) {
        // Get ETH balance
        const balance = await this.provider.getBalance(this.contractAddress);
        return ethers.utils.formatEther(balance);
      } else if (token) {
        // Get ERC20 balance
        const erc20ABI = ['function balanceOf(address) view returns (uint256)'];
        const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, this.provider);
        const balance = await tokenContract.balanceOf(this.contractAddress);
        return ethers.utils.formatUnits(balance, token.decimals);
      }

      return '0';
    } catch (error) {
      console.error('Error getting treasury balance:', error);
      return '0';
    }
  }

  async checkKeyAvailability(tokenAddress, denomination) {
    // This would connect to the backend API to check key availability
    // For now, return mock data
    try {
      const response = await fetch(`${this.backendUrl}/api/v1/keys/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenAddress,
          denomination: denomination,
          chain_id: (await this.provider.getNetwork()).chainId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check availability');
      }

      return await response.json();
    } catch (error) {
      console.warn('Backend not available, using mock data');
      // Return mock availability
      return {
        available: true,
        count: Math.floor(Math.random() * 10) + 5,
        denomination: denomination
      };
    }
  }

  async requestCrossChainKeys(depositTx, sourceChain, targetChain, tokenSymbol, denominations) {
    // Request keys for cross-chain withdrawal
    try {
      const response = await fetch(`${this.backendUrl}/api/v1/cross-chain/request-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deposit_tx: depositTx,
          source_chain: sourceChain,
          target_chain: targetChain,
          token_symbol: tokenSymbol,
          requested_denominations: denominations
        })
      });

      if (!response.ok) {
        throw new Error('Failed to request cross-chain keys');
      }

      return await response.json();
    } catch (error) {
      console.error('Error requesting cross-chain keys:', error);
      throw error;
    }
  }

  async loadChainsFromBackend() {
    try {
      const response = await fetch(`${this.backendUrl}/api/v1/cross-chain/chains`);
      const data = await response.json();

      if (data.success && data.chains) {
        // Clear existing chains
        this.supportedChains.clear();
        this.chainContractAddresses.clear();

        // Load chains from backend
        data.chains.forEach(chain => {
          this.supportedChains.set(chain.chain_id, {
            name: chain.name || chain.chain_name,
            chainName: chain.chain_name,
            chainType: chain.chain_type || 'evm', // Store chain type (evm or solana)
            rpcUrl: '', // RPC URL not exposed to frontend for security
            treasuryAddress: chain.treasury_address,
            blockExplorer: chain.block_explorer,
            nativeCurrency: chain.native_currency || 'ETH',
            supportedTokens: chain.supported_tokens || [],
            tokens: [] // Will be populated by loadTokensFromBackend
          });

          // Store contract address mapping
          if (chain.treasury_address) {
            this.chainContractAddresses.set(chain.chain_id, chain.treasury_address);
          }
        });

        // Load token details for all chains
        await this.loadTokensFromBackend();

        this.chainsLoaded = true;
        console.log(`✅ Loaded ${data.chains.length} chains from backend`);
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to load chains from backend:', error);
      // Fallback to default chains for localhost and sepolia
      this._loadFallbackChains();
    }
    return false;
  }

  async loadTokensFromBackend() {
    try {
      // Clear existing tokens
      this.supportedTokens.clear();

      console.log(`🔄 Loading tokens from backend for ${this.supportedChains.size} chains...`);

      // Fetch token details for each chain from the database
      for (const [chainId, chainInfo] of this.supportedChains.entries()) {
        try {
          console.log(`🔄 Fetching tokens for chain: ${chainInfo.chainName} (ID: ${chainId})`);
          const tokensResponse = await fetch(`${this.backendUrl}/api/v1/cross-chain/chain-tokens/${chainInfo.chainName}`);
          const tokensData = await tokensResponse.json();

          console.log(`📥 Backend response for ${chainInfo.chainName}:`, tokensData);

          if (tokensData.success && tokensData.tokens) {
            chainInfo.tokens = tokensData.tokens.map(token => {
              const tokenInfo = {
                address: token.token_address,
                symbol: token.token_symbol,
                name: token.name,
                decimals: token.decimals,
                chainId: chainId, // Use the chainId from the Map, not from the token data
                isNative: token.token_address === '0x0000000000000000000000000000000000000000' ||
                  token.token_address === '11111111111111111111111111111111', // Also check for Solana System Program
                denominations: token.supported_denominations || []
              };

              console.log(`  ✅ Loaded token ${token.token_symbol} for chain ${chainId} (${chainInfo.chainName})`);

              // Also store in supportedTokens Map for deposit/withdraw operations
              // Use a composite key to avoid conflicts between chains
              const compositeKey = `${chainId}:${token.token_address}`;
              this.supportedTokens.set(compositeKey, tokenInfo);

              return tokenInfo;
            });
            console.log(`✅ Loaded ${chainInfo.tokens.length} tokens for chain ${chainInfo.chainName} (ID: ${chainId})`);
          } else {
            console.warn(`⚠️ No tokens returned for chain ${chainInfo.chainName}`);
          }
        } catch (error) {
          console.error(`❌ Failed to load tokens for chain ${chainInfo.chainName}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load tokens from backend:', error);
    }
  }

  _loadFallbackChains() {
    console.log('⚠️ Using fallback chain configuration');
    this.supportedChains.set(31337, {
      name: 'Localhost',
      chainName: 'localhost',
      rpcUrl: 'http://localhost:8545',
      treasuryAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockExplorer: '',
      nativeCurrency: 'ETH'
    });
    this.supportedChains.set(11155111, {
      name: 'Sepolia Testnet',
      chainName: 'sepolia',
      rpcUrl: 'https://eth-sepolia.public.blastapi.io',
      treasuryAddress: '0x8F2cF7140bE26f2d9D56F06b8CC5081f89E7Cc38',
      blockExplorer: 'https://sepolia.etherscan.io',
      nativeCurrency: 'ETH'
    });
    this.chainContractAddresses.set(31337, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    this.chainContractAddresses.set(11155111, '0x8F2cF7140bE26f2d9D56F06b8CC5081f89E7Cc38');
  }

  async getSupportedChains() {
    // Load chains from backend if not already loaded
    if (!this.chainsLoaded) {
      await this.loadChainsFromBackend();
    }

    return Array.from(this.supportedChains.entries()).map(([id, info]) => ({
      chainId: id,
      name: info.name,
      chainName: info.chainName,
      chainType: info.chainType || 'evm', // Include chain type
      treasuryAddress: info.treasuryAddress,
      blockExplorer: info.blockExplorer,
      nativeCurrency: info.nativeCurrency
    }));
  }

  getContractAddressForChain(chainId) {
    return this.chainContractAddresses.get(chainId);
  }

  async switchChain(chainId) {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    const chainHex = '0x' + chainId.toString(16);

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainHex }]
      });

      // Reinitialize contract with new provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      await this.initialize(provider, signer);

      return true;
    } catch (error) {
      // Chain not added to MetaMask
      if (error.code === 4902) {
        const chainInfo = this.supportedChains.get(chainId);
        if (chainInfo) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainHex,
              chainName: chainInfo.name,
              rpcUrls: [chainInfo.rpcUrl],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              }
            }]
          });
          return true;
        }
      }
      throw error;
    }
  }
}

export default new MultiTokenTreasuryService();