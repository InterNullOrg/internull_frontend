import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Stack,
  Collapse,
  Menu,
  Divider
} from '@mui/material';
import {
  AccountBalanceWallet,
  GetApp,
  Refresh,
  Download,
  Upload,
  Add,
  Remove,
  ExpandMore,
  ExpandLess,
  KeyboardArrowDown
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';

import { useWallet } from '../hooks/useWallet';
import { useWallet as useSolWallet, useConnection } from '@solana/wallet-adapter-react';
import depositTracker from '../services/depositTracker';
import singleNodeWithdrawal from '../services/singleNodeWithdrawal';
import { WithdrawalServiceECDSA } from '../services/withdrawalServiceECDSA';
import metaMaskOptimizedServiceECDSA from '../services/metaMaskOptimizedECDSA';
import multiTokenTreasuryService from '../services/multiTokenTreasuryService';
import solanaInternullService from '../services/solanaInternullService';
import KeyEncryptionService from '../utils/keyEncryption';
import { prepareKeysForDownload } from '../utils/downloadHelper';
import { processUploadedKeys } from '../utils/uploadHelper';
import PasswordDialog from '../components/PasswordDialog';

// Backend URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Create instance of ECDSA withdrawal service
const withdrawalService = new WithdrawalServiceECDSA();

const Dashboard = () => {
  const { connected, account, provider, signer, walletType, executeWithPausedPolling, disconnect } = useWallet();
  const solanaWallet = useSolWallet();
  const { publicKey: solanaPublicKey, connected: solanaConnected, signTransaction, disconnect: disconnectSolana } = solanaWallet;
  const { connection: solanaConnection } = useConnection();
  const [deposits, setDeposits] = useState([]);
  const [stats, setStats] = useState({
    depositsByToken: {},
    withdrawalsByToken: {},
    availableByToken: {},
    availableKeys: 0,
    totalDeposited: 0,
    totalWithdrawn: 0
  });
  const [keyRequestDialog, setKeyRequestDialog] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [requestedDenominations, setRequestedDenominations] = useState('');
  const [denominationRequests, setDenominationRequests] = useState([{ denomination: '', chain: 'sepolia', token: 'ETH' }]);
  const [loading, setLoading] = useState(false);
  const [keyRequestLoading, setKeyRequestLoading] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [withdrawDeposit, setWithdrawDeposit] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [selectedKeyIndex, setSelectedKeyIndex] = useState(null);
  const [availableKeys, setAvailableKeys] = useState([]);
  const [nodeHealth, setNodeHealth] = useState(null);
  const [sourceChain, setSourceChain] = useState('sepolia'); // Chain where deposit was made
  const [targetChain, setTargetChain] = useState('sepolia'); // Chain where keys will be used
  const [supportedChains, setSupportedChains] = useState([]); // Chains loaded from backend
  const [availableTokens, setAvailableTokens] = useState([]); // Available tokens for the source chain

  // Key download/upload states
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordDialogMode, setPasswordDialogMode] = useState(''); // 'download' or 'upload'
  const [downloadKeyIndex, setDownloadKeyIndex] = useState(null); // null for all keys, number for specific key

  // Error dialog state
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorDetails, setErrorDetails] = useState({
    title: '',
    message: '',
    errorType: '',
    technicalDetails: ''
  });
  const fileInputRef = useRef(null);

  // Collapsible state for withdraw dialog
  const [expandedChains, setExpandedChains] = useState({});
  const [expandedTokens, setExpandedTokens] = useState({});

  useEffect(() => {
    if ((connected && account) || (solanaConnected && solanaPublicKey)) {
      // Log wallet changes for debugging
      if (account) {
        console.log('🔄 EVM wallet changed/connected:', account);
      }
      if (solanaPublicKey) {
        console.log('🔄 Solana wallet changed/connected:', solanaPublicKey.toString());
      }

      // Clear previous wallet's data when switching
      setDeposits([]);
      setSelectedDeposit(null);
      setWithdrawDeposit(null);
      setAvailableKeys([]);

      // Load chains first, then deposits (so verification can use chain info)
      const initializeData = async () => {
        await loadSupportedChains(); // Load chains from backend first
        await loadUserDeposits(); // Then load and verify deposits
      };

      initializeData();
      checkNodeHealth(); // Check node health on load

      // Initialize singleNodeWithdrawal service with Web3 provider
      if (provider) {
        console.log('Initializing singleNodeWithdrawal with provider:', provider);
        singleNodeWithdrawal.initialize(provider.provider || provider)
          .then(() => console.log('✅ singleNodeWithdrawal initialized'))
          .catch(err => console.error('❌ Failed to initialize singleNodeWithdrawal:', err));
      }
    } else {
      // No wallet connected - clear all data
      console.log('🔄 No wallet connected - clearing dashboard data');
      setDeposits([]);
      setSelectedDeposit(null);
      setWithdrawDeposit(null);
      setAvailableKeys([]);
    }
  }, [connected, account, provider, solanaConnected, solanaPublicKey]);

  // Verify on-chain status of keys when deposits are loaded
  useEffect(() => {
    // PERFORMANCE OPTIMIZATION: Removed automatic on-chain verification as per user request
    // We now rely on local history to mark keys as used.
    // verifyAllKeysOnChain() can still be called manually if needed (e.g. via Refresh button)
    /*
    // Only verify if we have deposits and a provider
    if (deposits.length > 0 && provider && (account || solanaPublicKey)) {
      // Add a small delay to avoid blocking the UI
      const timeoutId = setTimeout(() => {
        verifyAllKeysOnChain();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
    */
  }, [deposits.length, provider, account, solanaPublicKey]); // Re-run when these change

  const checkNodeHealth = async () => {
    console.log('Checking single node health...');
    // For single node, just check if the API is accessible
    try {
      const response = await fetch(`${API_URL}/api/v1/health`);
      const health = {
        allHealthy: response.ok,
        allHaveSessions: true, // Single node doesn't need session management
        nodes: [{ healthy: response.ok, hasSession: true }],
        healthyCount: response.ok ? 1 : 0
      };
      console.log('Node health result:', health);
      setNodeHealth(health);
    } catch (error) {
      console.warn('Single node is not accessible:', error);
      setNodeHealth({
        allHealthy: false,
        allHaveSessions: false,
        nodes: [{ healthy: false, hasSession: false }],
        healthyCount: 0
      });
    }
  };

  const loadSupportedChains = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/cross-chain/chains`);
      const data = await response.json();

      if (data.success && data.chains) {
        console.log('✅ Loaded chains from backend:', data.chains);
        setSupportedChains(data.chains);

        // Set default source and target chains if available
        if (data.chains.length > 0) {
          // Try to find sepolia or localhost as default
          const sepoliaChain = data.chains.find(c => c.chain_name === 'sepolia');
          const localhostChain = data.chains.find(c => c.chain_name === 'localhost');
          const defaultChain = sepoliaChain || localhostChain || data.chains[0];

          setSourceChain(defaultChain.chain_name);
          setTargetChain(defaultChain.chain_name);
        }
      }
    } catch (error) {
      console.error('Failed to load supported chains:', error);
      // Fallback to default chains
      setSupportedChains([
        { chain_name: 'localhost', name: 'Localhost', chain_id: 31337, native_currency: 'ETH' },
        { chain_name: 'sepolia', name: 'Sepolia Testnet', chain_id: 11155111, native_currency: 'ETH' }
      ]);
    }
  };

  // Helper functions for chain and token logos
  // Helper to map chain ID to chain name - uses backend data (no hardcoding!)
  const getChainNameFromId = (chainId) => {
    // Look up chain name from backend-provided supportedChains
    const chain = supportedChains.find(c => c.chain_id === chainId || c.chainId === chainId);
    return chain ? (chain.chain_name || chain.chainName) : null;
  };

  // Helper to get display name for chain (prioritizes backend data)
  const getChainDisplayName = (chainName) => {
    if (!chainName) return 'Unknown Chain';

    // First, try to get display name from backend supportedChains
    const chain = supportedChains.find(c => c.chain_name === chainName || c.name === chainName);
    if (chain) {
      return chain.name || chain.chain_name || chainName;
    }

    // Fallback to manual mapping only if not found in backend
    const displayNames = {
      'ethereum': 'Ethereum Mainnet',
      'sepolia': 'Ethereum Sepolia',
      'polygon': 'Polygon',
      'polygon-amoy': 'Polygon Amoy',
      'bsc': 'BNB Chain',
      'bsc-testnet': 'BNB Testnet',
      'base-sepolia': 'Base Sepolia',
      'base': 'Base',
      'hyperliquid': 'Hyperliquid',
      'solana-devnet': 'Solana Devnet',
      'solana': 'Solana',
    };

    return displayNames[chainName] || chainName;
  };

  const getChainLogo = (chainName) => {
    if (!chainName) return null;
    const name = chainName.toLowerCase();

    if (name.includes('base')) {
      return '/logos/base.png';
    } else if (name.includes('sepolia') || name.includes('ethereum')) {
      return '/logos/ethereum.png';
    } else if (name.includes('polygon') || name.includes('amoy') || name.includes('mumbai')) {
      return '/logos/polygon.png';
    } else if (name.includes('bnb') || name.includes('bsc')) {
      return '/logos/bnb.png';
    } else if (name.includes('hyperliquid')) {
      return '/logos/hyperliquid.png';
    } else if (name.includes('solana')) {
      return '/logos/solana.png';
    }
    return null;
  };

  const getTokenLogo = (tokenSymbol) => {
    if (!tokenSymbol) return null;
    const symbol = tokenSymbol.toUpperCase();

    // Map token symbols to their logos
    const tokenLogos = {
      // Native tokens - use chain logos
      'ETH': '/logos/ethereum.png',
      'MATIC': '/logos/polygon.png',
      'BNB': '/logos/bnb.png',
      'tBNB': '/logos/bnb.png',
      'SOL': '/logos/solana.png',
      'HYPE': '/logos/hyperliquid.png',

      // ERC20/SPL tokens - use CoinMarketCap URLs
      'USDC': 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
      'LINK': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png',
      'USDT': 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
    };

    return tokenLogos[symbol] || null;
  };

  // Toggle functions for collapsible sections
  const toggleChain = (chainName) => {
    setExpandedChains(prev => ({
      ...prev,
      [chainName]: !prev[chainName]
    }));
  };

  const toggleToken = (chainName, tokenSymbol) => {
    const key = `withdraw-${chainName}-${tokenSymbol}`;
    setExpandedTokens(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const loadUserDeposits = async () => {
    try {
      setLoading(true);

      // Load deposits from both EVM and Solana wallets
      let allDeposits = [];

      // Load EVM deposits if connected
      if (account) {
        const evmDeposits = depositTracker.getUserDeposits(account);
        allDeposits = [...evmDeposits];
        console.log(`📊 Loaded ${evmDeposits.length} EVM deposits for ${account}`);
      }

      // Load Solana deposits if connected
      if (solanaPublicKey) {
        const solanaAddress = solanaPublicKey.toString();
        const solanaDeposits = depositTracker.getUserDeposits(solanaAddress);
        allDeposits = [...allDeposits, ...solanaDeposits];
        console.log(`📊 Loaded ${solanaDeposits.length} Solana deposits for ${solanaAddress}`);
      }

      const userDeposits = allDeposits;

      // Migration: Fix old deposits missing metadata by inferring from chainId
      for (const deposit of userDeposits) {
        if (!deposit.metadata || !deposit.metadata.token) {
          console.log('🔧 Migrating old deposit to add token metadata:', deposit.txHash);

          // Infer token from chainId
          let token = 'ETH';
          let tokenAddress = '0x0000000000000000000000000000000000000000';

          if (deposit.chainId === 97) {
            // BNB Testnet
            token = 'tBNB';
          } else if (deposit.chainId === 56) {
            // BNB Mainnet
            token = 'BNB';
          }
          // Add more chain mappings as needed

          depositTracker.updateDepositStatus(deposit.txHash, deposit.status, {
            metadata: {
              token: token,
              tokenAddress: tokenAddress,
              crossChain: deposit.metadata?.crossChain || false,
              targetChain: deposit.metadata?.targetChain || deposit.chainId
            }
          });
        }
      }

      // Reload deposits after migration
      let updatedDeposits = [];
      if (account) {
        updatedDeposits = [...updatedDeposits, ...depositTracker.getUserDeposits(account)];
      }
      if (solanaPublicKey) {
        updatedDeposits = [...updatedDeposits, ...depositTracker.getUserDeposits(solanaPublicKey.toString())];
      }

      // PERFORMANCE OPTIMIZATION: Removed automatic RPC verification on page load
      // Key status is now verified on-demand when user clicks "Withdraw" button
      // This prevents hitting RPC for every deposit on page load, improving load time
      // Keys are verified in handleWithdraw() function before withdrawal dialog opens

      setDeposits(updatedDeposits);

      // Calculate stats grouped by token
      const depositsByToken = {};
      const withdrawalsByToken = {};
      const availableByToken = {}; // Available amounts (not key counts)

      updatedDeposits
        .filter(d => d.status !== 'failed')
        .forEach(deposit => {
          // Get token from deposit metadata or first key
          const token = deposit.metadata?.token ||
            deposit.keys?.[0]?.token_symbol ||
            'ETH';

          // Track deposits
          if (!depositsByToken[token]) {
            depositsByToken[token] = 0;
          }
          depositsByToken[token] += deposit.amount || 0;

          // Track available amounts by token (sum of unused key denominations)
          if (deposit.status === 'keys_received' && deposit.keys) {
            deposit.keys.forEach(key => {
              const keyToken = key.token_symbol || token;
              if (!key.isUsed) {
                if (!availableByToken[keyToken]) {
                  availableByToken[keyToken] = 0;
                }
                // Add the key's denomination value, not just count
                availableByToken[keyToken] += parseFloat(key.denomination) || 0;
              }
            });
          }

          // Track withdrawals and mark keys as used based on LOCAL history
          if (deposit.withdrawals && deposit.withdrawals.length > 0) {
            deposit.withdrawals.forEach(withdrawal => {
              // Get key info for withdrawal
              const withdrawnKey = deposit.keys?.find(k =>
                k.keyIndex === withdrawal.keyIndex || k.key_index === withdrawal.keyIndex
              );

              // Mark key as used locally
              if (withdrawnKey) {
                withdrawnKey.isUsed = true;
                console.log(`📝 Key #${withdrawnKey.keyIndex} marked as used from local history`);
              }

              const withdrawnToken = withdrawnKey?.token_symbol || token;
              const withdrawnAmount = withdrawnKey?.denomination || 0;

              if (!withdrawalsByToken[withdrawnToken]) {
                withdrawalsByToken[withdrawnToken] = 0;
              }
              withdrawalsByToken[withdrawnToken] += parseFloat(withdrawnAmount) || 0;
            });
          }
        });

      const availableKeys = updatedDeposits
        .filter(d => d.status === 'keys_received')
        .length;

      setStats({
        depositsByToken,
        withdrawalsByToken,
        availableByToken, // Changed from keysByToken to availableByToken
        availableKeys,
        // Legacy fields for backward compatibility
        totalDeposited: Object.values(depositsByToken).reduce((sum, val) => sum + val, 0),
        totalWithdrawn: Object.values(withdrawalsByToken).reduce((sum, val) => sum + val, 0)
      });

      // Check confirmations for pending deposits
      for (const deposit of updatedDeposits) {
        if (deposit.status === 'pending') {
          try {
            // Determine if this is a Solana or EVM deposit by checking if the address matches Solana format
            // Solana addresses don't start with '0x' and are base58 encoded
            const isSolanaDeposit = !deposit.userAddress.startsWith('0x');

            if (isSolanaDeposit && solanaConnection) {
              console.log(`Checking Solana deposit confirmation: ${deposit.txHash}`);
              await depositTracker.checkSolanaDepositConfirmation(solanaConnection, deposit.txHash);
            } else if (!isSolanaDeposit && provider) {
              console.log(`Checking EVM deposit confirmation: ${deposit.txHash}`);
              await depositTracker.checkDepositConfirmation(provider, deposit.txHash);
            }
          } catch (error) {
            console.error('Error checking confirmation:', error);
          }
        }
      }

      // Reload to get updated statuses
      let finalDeposits = [];
      if (account) {
        finalDeposits = [...finalDeposits, ...depositTracker.getUserDeposits(account)];
      }
      if (solanaPublicKey) {
        finalDeposits = [...finalDeposits, ...depositTracker.getUserDeposits(solanaPublicKey.toString())];
      }
      setDeposits(finalDeposits);

    } catch (error) {
      console.error('Error loading deposits:', error);
      toast.error('Failed to load deposits');
    } finally {
      setLoading(false);
    }
  };

  // Verify on-chain status of all keys to detect withdrawals made by ANY wallet
  const verifyAllKeysOnChain = async () => {
    if (!provider || !deposits || deposits.length === 0) {
      return;
    }

    try {
      console.log('🔍 Verifying on-chain status for all keys...');

      const depositsWithKeys = deposits.filter(d =>
        d.status === 'keys_received' &&
        d.keys &&
        d.keys.length > 0 &&
        d.keys[0].chain_type !== 'solana' // Only verify EVM keys (Solana verification TBD)
      );

      if (depositsWithKeys.length === 0) {
        console.log('   No EVM deposits with keys to verify');
        return;
      }

      let totalUpdated = 0;

      for (const deposit of depositsWithKeys) {
        try {
          const treasuryAddress = deposit.keys[0].treasury_address;
          const merkleRootId = deposit.keys[0].merkleRootId || deposit.keys[0].merkle_root_id;

          if (!treasuryAddress || merkleRootId === undefined) {
            console.warn(`   Skipping deposit ${deposit.txHash}: missing treasury address or merkleRootId`);
            continue;
          }

          // Create contract instance
          const contract = new ethers.Contract(
            treasuryAddress,
            ['event WithdrawOTS(address indexed recipient, uint256 amount, address indexed token, uint256 indexed merkleRootId, uint256 keyIndex)'],
            provider
          );

          // Query withdrawal events for this merkleRootId (single RPC call for all keys in this deposit)
          const filter = contract.filters.WithdrawOTS(null, null, null, merkleRootId);
          const withdrawalEvents = await contract.queryFilter(filter);

          if (withdrawalEvents.length > 0) {
            // Build a set of used key indices
            const usedKeyIndices = new Set(
              withdrawalEvents.map(event => event.args.keyIndex.toNumber())
            );

            console.log(`   ✅ Found ${withdrawalEvents.length} withdrawals for merkleRootId ${merkleRootId}`);
            console.log(`      Used key indices:`, Array.from(usedKeyIndices));

            // Update keys' isUsed status
            deposit.keys = deposit.keys.map(key => {
              const wasUsed = key.isUsed;
              const isNowUsed = usedKeyIndices.has(key.keyIndex);

              if (!wasUsed && isNowUsed) {
                totalUpdated++;
                console.log(`      🔄 Marking key #${key.keyIndex} as used (detected on-chain)`);
              }

              return {
                ...key,
                isUsed: isNowUsed || wasUsed
              };
            });

            // Update deposit in localStorage to persist the change
            depositTracker.updateDepositStatus(deposit.txHash, deposit.status, {
              keys: deposit.keys,
              metadata: deposit.metadata
            });
          }
        } catch (error) {
          console.warn(`   ⚠️ Could not verify deposit ${deposit.txHash}:`, error.message);
        }
      }

      if (totalUpdated > 0) {
        console.log(`✅ Updated ${totalUpdated} keys based on on-chain status`);

        // Reload deposits from localStorage to get updated state
        let updatedDeposits = [];
        if (account) {
          updatedDeposits = [...updatedDeposits, ...depositTracker.getUserDeposits(account)];
        }
        if (solanaPublicKey) {
          updatedDeposits = [...updatedDeposits, ...depositTracker.getUserDeposits(solanaPublicKey.toString())];
        }
        setDeposits(updatedDeposits);
      } else {
        console.log('   No keys needed updating');
      }
    } catch (error) {
      console.error('Error verifying keys on-chain:', error);
      // Don't show error to user - this is a background verification
    }
  };

  const handleRequestKeys = async (deposit) => {
    setSelectedDeposit(deposit);
    setRequestedDenominations(deposit.amount.toString()); // Default to same amount

    console.log('🔍 Opening key request dialog for deposit:', deposit);
    console.log('   chainId:', deposit.chainId, 'TYPE:', typeof deposit.chainId);
    console.log('   metadata:', deposit.metadata);
    console.log('   supportedChains loaded:', supportedChains.length);
    console.log('   FULL DEPOSIT OBJECT:', JSON.stringify(deposit, null, 2));

    // Make sure chains are loaded before proceeding
    let chainsToUse = supportedChains;
    if (chainsToUse.length === 0) {
      console.log('⏳ Chains not loaded yet, fetching from backend...');
      try {
        const response = await fetch(`${API_URL}/api/v1/cross-chain/chains`);
        const data = await response.json();
        if (data.success && data.chains) {
          chainsToUse = data.chains;
          setSupportedChains(data.chains);
          console.log('✅ Loaded chains from backend:', data.chains.map(c => `${c.chain_name} (${c.chain_id})`));
        }
      } catch (error) {
        console.error('Failed to load chains:', error);
      }
    }

    // Determine if this is a Solana or EVM deposit
    const isSolanaDeposit = !deposit.userAddress.startsWith('0x');

    console.log('📝 handleRequestKey called with deposit:', {
      txHash: deposit.txHash,
      amount: deposit.amount,
      userAddress: deposit.userAddress,
      metadata: deposit.metadata,
      chainId: deposit.chainId
    });

    // Set source and target chains based on deposit
    let defaultSourceChain = 'sepolia';
    let defaultToken = 'ETH';

    if (isSolanaDeposit) {
      // Solana deposit
      defaultSourceChain = 'solana-devnet';

      // Get token from deposit metadata first
      defaultToken = deposit.metadata?.token || 'SOL';
      console.log('📦 Solana deposit token from metadata:', defaultToken);

      setSourceChain(defaultSourceChain);
      setTargetChain(defaultSourceChain);

      // Fetch available tokens for Solana
      try {
        const tokens = await solanaInternullService.getSupportedTokens();
        console.log('📦 Loaded Solana tokens:', tokens);
        setAvailableTokens(tokens);

        // Verify the deposit token is in the list
        if (tokens.length > 0) {
          const depositToken = tokens.find(t => t.symbol === defaultToken);
          if (!depositToken) {
            console.warn('⚠️ Deposit token', defaultToken, 'not found in available tokens, using first token');
            defaultToken = tokens[0].symbol;
          } else {
            console.log('✅ Found deposit token in available tokens:', defaultToken);
          }
        }
      } catch (error) {
        console.error('Failed to load Solana tokens:', error);
        // Fallback to the deposit's token
        setAvailableTokens([{ symbol: defaultToken, name: defaultToken, isNative: defaultToken === 'SOL' }]);
      }
    } else {
      // EVM deposit - Find the chain where deposit was made
      console.log('🔍 Looking for chain with chainId:', deposit.chainId);
      console.log('   Available chains:', chainsToUse.map(c => `${c.chain_name} (${c.chain_id})`));

      if (deposit.chainId && chainsToUse.length > 0) {
        // Try to find the chain by matching chain_id
        const depositChain = chainsToUse.find(c => {
          const matches = c.chain_id === deposit.chainId || c.chainId === deposit.chainId;
          if (matches) {
            console.log(`   ✅ MATCH! Chain ${c.chain_name}: chain_id=${c.chain_id}`);
          }
          return matches;
        });

        if (depositChain) {
          defaultSourceChain = depositChain.chain_name || depositChain.chainName;
          console.log('✅ Found deposit chain:', defaultSourceChain, 'for chainId:', deposit.chainId);
          setSourceChain(defaultSourceChain);
          setTargetChain(defaultSourceChain); // Default target to same as source
        } else {
          console.error('❌ Could not find chain for chainId:', deposit.chainId);
          console.log('   Searched in chains:', chainsToUse.map(c => ({ name: c.chain_name, id: c.chain_id })));
          // Don't set fallback - let user see the error
          setSourceChain('unknown');
          setTargetChain('sepolia');
          defaultSourceChain = 'unknown';
        }
      } else if (deposit.metadata?.targetChain) {
        // Fallback: use metadata if available
        defaultSourceChain = deposit.metadata.targetChain;
        setSourceChain(defaultSourceChain);
        setTargetChain(defaultSourceChain);
        console.log('⚠️ Using metadata targetChain as source:', defaultSourceChain);
      } else {
        // Last resort: Try to map common chain IDs manually if backend lookup failed
        const commonChains = {
          1: 'ethereum',
          11155111: 'sepolia',
          137: 'polygon',
          80002: 'polygon-amoy',
          56: 'bsc',
          97: 'bsc-testnet',
          8453: 'base',
          84532: 'base-sepolia',
          999: 'hyperliquid', // Example ID, adjust if known
          998: 'hyperliquid-testnet'
        };

        if (deposit.chainId && commonChains[deposit.chainId]) {
          defaultSourceChain = commonChains[deposit.chainId];
          setSourceChain(defaultSourceChain);
          setTargetChain(defaultSourceChain);
          console.log('⚠️ Using manual fallback for chainId:', deposit.chainId, '->', defaultSourceChain);
        } else {
          console.error('❌ No chainId or metadata found in deposit:', deposit);
          setSourceChain('unknown');
          setTargetChain('sepolia');
          defaultSourceChain = 'unknown';
        }
      }

      // Get token from deposit metadata
      defaultToken = deposit.metadata?.token || 'ETH';
      console.log('📦 Deposit token:', defaultToken);

      // Fetch available tokens for the deposit's chain
      try {
        const tokens = await multiTokenTreasuryService.getSupportedTokens(deposit.chainId);
        console.log('📦 Loaded EVM tokens for chain', deposit.chainId, ':', tokens);
        setAvailableTokens(tokens);

        // Verify the deposit token is in the list
        if (tokens.length > 0) {
          const depositToken = tokens.find(t => t.symbol === defaultToken);
          if (!depositToken) {
            console.warn('⚠️ Deposit token', defaultToken, 'not found in available tokens, using first token');
            defaultToken = tokens[0].symbol;
          }
        }
      } catch (error) {
        console.error('Failed to load EVM tokens:', error);
        // Fallback to the deposit's token
        setAvailableTokens([{ symbol: defaultToken, name: defaultToken }]);
      }
    }

    console.log('📝 Setting initial denomination request:', {
      denomination: '',
      chain: defaultSourceChain,
      token: defaultToken
    });

    // Initialize with one empty denomination request using the deposit's chain and token
    const initialRequest = { denomination: '', chain: defaultSourceChain, token: defaultToken };
    setDenominationRequests([initialRequest]);

    console.log('✅ Denomination requests initialized:', [initialRequest]);
    console.log('✅ Opening key request dialog for deposit tx:', deposit.txHash);

    setKeyRequestDialog(true);
  };

  // Helper functions for managing denomination requests
  const addDenominationRequest = () => {
    const lastRequest = denominationRequests[denominationRequests.length - 1];
    const defaultChain = lastRequest ? lastRequest.chain : (targetChain || 'sepolia');
    const defaultToken = lastRequest ? lastRequest.token : (selectedDeposit?.metadata?.token || 'ETH');
    setDenominationRequests([...denominationRequests, { denomination: '', chain: defaultChain, token: defaultToken }]);
  };

  const removeDenominationRequest = (index) => {
    if (denominationRequests.length > 1) {
      setDenominationRequests(denominationRequests.filter((_, i) => i !== index));
    }
  };

  const updateDenominationRequest = (index, field, value) => {
    const updated = [...denominationRequests];
    updated[index][field] = value;
    setDenominationRequests(updated);
  };

  const handleWithdraw = async (deposit, specificKeyIndex = null) => {
    console.log('🔑 handleWithdraw called for deposit:', {
      txHash: deposit.txHash,
      amount: deposit.amount,
      token: deposit.metadata?.token,
      requestId: deposit.requestId,
      keysCount: deposit.keys?.length || 0,
      specificKeyIndex: specificKeyIndex
    });

    if (!deposit.requestId) {
      toast.error('No request ID found for this deposit');
      return;
    }

    if (!deposit.keys && !deposit.keyshares) {
      toast.error('No keys found for this deposit');
      return;
    }

    setWithdrawDeposit(deposit);

    // Detect if these are Solana keys by checking the first key's chain
    const isSolanaKeys = deposit.keys && deposit.keys.length > 0 &&
      (deposit.keys[0].chain_name?.startsWith('solana') || deposit.keys[0].solana_address);

    // Set recipient address based on chain type
    if (isSolanaKeys && solanaPublicKey) {
      setRecipientAddress(solanaPublicKey.toString());
    } else if (account) {
      setRecipientAddress(account);
    }

    // Get available keys - handle both single-node keys and multi-node keyshares
    let keys = [];
    if (deposit.keys) {
      // Single-node system: Check blockchain for actual key status
      toast.info('Checking key status on blockchain...');

      const { checkMultipleKeys } = await import('../services/treasuryContractService');


      // Prepare key data for checking - include merkle root and denomination
      // IMPORTANT: Use tree_index for nullifier checking, not key_index!
      const keysToCheck = deposit.keys.map(key => {
        const checkData = {
          merkleRootId: key.merkle_root_id || key.merkleRootId || key.batchId || key.batch_id,
          merkleRoot: key.merkle_root || key.merkleRoot,
          denomination: key.denomination,
          keyIndex: key.tree_index !== undefined ? key.tree_index : key.treeIndex,  // Use tree_index for nullifier
          treasury_address: key.treasury_address || key.treasuryAddress // Pass treasury address
        };
        console.log(`Checking key ${key.key_index}: merkleRootId=${checkData.merkleRootId}, treeIndex=${checkData.keyIndex}, treasury=${checkData.treasury_address}`);
        return checkData;
      });

      // Check all keys against blockchain
      const checkResults = await checkMultipleKeys(provider, keysToCheck);

      // Map keys with blockchain status
      keys = deposit.keys.map((key, index) => {
        const result = checkResults[index];
        return {
          ...key,
          keyIndex: key.key_index,
          key_index: key.key_index,  // Keep original format
          tree_index: key.tree_index,  // IMPORTANT: Include tree_index for merkle proof verification
          merkle_root_id: key.merkle_root_id,  // IMPORTANT: Include merkle_root_id for nullifier checking
          merkleRootId: key.merkle_root_id,  // Also in camelCase
          denomination: key.denomination,
          denomination_wei: key.denomination_wei,  // Include denomination in wei
          merkleRoot: key.merkle_root,  // Map merkle_root to merkleRoot
          merkleProof: key.merkle_proof, // Map merkle_proof to merkleProof
          merkle_root: key.merkle_root,  // Keep original format too
          merkle_proof: key.merkle_proof, // Keep original format too
          private_key: key.private_key,  // Ensure private_key is included
          ethereum_address: key.ethereum_address,  // Ensure EVM address is included
          solana_address: key.solana_address,  // Ensure Solana address is included
          chain_name: key.chain_name || 'localhost',  // Include chain name
          chain_id: key.chain_id || 31337,  // Include chain ID
          treasury_address: key.treasury_address,  // Include treasury address for the target chain
          token_symbol: key.token_symbol || 'ETH',  // Include token symbol
          token_address: key.token_address || '0x0000000000000000000000000000000000000000',  // Include token address
          isUsed: result.success ? result.isUsed : false  // Use blockchain status
        };
      });
    } else if (deposit.keyshares) {
      // Multi-node system: reconstruct keys from keyshares
      keys = await withdrawalService.getAvailableKeys(deposit, provider);
    }

    // Check on-chain status for EVM keys by querying withdrawal events
    // This detects withdrawals made by ANY wallet, not just the current one
    if (provider && keys.length > 0 && keys[0].chain_type !== 'solana') {
      try {
        const treasuryAddress = keys[0].treasury_address;
        const merkleRootId = keys[0].merkleRootId || keys[0].merkle_root_id;

        if (treasuryAddress && merkleRootId !== undefined) {
          const contract = new ethers.Contract(
            treasuryAddress,
            ['event WithdrawOTS(address indexed recipient, uint256 amount, address indexed token, uint256 indexed merkleRootId, uint256 keyIndex)'],
            provider
          );

          // Query withdrawal events for this merkleRootId (single RPC call for all keys)
          const filter = contract.filters.WithdrawOTS(null, null, null, merkleRootId);
          const withdrawalEvents = await contract.queryFilter(filter);

          // Build a set of used key indices
          const usedKeyIndices = new Set(
            withdrawalEvents.map(event => event.args.keyIndex.toNumber())
          );

          // Mark keys as used if they appear in withdrawal events
          keys = keys.map(key => ({
            ...key,
            isUsed: usedKeyIndices.has(key.keyIndex) || key.isUsed
          }));

          console.log(`✅ Checked ${withdrawalEvents.length} withdrawal events for merkleRootId ${merkleRootId}`);
          if (usedKeyIndices.size > 0) {
            console.log(`   Used key indices (from ANY wallet):`, Array.from(usedKeyIndices));
          }
        }
      } catch (error) {
        console.warn('Could not query withdrawal events (falling back to local status):', error);
        // Continue with local isUsed flags as fallback
      }
    }

    // Filter out used keys
    const availableKeys = keys.filter(key => !key.isUsed);

    // If a specific key was requested, filter to only show that key
    let keysToShow = keys;
    if (specificKeyIndex !== null) {
      keysToShow = keys.filter(k => k.keyIndex === specificKeyIndex);
      console.log(`🔑 Filtering to show only key #${specificKeyIndex}:`, keysToShow);

      if (keysToShow.length === 0) {
        toast.error(`Key #${specificKeyIndex} not found`);
        setWithdrawDialog(false);
        return;
      }

      if (keysToShow[0].isUsed) {
        toast.warning(`Key #${specificKeyIndex} has already been used, but you can try again.`);
        // Do not return, allow proceeding
      }
    }

    console.log('🔑 Keys loaded for this deposit:', {
      totalKeys: keys.length,
      keysToShow: keysToShow.length,
      availableKeys: availableKeys.length,
      specificKeyIndex: specificKeyIndex,
      keys: keysToShow.map(k => ({
        keyIndex: k.keyIndex,
        denomination: k.denomination,
        token: k.token_symbol,
        chain: k.chain_name,
        isUsed: k.isUsed
      }))
    });

    if (availableKeys.length === 0) {
      toast.error('All keys for this deposit have already been used');
      setWithdrawDialog(false);
      return;
    }

    setAvailableKeys(keysToShow); // Set filtered keys or all keys
    // Select the specific key or first available key
    const keyToSelect = specificKeyIndex !== null ? specificKeyIndex : (availableKeys[0] ? availableKeys[0].keyIndex : null);
    setSelectedKeyIndex(keyToSelect);

    setWithdrawDialog(true);
  };

  /**
   * Parse and display withdrawal errors in a user-friendly dialog
   * @param {Error} error - The error object
   * @param {string} chainType - 'solana' or 'evm'
   */
  const handleWithdrawalError = (error, chainType = 'evm') => {
    console.error('Handling withdrawal error:', error);

    let errorType = 'UNKNOWN_ERROR';
    let title = 'Withdrawal Failed';
    let message = 'An unexpected error occurred during withdrawal.';
    let technicalDetails = error.message || '';

    // Parse formatted errors from services (format: "ERROR_TYPE:User message")
    if (error.message && error.message.includes(':')) {
      const [type, ...messageParts] = error.message.split(':');
      errorType = type;
      const userMessage = messageParts.join(':').trim();

      switch (errorType) {
        case 'KEY_ALREADY_USED':
          title = '⚠️ Key Already Used';
          message = userMessage;
          technicalDetails = 'This key has been used in a previous withdrawal transaction. For security reasons, each key can only be used once to prevent double-spending.';
          break;

        case 'MERKLE_ROOT_INACTIVE':
          title = '❌ Key Batch Inactive';
          message = userMessage;
          technicalDetails = 'The merkle root for this key batch has been deactivated. This usually happens when keys expire or are manually deactivated by administrators.';
          break;

        case 'INVALID_PROOF':
          title = '❌ Invalid Proof';
          message = userMessage;
          technicalDetails = 'The merkle proof verification failed. This could indicate a corrupted key or database inconsistency.';
          break;

        case 'INSUFFICIENT_FUNDS':
          title = '❌ Insufficient Treasury Funds';
          message = userMessage;
          technicalDetails = 'The smart contract treasury does not have enough balance to process this withdrawal.';
          break;

        case 'INVALID_SIGNATURE':
        case 'INVALID_PUBLIC_KEY':
          title = '❌ Invalid Cryptographic Data';
          message = userMessage;
          technicalDetails = 'The cryptographic signature or public key validation failed. This could indicate a corrupted private key.';
          break;

        case 'SYSTEM_PAUSED':
          title = '⏸️ System Paused';
          message = userMessage;
          technicalDetails = 'Withdrawals are temporarily paused for maintenance or security reasons.';
          break;

        case 'PROGRAM_ERROR':
        case 'TRANSACTION_FAILED':
          title = '❌ Transaction Failed';
          message = userMessage;
          break;

        default:
          // Unknown formatted error
          message = userMessage || error.message;
          break;
      }
    } else {
      // Handle EVM-specific errors
      if (chainType === 'evm') {
        if (error.message.includes('nullifier already used') || error.message.includes('Key already used')) {
          errorType = 'KEY_ALREADY_USED';
          title = '⚠️ Key Already Used';
          message = 'This withdrawal key has already been used. Each key can only be used once for security reasons. Please request a new key to make another withdrawal.';
          technicalDetails = error.message;
        } else if (error.message.includes('insufficient funds')) {
          errorType = 'INSUFFICIENT_FUNDS';
          title = '❌ Insufficient Treasury Funds';
          message = 'The smart contract treasury does not have enough balance to process this withdrawal.';
          technicalDetails = error.message;
        } else if (error.message.includes('invalid proof') || error.message.includes('MerkleProofInvalid')) {
          errorType = 'INVALID_PROOF';
          title = '❌ Invalid Merkle Proof';
          message = 'The merkle proof verification failed. This key may be invalid or corrupted.';
          technicalDetails = error.message;
        } else if (error.message.includes('execution reverted')) {
          title = '❌ Smart Contract Error';
          message = 'The smart contract rejected this transaction. This could be due to an invalid key, insufficient funds, or contract being paused.';
          technicalDetails = error.message;
        }
      }
    }

    // Show the error dialog (no toast - dialog is the primary notification)
    setErrorDetails({
      title,
      message,
      errorType,
      technicalDetails
    });
    setErrorDialog(true);
  };

  const executeWithdrawal = async () => {
    if (!withdrawDeposit) {
      toast.error('Missing required data for withdrawal');
      return;
    }

    // Detect if this is a Solana withdrawal
    const selectedKey = availableKeys.find(key => key.keyIndex === selectedKeyIndex);
    const isSolanaWithdrawal = selectedKey &&
      (selectedKey.chain_name?.startsWith('solana') || selectedKey.solana_address);

    // Validate based on chain type
    if (isSolanaWithdrawal) {
      // Solana validation
      if (!solanaPublicKey || !solanaConnected || !solanaConnection) {
        toast.error('Please connect your Phantom wallet for Solana withdrawals');
        return;
      }
      // Validate Solana address (basic check - should not start with 0x)
      if (!recipientAddress || recipientAddress.startsWith('0x')) {
        toast.error('Please enter a valid Solana address');
        return;
      }
    } else {
      // EVM validation
      if (!provider || !signer) {
        toast.error('Please connect your MetaMask wallet for EVM withdrawals');
        return;
      }
      // Validate EVM address
      if (!recipientAddress || !ethers.utils.isAddress(recipientAddress)) {
        toast.error('Please enter a valid EVM address');
        return;
      }
    }

    // For all withdrawals with existing keys, we skip node health check
    // If we have keyshares, we don't need to contact the nodes

    // Validate key selection
    if (selectedKeyIndex === null) {
      toast.error('Please select a key to withdraw');
      return;
    }

    // Get the selected key details (already declared above)
    if (!selectedKey) {
      toast.error('Selected key not found');
      return;
    }

    // Check if the selected key is already used
    if (selectedKey.isUsed) {
      toast.warning('Selected key has already been used. Proceeding anyway as requested.');
      // Do not return, allow proceeding
    }

    try {
      setWithdrawing(true);

      let result;

      // Variables to hold the provider and signer to use for withdrawal (EVM only)
      let withdrawalProvider = provider;
      let withdrawalSigner = signer;

      // Handle Solana withdrawals separately
      if (isSolanaWithdrawal) {
        console.log('🟣 Executing Solana withdrawal...');

        // Get the Solana key to use
        const keyToUse = withdrawDeposit.keys.find(k => k.key_index === selectedKeyIndex);
        if (!keyToUse) {
          throw new Error('Selected Solana key not found');
        }

        console.log('Solana key details:', {
          keyIndex: keyToUse.key_index,
          solanaAddress: keyToUse.solana_address,
          denomination: keyToUse.denomination,
          tokenSymbol: keyToUse.token_symbol,
          chainName: keyToUse.chain_name
        });

        // Execute Solana withdrawal using the Solana service
        result = await solanaInternullService.executeWithdrawal(
          keyToUse,
          recipientAddress,
          solanaConnection,
          solanaWallet
        );

        console.log('Solana withdrawal result:', result);

        // Check if Solana withdrawal failed
        if (!result.success) {
          throw new Error(result.error || 'Solana withdrawal failed');
        }
      } else {
        // EVM withdrawal logic
        // Check if this is a single-node key or multi-node keyshare
        if (withdrawDeposit.keys) {
          // Single-node system: directly execute withdrawal with the key
          const keyToUse = withdrawDeposit.keys.find(k => k.key_index === selectedKeyIndex);
          if (!keyToUse) {
            throw new Error('Selected key not found');
          }

          // Find the chain configuration for this key
          const keyChainId = keyToUse.chain_id;
          const keyChainConfig = supportedChains.find(c => c.chain_id === keyChainId);

          if (!keyChainConfig) {
            throw new Error(`Chain configuration not found for ${keyToUse.chain_name} (ID: ${keyChainId})`);
          }

          console.log('Key requires chain:', keyToUse.chain_name, 'Chain ID:', keyChainId);

          // Get MetaMask provider specifically (not Phantom) - do this BEFORE checking network
          let metamaskProvider = null;
          if (window.ethereum) {
            if (window.ethereum.providers) {
              // Multiple wallets installed - find MetaMask
              metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
              console.log('🦊 Found MetaMask in providers array');
            } else if (window.ethereum.isMetaMask) {
              // Only MetaMask installed
              metamaskProvider = window.ethereum;
              console.log('🦊 Using MetaMask as sole provider');
            }
          }

          if (!metamaskProvider) {
            throw new Error('MetaMask not found. Please install MetaMask for EVM withdrawals.');
          }

          // Check current network directly from MetaMask (not from React state)
          const currentChainIdHex = await metamaskProvider.request({ method: 'eth_chainId' });
          const currentChainId = parseInt(currentChainIdHex, 16);
          console.log('Current MetaMask chain ID:', currentChainId);

          if (currentChainId !== keyChainId) {
            console.log(`Switching MetaMask to ${keyToUse.chain_name} (chain ID: ${keyChainId})`);
            toast.info(`Please switch MetaMask to ${keyChainConfig.name} to continue withdrawal`);

            try {
              // Request network switch from MetaMask specifically
              await metamaskProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${keyChainId.toString(16)}` }],
              });

              // Wait for the switch to complete
              await new Promise(resolve => setTimeout(resolve, 2000));

              toast.success(`Switched to ${keyChainConfig.name}`);
            } catch (switchError) {
              console.error('Network switch error:', switchError);

              // This error code indicates that the chain has not been added to MetaMask
              if (switchError.code === 4902) {
                toast.error(`Please add ${keyChainConfig.name} to MetaMask first`);
                throw new Error(`Chain ${keyChainConfig.name} not configured in MetaMask`);
              }
              throw switchError;
            }
          }

          // CRITICAL: Create fresh provider and signer from MetaMask (whether we switched or not)
          // This ensures we're using the correct network and avoids "underlying network changed" errors
          console.log('Creating fresh provider and signer from MetaMask...');
          withdrawalProvider = new ethers.providers.Web3Provider(metamaskProvider);
          withdrawalSigner = await withdrawalProvider.getSigner();
          const finalChainId = (await withdrawalProvider.getNetwork()).chainId;

          console.log(`✅ Provider connected to network ${finalChainId}`);

          // Final verification
          if (finalChainId !== keyChainId) {
            throw new Error(`Network mismatch! Expected ${keyChainId}, but provider is on ${finalChainId}`);
          }

          // Ensure service is initialized with the correct treasury address for this key's chain
          console.log('Initializing singleNodeWithdrawal for:', keyToUse.chain_name, 'Treasury:', keyToUse.treasury_address);

          await singleNodeWithdrawal.initialize(
            withdrawalProvider.provider || withdrawalProvider,
            keyToUse.treasury_address
          );

          result = await singleNodeWithdrawal.executeWithdrawalWithKey(
            keyToUse,
            recipientAddress
          );
        } else {
          // Multi-node system: use ECDSA service with updated provider/signer
          const treasuryAddress = selectedKey.treasury_address || selectedKey.treasuryAddress;
          console.log('Using treasury address for multi-node withdrawal:', treasuryAddress);

          result = await metaMaskOptimizedServiceECDSA.tryDifferentApproaches(
            withdrawalProvider,
            withdrawalSigner,
            {
              recipient: recipientAddress,
              denomination: selectedKey.denomination,
              keyshares: withdrawDeposit.keyshares,
              keyIndex: selectedKeyIndex
            },
            treasuryAddress  // Pass the treasury address from the key data
          );
        }
      }

      if (result.success) {
        const withdrawalTxHash = result.receipt?.transactionHash || result.txHash;

        toast.success(`✅ Withdrawal successful! Transaction: ${withdrawalTxHash}`);

        // Mark the key as used - use FULL deposit keys array, not filtered availableKeys
        // This ensures we check ALL keys in the deposit for correct status transition
        const fullDepositKeys = withdrawDeposit.keys || [];
        const updatedKeys = fullDepositKeys.map(k =>
          k.keyIndex === selectedKeyIndex ? {
            ...k,
            isUsed: true,
            withdrawalTxHash: withdrawalTxHash,
            withdrawalTimestamp: Date.now(),
            withdrawalRecipient: recipientAddress
          } : k
        );

        // Update availableKeys for immediate UI feedback (only affects the dialog)
        setAvailableKeys(availableKeys.map(k =>
          k.keyIndex === selectedKeyIndex ? {
            ...k,
            isUsed: true,
            withdrawalTxHash: withdrawalTxHash,
            withdrawalTimestamp: Date.now(),
            withdrawalRecipient: recipientAddress
          } : k
        ));

        // Check if there are still unused keys in the FULL deposit (not just visible keys)
        const hasUnusedKeys = updatedKeys.some(k => !k.isUsed);
        const newStatus = hasUnusedKeys ? 'keys_received' : 'withdrawn';

        // Get existing withdrawals array or create new one
        const existingWithdrawals = withdrawDeposit.withdrawals || [];
        const newWithdrawal = {
          txHash: withdrawalTxHash,
          timestamp: Date.now(),
          recipient: recipientAddress,
          keyIndex: selectedKeyIndex,
          chainName: selectedKey?.chain_name
        };

        // Update deposit status to track withdrawal (append to array)
        depositTracker.updateDepositStatus(withdrawDeposit.txHash, newStatus, {
          withdrawals: [...existingWithdrawals, newWithdrawal],
          keys: updatedKeys  // Store updated keys with withdrawal info
        });

        // Immediately update React state for instant UI feedback
        setDeposits(prevDeposits =>
          prevDeposits.map(d =>
            d.txHash === withdrawDeposit.txHash
              ? {
                ...d,
                status: newStatus,
                keys: updatedKeys,
                withdrawals: [...existingWithdrawals, newWithdrawal]
              }
              : d
          )
        );

        // Close dialog and refresh deposits to get latest state from blockchain
        setWithdrawDialog(false);
        loadUserDeposits(); // This will check blockchain for current state

        if (withdrawDeposit.keys) {
          console.log('Withdrawal completed. Check blockchain for updated key status.');
          toast.success(`✅ Withdrawal successful! Transaction: ${result.txHash}`);
        } else {
          // Multi-node system - also don't store locally, rely on blockchain
          toast.success(`✅ Withdrawal successful! Transaction: ${result.txHash}`);
        }
      } else {
        // Withdrawal failed - throw error to be caught and shown in dialog
        throw new Error(result.error || 'Withdrawal failed. Please try again.');
      }

    } catch (error) {
      console.error('Withdrawal failed:', error);

      // Determine chain type
      const selectedKey = availableKeys.find(key => key.keyIndex === selectedKeyIndex);
      const chainType = selectedKey?.chain_name === 'solana-devnet' || selectedKey?.chain_name === 'solana' ? 'solana' : 'evm';

      // Use the error handler to show a nice dialog
      handleWithdrawalError(error, chainType);
    } finally {
      setWithdrawing(false);
    }
  };

  const executeKeyRequest = async () => {
    console.log('🚀 executeKeyRequest called');
    console.log('📋 selectedDeposit:', selectedDeposit);

    if (!selectedDeposit) {
      console.error('❌ Missing selectedDeposit');
      toast.error('Please select a deposit first');
      return;
    }

    // Determine if this is a Solana or EVM deposit
    const isSolanaDeposit = !selectedDeposit.userAddress.startsWith('0x');
    console.log('🔍 Deposit type:', isSolanaDeposit ? 'Solana' : 'EVM');

    try {
      setKeyRequestLoading(true);
      console.log('✅ Starting key request process...');

      // Parse and validate denomination requests
      const validRequests = denominationRequests
        .filter(req => req.denomination && parseFloat(req.denomination) > 0)
        .map(req => ({
          denomination: parseFloat(req.denomination),
          chain: req.chain,
          token: req.token
        }));

      if (validRequests.length === 0) {
        toast.error('Please enter at least one valid denomination');
        return;
      }

      const totalRequested = validRequests.reduce((sum, req) => sum + req.denomination, 0);
      if (totalRequested > selectedDeposit.amount) {
        toast.error('Total requested denominations cannot exceed deposit amount');
        return;
      }

      // Convert denomination to string for database lookup
      const formatDenomination = (d) => {
        // Return as string without adding decimal points
        // Database stores whole numbers as "1", "2", "5", not "1.0", "2.0", "5.0"
        return d.toString();
      };

      if (isSolanaDeposit) {
        // ===== SOLANA FLOW =====
        console.log('🟣 Processing Solana key request...');

        // Check Solana wallet connection
        if (!solanaPublicKey || !solanaConnected) {
          toast.error('Please connect your Phantom wallet first');
          return;
        }

        // Verify wallet matches deposit
        const currentSolanaAddress = solanaPublicKey.toString();
        // Case-insensitive comparison for Solana addresses (in case deposit was stored with different casing)
        if (currentSolanaAddress.toLowerCase() !== selectedDeposit.userAddress.toLowerCase()) {
          toast.error(`❌ Wallet mismatch! This deposit was made with ${selectedDeposit.userAddress} but you're connected with ${currentSolanaAddress}. Please switch to the correct wallet.`);
          return;
        }

        // Build withdrawal requests for Solana (matching EVM format)
        const withdrawalRequests = validRequests.map(req => ({
          target_chain: req.chain,
          token_symbol: req.token,
          denomination: formatDenomination(req.denomination)
        }));

        console.log('🪙 Requesting Solana keys with withdrawal requests:', withdrawalRequests);

        // Generate timestamp for signature
        const timestamp = Math.floor(Date.now() / 1000);

        // Create the JSON message to sign (MUST match EVM format for backend compatibility)
        // Note: Solana addresses are case-sensitive base58 strings, do NOT lowercase them
        const message = {
          action: 'request_withdrawal',
          user_address: currentSolanaAddress,  // Keep original case for Solana addresses
          deposit_tx: selectedDeposit.txHash,
          source_chain: sourceChain,
          withdrawal_requests: withdrawalRequests,
          timestamp: timestamp
        };

        console.log('🔐 Message to sign:', JSON.stringify(message, null, 2));

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

        console.log('📄 Formatted message string to sign:', messageStr);

        // Sign message with Phantom wallet
        // Note: Solana uses ed25519 signatures
        const encodedMessage = new TextEncoder().encode(messageStr);

        let signature;
        try {
          // @ts-ignore - Phantom wallet has signMessage method
          const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
          signature = Buffer.from(signedMessage.signature).toString('hex');
          console.log('📝 Message signed with Phantom wallet');
        } catch (signError) {
          console.error('Failed to sign message:', signError);
          toast.error('Failed to sign message with Phantom wallet. Please try again.');
          return;
        }

        // Call backend endpoint with structured withdrawal requests
        const result = await solanaInternullService.requestCrossChainKeys(
          selectedDeposit.txHash,
          sourceChain,
          withdrawalRequests,  // Pass the full withdrawal_requests array
          currentSolanaAddress,
          '0x' + signature,
          timestamp
        );

        console.log('✅ Result from Solana backend:', result);

        if (result.success) {
          // Store keys in deposit tracker
          depositTracker.updateDepositStatus(selectedDeposit.txHash, 'keys_received', {
            requestId: result.request_id,
            keys: result.keys,
            total_value: result.total_value,
            keysReceived: true
          });

          toast.success(`✅ Keys received successfully! Got ${result.keys?.length || 0} key(s) totaling ${result.total_value} SOL`);

          setKeyRequestDialog(false);
          loadUserDeposits(); // Refresh
        } else {
          throw new Error(result.error || 'Failed to request keys from backend');
        }

      } else {
        // ===== EVM FLOW =====
        console.log('🔵 Processing EVM key request...');

        // Check EVM wallet connection
        if (!signer) {
          toast.error('Please connect your MetaMask wallet first');
          return;
        }

        // Verify wallet matches deposit
        const currentAddress = await signer.getAddress();
        if (currentAddress.toLowerCase() !== selectedDeposit.userAddress.toLowerCase()) {
          toast.error(`❌ Wallet mismatch! This deposit was made with address ${selectedDeposit.userAddress} but you're connected with ${currentAddress}. Please switch to the correct wallet.`);
          return;
        }

        // Ensure service is initialized before using it
        if (!singleNodeWithdrawal.isInitialized && provider) {
          console.log('Initializing singleNodeWithdrawal before use...');
          await singleNodeWithdrawal.initialize(provider.provider || provider);
        }

        // Build withdrawal_requests array for backend with per-request token selection
        const withdrawalRequests = validRequests.map(req => ({
          target_chain: req.chain,
          token_symbol: req.token,  // Use per-request token selection
          denomination: formatDenomination(req.denomination)
        }));

        console.log('🪙 Requesting EVM keys with mixed chains:', withdrawalRequests);
        console.log('📝 About to call requestKeysOnlyMixed...');
        console.log('   userAddress:', selectedDeposit.userAddress);
        console.log('   depositTx:', selectedDeposit.txHash);
        console.log('   sourceChain:', sourceChain);

        // Get MetaMask provider specifically (not Phantom)
        let metamaskProvider = window.ethereum;
        if (window.ethereum?.providers) {
          // Multiple providers detected, find MetaMask
          metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
          console.log('🔍 Multiple providers detected, using MetaMask:', !!metamaskProvider);
        } else if (window.ethereum?.isMetaMask) {
          console.log('🔍 Using window.ethereum (MetaMask)');
        }

        if (!metamaskProvider) {
          throw new Error('MetaMask provider not found');
        }

        const result = await singleNodeWithdrawal.requestKeysOnlyMixed({
          userAddress: selectedDeposit.userAddress,
          depositTx: selectedDeposit.txHash,
          sourceChain,  // Include source chain (where deposit was made)
          withdrawalRequests,  // Array of requests with different chains
          web3Provider: metamaskProvider,  // Pass MetaMask provider specifically
          pausePollingWrapper: executeWithPausedPolling  // Pass wrapper to pause polling during signature
        });
        console.log('✅ Result from requestKeysOnlyMixed:', result);

        if (result.success) {
          // Store keys in deposit tracker for later withdrawal
          depositTracker.updateDepositStatus(selectedDeposit.txHash, 'keys_received', {
            requestId: result.request_id,
            keys: result.keys,
            total_value: result.total_value,
            keysReceived: true
          });

          // Get unique tokens from withdrawal requests for the success message
          const uniqueTokens = [...new Set(withdrawalRequests.map(r => r.token_symbol))];
          const tokensStr = uniqueTokens.join('/');

          toast.success(`✅ Keys received successfully! Got ${result.keys.length} key(s) totaling ${result.total_value} ${tokensStr}`);

          setKeyRequestDialog(false);
          loadUserDeposits(); // Refresh
        }
      }

    } catch (error) {
      console.error('❌ Error requesting keys:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error code:', error.code);
      toast.error(`Failed to request keys: ${error.message}`);
    } finally {
      console.log('🏁 Key request process finished, setting loading to false');
      setKeyRequestLoading(false);
    }
  };


  const [downloadKeysData, setDownloadKeysData] = useState(null);

  const handleDownloadKeys = (keyIndex = null, depositForDownload = null) => {
    setDownloadKeyIndex(keyIndex);
    // Store the keys from the deposit if provided
    if (depositForDownload?.keys) {
      console.log('📦 Storing keys for download:', depositForDownload.keys.length, 'keys');
      // Normalize keys to ensure keyIndex field exists (might be key_index in raw deposit)
      const normalizedKeys = depositForDownload.keys.map(key => ({
        ...key,
        keyIndex: key.keyIndex || key.key_index,
        key_index: key.key_index || key.keyIndex,
      }));
      console.log('🔑 Normalized keyIndexes:', normalizedKeys.map(k => k.keyIndex));
      setDownloadKeysData({ keys: normalizedKeys, deposit: depositForDownload });
    } else {
      setDownloadKeysData(null);
    }
    setPasswordDialogMode('download');
    setPasswordDialog(true);
  };

  const handleUploadKeys = () => {
    fileInputRef.current?.click();
  };

  const downloadKeysWithPassword = async (password) => {
    try {
      // Get keys from the current state - try multiple sources
      let keysForDownload = availableKeys;
      let depositForHelper = withdrawDeposit;

      // If availableKeys is empty, try downloadKeysData (from card view)
      if ((!keysForDownload || keysForDownload.length === 0) && downloadKeysData?.keys) {
        console.log('📝 Using keys from downloadKeysData');
        keysForDownload = downloadKeysData.keys;
        depositForHelper = downloadKeysData.deposit;
      }
      // Otherwise try withdrawDeposit.keys (from withdraw dialog)
      else if ((!keysForDownload || keysForDownload.length === 0) && withdrawDeposit?.keys) {
        console.log('📝 Using keys from withdrawDeposit');
        keysForDownload = withdrawDeposit.keys;
      }

      if (!keysForDownload || keysForDownload.length === 0) {
        throw new Error('No keys available to download');
      }

      console.log('🔑 Keys for download:', keysForDownload.length, 'keys');
      console.log('🔍 Looking for keyIndex:', downloadKeyIndex);
      console.log('🔍 Available keyIndexes:', keysForDownload.map(k => k.keyIndex || k.key_index));

      // Use the helper to prepare keys for download (handles single node mode)
      const { keysData, filename } = prepareKeysForDownload(
        keysForDownload,
        depositForHelper,
        downloadKeyIndex
      );

      // Encrypt and download
      const encryptedData = KeyEncryptionService.encryptKeys(keysData, password);
      KeyEncryptionService.downloadEncryptedKeys(encryptedData, filename);

      const message = downloadKeyIndex !== null
        ? `Key ${downloadKeyIndex} downloaded successfully! Keep your password safe.`
        : 'All keys downloaded successfully! Keep your password safe.';
      toast.success(message);

      // Reset download key index and data
      setDownloadKeyIndex(null);
      setDownloadKeysData(null);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download keys: ' + error.message);
      throw error;
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const encryptedData = await KeyEncryptionService.readEncryptedFile(file);
      setPasswordDialogMode('upload');
      setPasswordDialog(true);

      // Store the encrypted data temporarily
      window.tempEncryptedData = encryptedData;
    } catch (error) {
      console.error('File read error:', error);
      toast.error('Failed to read file: ' + error.message);
    }

    // Reset file input
    event.target.value = '';
  };

  const uploadKeysWithPassword = async (password) => {
    try {
      const encryptedData = window.tempEncryptedData;
      delete window.tempEncryptedData;

      let keysData = KeyEncryptionService.decryptKeys(encryptedData, password);

      // Process uploaded keys (handles single node format)
      keysData = processUploadedKeys(keysData);

      // Handle single node format (complete keys, no keyshares to reconstruct)
      if (keysData.isSingleNode) {
        console.log(`Processing ${keysData.availableKeys.length} keys from file`);

        // Show loading toast that we'll update
        const loadingToast = toast.info(
          `🔍 Verifying ${keysData.availableKeys.length} key${keysData.availableKeys.length > 1 ? 's' : ''} against blockchain...`,
          { autoClose: false }
        );

        let verifiedKeys = [];

        try {
          // Separate Solana keys from EVM keys
          const solanaKeys = [];
          const evmKeys = [];
          const solanaKeyIndices = [];
          const evmKeyIndices = [];

          keysData.availableKeys.forEach((key, index) => {
            // Check if this is a Solana key
            const isSolanaKey = key.chain_name?.startsWith('solana') ||
              key.chainName?.startsWith('solana') ||
              key.solana_address !== undefined;

            if (isSolanaKey) {
              solanaKeys.push(key);
              solanaKeyIndices.push(index);
            } else {
              evmKeys.push(key);
              evmKeyIndices.push(index);
            }
          });

          console.log(`Detected ${solanaKeys.length} Solana keys and ${evmKeys.length} EVM keys`);

          // Create results array (same length as original keys)
          const checkResults = new Array(keysData.availableKeys.length);

          // For Solana keys, mark as verified without on-chain check
          // (Solana nullifier checks would require connecting to Solana RPC)
          solanaKeyIndices.forEach(index => {
            checkResults[index] = {
              success: true,
              isUsed: false,
              note: 'Solana key - on-chain verification skipped'
            };
          });

          // For EVM keys, check against contract if provider is available
          if (evmKeys.length > 0) {
            // Import the checkMultipleKeys function for batch processing
            const { checkMultipleKeys } = await import('../services/treasuryContractService');

            // Prepare key data for batch checking - include merkle root and denomination
            const keysToCheck = evmKeys.map(key => ({
              merkleRootId: key.batchId || key.batch_id || key.merkleRootId,
              merkleRoot: key.merkleRoot || key.merkle_root,
              denomination: key.denomination,
              keyIndex: key.treeIndex || key.tree_index || key.keyIndex || key.key_index,
              treasury_address: key.treasury_address || key.treasuryAddress // Pass treasury address
            }));

            // Check all EVM keys in batches
            const evmCheckResults = await checkMultipleKeys(provider, keysToCheck);

            // Map EVM results back to original positions
            evmKeyIndices.forEach((originalIndex, i) => {
              checkResults[originalIndex] = evmCheckResults[i];
            });
          }

          // Process results
          let usedKeysCount = 0;
          let errorKeysCount = 0;

          keysData.availableKeys.forEach((key, index) => {
            const result = checkResults[index];

            if (result.success) {
              if (!result.isUsed) {
                verifiedKeys.push({ ...key, isUsed: false });
              } else {
                usedKeysCount++;
                console.log(`Key ${key.keyIndex} at address ${key.ethereum_address} has already been used on blockchain`);
              }
            } else {
              errorKeysCount++;
              // Only log if it's not just a missing merkleRootId (which happens for keys not yet on chain)
              if (result.error && !result.error.includes('merkleRootId')) {
                console.warn(`Could not verify key: ${result.error}`);
              }
              // Include with warning - user can decide whether to use
              verifiedKeys.push({ ...key, isUsed: false, verificationFailed: true });
            }
          });

          // Dismiss loading toast
          toast.dismiss(loadingToast);

          // Show results
          if (errorKeysCount > 0) {
            toast.warning(
              `⚠️ ${errorKeysCount} key${errorKeysCount > 1 ? 's' : ''} could not be verified. They have been included but use with caution.`,
              { autoClose: 5000 }
            );
          }

          if (usedKeysCount > 0) {
            toast.warning(
              `⚠️ ${usedKeysCount} key${usedKeysCount > 1 ? 's have' : ' has'} already been used and ${usedKeysCount > 1 ? 'were' : 'was'} filtered out`,
              { autoClose: 5000 }
            );
          }

          if (verifiedKeys.length === 0) {
            toast.error('❌ All keys have already been used on the blockchain. Please load a different key file.');
            return;
          }

        } catch (verifyError) {
          // Dismiss loading toast if still active
          toast.dismiss(loadingToast);

          console.error('Key verification failed:', verifyError);

          // Provide helpful error messages based on the error type
          if (verifyError.message?.includes('No Treasury contract deployed')) {
            toast.error('❌ Treasury contract not found. Please check your network connection.');
          } else if (verifyError.message?.includes('Network error')) {
            toast.error('❌ Network error. Please check your blockchain connection.');
          } else {
            toast.error(`❌ Failed to verify keys: ${verifyError.message}`);
          }

          // Ask user if they want to proceed without verification
          if (window.confirm(
            'Key verification failed. Do you want to load the keys anyway?\n\n' +
            'WARNING: This may result in attempting to use already spent keys.'
          )) {
            // Load keys without verification
            const unverifiedKeys = keysData.availableKeys.map(key => ({
              ...key,
              isUsed: false,
              verificationFailed: true
            }));
            verifiedKeys.push(...unverifiedKeys);
            toast.warning('⚠️ Keys loaded without blockchain verification. Use with caution.');
          } else {
            return;
          }
        }

        // Convert verified keys to the format expected by single node withdrawal
        const keysForWithdrawal = verifiedKeys.map(key => ({
          key_index: key.keyIndex,
          private_key: key.private_key,
          ethereum_address: key.ethereum_address,
          solana_address: key.solana_address,
          denomination: key.denomination,
          denomination_wei: key.denomination_wei,
          merkle_root: key.merkleRoot,
          merkle_root_id: key.merkleRootId || key.merkle_root_id || key.batchId || key.batch_id,  // Add merkle_root_id
          chain_name: key.chain_name,
          chain_id: key.chain_id,
          token_symbol: key.token_symbol,
          token_address: key.token_address,
          treasury_address: key.treasury_address,
          merkle_proof: key.merkleProof,
          tree_index: key.treeIndex,
          batch_id: key.batchId,
          user_address: key.userAddress,
          isUsed: false
        }));

        // Check if there's an existing deposit with the same txHash
        const existingDeposit = deposits.find(d => d.txHash === keysData.depositId);

        let finalKeys = keysForWithdrawal;
        let finalStatus = 'keys_received';
        let finalWithdrawals = [];

        if (existingDeposit) {
          console.log('📦 Found existing deposit, merging keys...');
          // Merge: keep existing keys and add new ones that don't exist
          const existingKeyIndices = new Set(
            (existingDeposit.keys || []).map(k => k.key_index || k.keyIndex)
          );
          const newKeys = keysForWithdrawal.filter(
            k => !existingKeyIndices.has(k.key_index)
          );
          finalKeys = [...(existingDeposit.keys || []), ...newKeys];
          finalStatus = existingDeposit.status || 'keys_received';
          finalWithdrawals = existingDeposit.withdrawals || [];
          console.log(`  Merged: ${existingDeposit.keys?.length || 0} existing + ${newKeys.length} new = ${finalKeys.length} total keys`);
        }

        // Set the deposit info with merged keys
        setWithdrawDeposit({
          txHash: keysData.depositId,
          requestId: keysData.requestId,
          amount: verifiedKeys.reduce((sum, key) =>
            sum + parseFloat(key.denomination), 0
          ),
          keys: finalKeys,
          status: finalStatus,
          withdrawals: finalWithdrawals,
          isSingleNode: true
        });

        // Update the deposit tracker with merged keys
        if (existingDeposit) {
          depositTracker.updateDepositStatus(keysData.depositId, finalStatus, {
            keys: finalKeys,
            withdrawals: finalWithdrawals
          });
        }

        // Set only verified (unused) keys
        setAvailableKeys(verifiedKeys);

        // Provide detailed success message
        const successMessage = verifiedKeys.length === 1
          ? `✅ Successfully loaded 1 verified unused key!`
          : `✅ Successfully loaded ${verifiedKeys.length} verified unused keys!`;

        // Detect token symbol from first key
        const tokenSymbol = verifiedKeys.length > 0
          ? (verifiedKeys[0].token_symbol || verifiedKeys[0].tokenSymbol || 'ETH')
          : 'ETH';

        const totalAmount = verifiedKeys.reduce((sum, key) => sum + parseFloat(key.denomination), 0);
        const detailedMessage = `${successMessage} (Total value: ${totalAmount} ${tokenSymbol})`;

        toast.success(detailedMessage, { autoClose: 5000 });

        setWithdrawDialog(true);
        return;
      }

      // Legacy multi-node format handling below
      // Validate the decrypted data for multi-node format
      if (!keysData.keyshares || !keysData.depositId) {
        throw new Error('Invalid key file format');
      }

      // Additional validation for keyshares structure
      if (typeof keysData.keyshares !== 'object' || Object.keys(keysData.keyshares).length === 0) {
        throw new Error('Invalid keyshares format - no keyshares found');
      }

      // Validate keyshares structure
      const hasValidKeyshares = Object.values(keysData.keyshares).some(nodeData =>
        nodeData && nodeData.keyshares && Array.isArray(nodeData.keyshares) && nodeData.keyshares.length > 0
      );

      if (!hasValidKeyshares) {
        throw new Error('Invalid keyshares format - no valid keyshares found');
      }

      // Ensure keys_metadata exists for all nodes
      Object.values(keysData.keyshares).forEach(nodeData => {
        if (!nodeData.keys_metadata) {
          nodeData.keys_metadata = {};
        }
      });

      console.log('Decrypted keys data:', keysData);

      // Check if this is a single key or multiple keys
      if (keysData.isSingleKey && keysData.keyIndex !== undefined) {
        // Handle single key upload
        console.log('Loading single key:', keysData.keyIndex);
        // First, check if we already have keys loaded for this deposit
        if (withdrawDeposit && withdrawDeposit.txHash === keysData.depositId) {
          // Merge with existing keys
          const updatedKeyshares = { ...withdrawDeposit.keyshares };

          // Merge the single key into existing keyshares
          Object.entries(keysData.keyshares).forEach(([nodeId, nodeData]) => {
            if (!updatedKeyshares[nodeId]) {
              updatedKeyshares[nodeId] = { keyshares: [], keys_metadata: {} };
            }

            // Add or update the keyshare
            const existingIndex = updatedKeyshares[nodeId].keyshares.findIndex(
              ks => ks.key_index === keysData.keyIndex ||
                ks.key_index === String(keysData.keyIndex) ||
                ks.key_index === Number(keysData.keyIndex)
            );

            if (existingIndex >= 0) {
              updatedKeyshares[nodeId].keyshares[existingIndex] = nodeData.keyshares[0];
            } else {
              updatedKeyshares[nodeId].keyshares.push(nodeData.keyshares[0]);
            }

            // Update metadata - handle different key formats
            const metadata = nodeData.keys_metadata[keysData.keyIndex] ||
              nodeData.keys_metadata[String(keysData.keyIndex)] ||
              nodeData.keys_metadata[Number(keysData.keyIndex)];

            if (metadata) {
              updatedKeyshares[nodeId].keys_metadata[keysData.keyIndex] = metadata;
            }
          });

          setWithdrawDeposit({
            ...withdrawDeposit,
            keyshares: updatedKeyshares
          });

          // Check status for all keys
          const keysWithStatus = await withdrawalService.checkKeysStatus(
            provider,
            updatedKeyshares,
            keysData.depositId
          );

          // Ensure we preserve additional metadata from the encrypted data for the merged key
          const enrichedKeys = keysWithStatus.map(key => {
            if (key.keyIndex === keysData.keyIndex ||
              key.keyIndex === String(keysData.keyIndex) ||
              key.keyIndex === Number(keysData.keyIndex)) {
              const uploadedKey = keysData.availableKeys?.find(k =>
                k.keyIndex === keysData.keyIndex ||
                k.keyIndex === String(keysData.keyIndex) ||
                k.keyIndex === Number(keysData.keyIndex)
              ) || keysData.availableKeys?.[0];

              return {
                ...key,
                // Preserve additional metadata from the uploaded key
                userAddress: uploadedKey?.userAddress || key.userAddress,
                amount: uploadedKey?.amount || key.amount || key.denomination,
                merkleRoot: uploadedKey?.merkleRoot || key.merkleRoot,
                merkleProof: uploadedKey?.merkleProof || key.merkleProof,
                treeIndex: uploadedKey?.treeIndex || key.treeIndex,
                batchId: uploadedKey?.batchId || key.batchId,
                originalMetadata: uploadedKey?.originalMetadata || {}
              };
            }
            return key;
          });

          setAvailableKeys(enrichedKeys);

          toast.success(`Key ${keysData.keyIndex} loaded and merged successfully!`);
        } else {
          // No existing keys, load single key as new
          setWithdrawDeposit({
            txHash: keysData.depositId,
            requestId: keysData.requestId,
            keyshares: keysData.keyshares,
            amount: keysData.availableKeys.reduce((sum, key) => sum + key.denomination, 0)
          });

          // For single keys, check only the loaded key's status
          try {
            const keysWithStatus = await withdrawalService.checkKeysStatus(
              provider,
              keysData.keyshares,
              keysData.depositId
            );

            // Ensure we preserve additional metadata from the encrypted data
            const uploadedKey = keysData.availableKeys?.[0];
            const enrichedKeys = keysWithStatus.map(key => ({
              ...key,
              // Preserve additional metadata that might not be in the status check
              userAddress: uploadedKey?.userAddress || key.userAddress,
              amount: uploadedKey?.amount || key.amount || key.denomination,
              merkleRoot: uploadedKey?.merkleRoot || key.merkleRoot,
              merkleProof: uploadedKey?.merkleProof || key.merkleProof,
              treeIndex: uploadedKey?.treeIndex || key.treeIndex,
              batchId: uploadedKey?.batchId || key.batchId,
              originalMetadata: uploadedKey?.originalMetadata || {}
            }));

            setAvailableKeys(enrichedKeys);
          } catch (error) {
            console.error('Error checking key status:', error);
            // Fallback to using the keys from encrypted data
            setAvailableKeys(keysData.availableKeys);
          }

          toast.success(`Key ${keysData.keyIndex} loaded successfully!`);
        }
      } else {
        // Handle multiple keys upload (existing behavior)
        setWithdrawDeposit({
          txHash: keysData.depositId,
          requestId: keysData.requestId,
          keyshares: keysData.keyshares,
          amount: keysData.availableKeys.reduce((sum, key) => sum + key.denomination, 0)
        });

        const keysWithStatus = await withdrawalService.checkKeysStatus(
          provider,
          keysData.keyshares,
          keysData.depositId
        );

        // Enrich keys with metadata from uploaded file
        const enrichedKeys = keysWithStatus.map(key => {
          const uploadedKey = keysData.availableKeys?.find(k =>
            k.keyIndex === key.keyIndex ||
            k.keyIndex === String(key.keyIndex) ||
            k.keyIndex === Number(key.keyIndex)
          );

          if (uploadedKey) {
            return {
              ...key,
              userAddress: uploadedKey.userAddress || key.userAddress,
              amount: uploadedKey.amount || key.amount || key.denomination,
              merkleRoot: uploadedKey.merkleRoot || key.merkleRoot,
              merkleProof: uploadedKey.merkleProof || key.merkleProof,
              treeIndex: uploadedKey.treeIndex || key.treeIndex,
              batchId: uploadedKey.batchId || key.batchId,
              originalMetadata: uploadedKey.originalMetadata || {}
            };
          }
          return key;
        });

        setAvailableKeys(enrichedKeys);

        toast.success('All keys loaded successfully!');
      }

      setWithdrawDialog(true);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to load keys: ' + error.message);
      throw error;
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      pending: {
        bgcolor: 'rgba(255, 165, 2, 0.1)',
        color: '#ffa502',
        label: 'Pending'
      },
      confirmed: {
        bgcolor: 'rgba(0, 242, 254, 0.1)',
        color: '#00f2fe',
        label: 'Confirmed'
      },
      keys_requested: {
        bgcolor: 'rgba(79, 172, 254, 0.1)',
        color: '#4facfe',
        label: 'Keys Requested'
      },
      keys_received: {
        bgcolor: 'rgba(102, 126, 234, 0.1)',
        color: '#667eea',
        label: 'Keys Received'
      },
      withdrawn: {
        bgcolor: 'rgba(0, 230, 118, 0.1)',
        color: '#00e676',
        label: 'Withdrawn'
      },
      failed: {
        bgcolor: 'rgba(255, 71, 87, 0.1)',
        color: '#ff4757',
        label: 'Failed'
      }
    };

    const config = statusConfig[status] || {
      bgcolor: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.6)',
      label: status
    };

    return (
      <Chip
        size="small"
        label={config.label}
        sx={{
          bgcolor: config.bgcolor,
          color: config.color,
          border: `1px solid ${config.color}`,
          fontWeight: 600,
        }}
      />
    );
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateHash = (hash) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  if (!connected && !solanaConnected) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <AccountBalanceWallet
          sx={{
            fontSize: 80,
            color: '#667eea',
            mb: 3,
            filter: 'drop-shadow(0 8px 16px rgba(102, 126, 234, 0.3))',
          }}
        />
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(90deg, #667eea 0%, #f093fb 100%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
          }}
        >
          Connect Your Wallet
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: 500,
            mb: 4,
            textAlign: 'center'
          }}
        >
          Please connect your wallet using the buttons in the header to view your privacy dashboard
        </Typography>
        <Alert severity="info" sx={{ maxWidth: 500, mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>For EVM chains</strong> (Sepolia, BNB Testnet, Localhost):
          </Typography>
          <Typography variant="body2" sx={{ ml: 2, mb: 2 }}>
            Click the "EVM Wallet" button in the header to connect MetaMask
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>For Solana chains</strong> (Solana Devnet):
          </Typography>
          <Typography variant="body2" sx={{ ml: 2 }}>
            Click the "Select Wallet" button in the header to connect Phantom
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 3 }}>
      <Paper
        sx={{
          p: 4,
          mb: 3,
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(244, 147, 251, 0.05) 100%)',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: '#a78bfa',
                mb: 1,
              }}
            >
              Manage Keys
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
              Manage your privacy keys and withdraw funds
            </Typography>

            {/* Connected Wallets */}
            {(account || solanaPublicKey) && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    mb: 1.5,
                    display: 'block',
                  }}
                >
                  Connected
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {account && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        component="img"
                        src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                        alt="MetaMask"
                        sx={{
                          width: 20,
                          height: 20,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                        }}
                      >
                        {`${account.slice(0, 6)}...${account.slice(-4)}`}
                      </Typography>
                    </Box>
                  )}
                  {solanaPublicKey && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        component="img"
                        src="https://cryptologos.cc/logos/solana-sol-logo.svg"
                        alt="Solana"
                        sx={{
                          width: 20,
                          height: 20,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                        }}
                      >
                        {`${solanaPublicKey.toString().slice(0, 4)}...${solanaPublicKey.toString().slice(-4)}`}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {nodeHealth ? (
              <Button
                variant="outlined"
                size="medium"
                onClick={checkNodeHealth}
                sx={{
                  borderColor: nodeHealth.allHealthy ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                  color: nodeHealth.allHealthy ? '#22c55e' : '#ef4444',
                  '&:hover': {
                    borderColor: nodeHealth.allHealthy ? '#22c55e' : '#ef4444',
                    bgcolor: nodeHealth.allHealthy ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  },
                }}
              >
                Node: {nodeHealth.allHealthy ? 'Online' : 'Offline'}
              </Button>
            ) : (
              <Button
                variant="outlined"
                size="medium"
                disabled
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                Node: Checking...
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
              onClick={() => {
                loadUserDeposits();
                checkNodeHealth();
              }}
              disabled={loading}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={handleUploadKeys}
              sx={{
                background: 'linear-gradient(90deg, #a78bfa 0%, #c084fc 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%)',
                },
              }}
            >
              Upload Keys
            </Button>
          </Box>
        </Box>
      </Paper >

      {/* Two Column Layout: Request Keys | Withdraw Keys */}
      < Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>

        {/* Left Column - Request Keys */}
        < Paper
          sx={{
            flex: 1,
            p: 3,
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 600,
              mb: 2,
              color: 'white',
            }}
          >
            Request Keys
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2 }}>
            Deposits awaiting key requests
          </Typography>

          {
            deposits.filter(d => d.status === 'confirmed' || d.status === 'keys_requested').length === 0 ? (
              <Alert severity="info">
                No deposits awaiting key requests. All deposits have keys or are withdrawn.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {(() => {
                  // Filter deposits awaiting key requests (confirmed or keys_requested)
                  const depositsAwaitingKeys = deposits.filter(d =>
                    d.status === 'confirmed' || d.status === 'keys_requested'
                  );

                  // Group deposits by chain
                  const depositsByChain = {};

                  depositsAwaitingKeys.forEach(deposit => {
                    let chainName;
                    let chainIdToLookup = null;

                    // Determine which ID to use (chainId takes priority for accuracy)
                    if (deposit.chainId) {
                      chainIdToLookup = deposit.chainId;
                    } else if (deposit.metadata?.targetChain) {
                      chainIdToLookup = deposit.metadata.targetChain;
                    }

                    // Now resolve the chainIdToLookup to a proper chain name
                    if (typeof chainIdToLookup === 'string') {
                      // String chainId (like 'solana-devnet') - use directly
                      chainName = chainIdToLookup;
                    } else if (typeof chainIdToLookup === 'number') {
                      // Numeric chainId - look it up in supportedChains from backend
                      const chain = supportedChains.find(c => c.chain_id === chainIdToLookup);
                      if (chain) {
                        chainName = chain.chain_name || chain.name;
                      } else {
                        // Fallback to manual mapping only if backend doesn't have it
                        chainName = getChainNameFromId(chainIdToLookup) || `Chain ${chainIdToLookup}`;
                      }
                    } else {
                      // No valid chain ID found
                      chainName = 'Unknown Chain';
                    }

                    // Fix for Hyperliquid if it comes as 'hyperliquid' string or specific ID
                    if (deposit.metadata?.targetChain === 'hyperliquid' || deposit.chainId === 999) {
                      chainName = 'hyperliquid';
                    }

                    if (!depositsByChain[chainName]) {
                      depositsByChain[chainName] = [];
                    }
                    depositsByChain[chainName].push(deposit);
                  });

                  return Object.entries(depositsByChain).map(([chainName, chainDeposits]) => {
                    const isChainExpanded = expandedChains[chainName];
                    const chainLogo = getChainLogo(chainName);

                    return (
                      <Card
                        key={chainName}
                        sx={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Chain Header */}
                        <CardContent
                          onClick={() => toggleChain(chainName)}
                          sx={{
                            cursor: 'pointer',
                            p: 2,
                            bgcolor: 'rgba(102, 126, 234, 0.05)',
                            '&:hover': {
                              bgcolor: 'rgba(102, 126, 234, 0.1)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              {chainLogo && (
                                <Box
                                  component="img"
                                  src={chainLogo}
                                  alt={chainName}
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    objectFit: 'contain',
                                  }}
                                />
                              )}
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                                  {getChainDisplayName(chainName)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                  {chainDeposits.length} deposit{chainDeposits.length !== 1 ? 's' : ''}
                                </Typography>
                              </Box>
                            </Box>
                            <ExpandMore
                              sx={{
                                transform: isChainExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s',
                                color: 'rgba(255, 255, 255, 0.6)',
                              }}
                            />
                          </Box>
                        </CardContent>

                        {/* Chain Content - Deposits */}
                        <Collapse in={isChainExpanded}>
                          <CardContent sx={{ p: 2, pt: 0 }}>
                            <Stack spacing={1.5} sx={{ mt: 1 }}>
                              {chainDeposits.map((deposit) => {
                                const tokenSymbol = deposit.metadata?.token || 'ETH';
                                const tokenLogo = getTokenLogo(tokenSymbol);

                                return (
                                  <Card
                                    key={deposit.id}
                                    sx={{
                                      background: 'rgba(255, 255, 255, 0.03)',
                                      border: '1px solid rgba(255, 255, 255, 0.08)',
                                      borderRadius: 1.5,
                                    }}
                                  >
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                      {/* Deposit Header */}
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          {tokenLogo && (
                                            <Box
                                              component="img"
                                              src={tokenLogo}
                                              alt={tokenSymbol}
                                              sx={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                objectFit: 'contain',
                                              }}
                                            />
                                          )}
                                          <Typography variant="body1" sx={{ fontWeight: 600, color: 'white' }}>
                                            {deposit.amount} {tokenSymbol}
                                          </Typography>
                                        </Box>
                                        {getStatusChip(deposit.status)}
                                      </Box>

                                      {/* Deposit Details */}
                                      <Box sx={{ mb: 1.5 }}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block' }}>
                                          {formatDate(deposit.timestamp)}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                            TX:
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              fontFamily: 'monospace',
                                              color: 'rgba(255, 255, 255, 0.8)',
                                            }}
                                          >
                                            {truncateHash(deposit.txHash)}
                                          </Typography>
                                        </Box>
                                      </Box>

                                      {/* Actions based on status */}
                                      {deposit.status === 'confirmed' && (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          fullWidth
                                          startIcon={<AccountBalanceWallet />}
                                          onClick={() => handleRequestKeys(deposit)}
                                          sx={{
                                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                            '&:hover': {
                                              background: 'linear-gradient(90deg, #764ba2 0%, #667eea 100%)',
                                              transform: 'translateY(-2px)',
                                              boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                                            },
                                          }}
                                        >
                                          Request Keys
                                        </Button>
                                      )}

                                      {deposit.status === 'keys_requested' && (
                                        <Box>
                                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                            Request ID: {deposit.keyRequestId?.slice(0, 8)}...
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                            Keys pending... Check back soon or use Python scripts
                                          </Typography>
                                        </Box>
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </Stack>
                          </CardContent>
                        </Collapse>
                      </Card>
                    );
                  });
                })()}
              </Stack>
            )
          }
        </Paper >

        {/* Right Column - Withdraw Keys */}
        < Paper
          sx={{
            flex: 1,
            p: 3,
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 600,
              mb: 2,
              color: 'white',
            }}
          >
            Withdraw Keys
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2 }}>
            Available keys ready for withdrawal
          </Typography>

          {
            deposits.filter(d => d.status === 'keys_received').length === 0 ? (
              <Alert severity="info">
                No keys available yet. Request keys from your deposits first.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {(() => {
                  // Get all deposits with received keys
                  const depositsWithKeys = deposits.filter(d => d.status === 'keys_received');

                  // Group individual keys by chain → token
                  const keysByChainAndToken = {};

                  depositsWithKeys.forEach(deposit => {
                    const allKeys = deposit.keys || [];

                    // Show all keys, including used ones (as requested by user)
                    allKeys.forEach(key => {
                      const keyChainName = key.chain_name || 'Unknown';
                      const tokenSymbol = key.token_symbol || 'ETH';

                      if (!keysByChainAndToken[keyChainName]) {
                        keysByChainAndToken[keyChainName] = {};
                      }
                      if (!keysByChainAndToken[keyChainName][tokenSymbol]) {
                        keysByChainAndToken[keyChainName][tokenSymbol] = [];
                      }

                      keysByChainAndToken[keyChainName][tokenSymbol].push({
                        ...key,
                        // Ensure keyIndex is populated (handle both camelCase and snake_case)
                        keyIndex: key.keyIndex !== undefined ? key.keyIndex : key.key_index,
                        deposit: deposit, // Keep reference to parent deposit
                        timestamp: deposit.timestamp // Inherit timestamp from deposit for sorting
                      });
                    });
                  });

                  // Sort keys by timestamp (descending)
                  Object.keys(keysByChainAndToken).forEach(chain => {
                    Object.keys(keysByChainAndToken[chain]).forEach(token => {
                      keysByChainAndToken[chain][token].sort((a, b) => {
                        // Sort by timestamp descending (newest first)
                        const timeA = a.timestamp || 0;
                        const timeB = b.timestamp || 0;
                        if (timeA !== timeB) return timeB - timeA;

                        // Secondary sort by key index
                        return (a.keyIndex || 0) - (b.keyIndex || 0);
                      });
                    });
                  });

                  console.log('📊 Keys grouped by chain and token:', keysByChainAndToken);

                  return Object.entries(keysByChainAndToken).map(([chainName, tokenGroups]) => {
                    const isChainExpanded = expandedChains[`withdraw-${chainName}`];
                    const chainLogo = getChainLogo(chainName);
                    const allKeysInChain = Object.values(tokenGroups).flat();
                    const totalKeysInChain = allKeysInChain.length;
                    const usedKeysInChain = allKeysInChain.filter(k => k.isUsed).length;

                    return (
                      <Card
                        key={chainName}
                        sx={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Chain Header */}
                        <CardContent
                          onClick={() => toggleChain(`withdraw-${chainName}`)}
                          sx={{
                            cursor: 'pointer',
                            p: 2,
                            bgcolor: 'rgba(0, 242, 254, 0.05)',
                            '&:hover': {
                              bgcolor: 'rgba(0, 242, 254, 0.1)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              {chainLogo && (
                                <Box
                                  component="img"
                                  src={chainLogo}
                                  alt={chainName}
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    objectFit: 'contain',
                                  }}
                                />
                              )}
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                                  {getChainDisplayName(chainName)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                  {(() => {
                                    const allKeys = Object.values(tokenGroups).flat();
                                    const usedCount = allKeys.filter(k => k.isUsed).length;
                                    const totalCount = allKeys.length;
                                    return `${usedCount} used / ${totalCount} total`;
                                  })()}
                                </Typography>
                              </Box>
                            </Box>
                            <ExpandMore
                              sx={{
                                transform: isChainExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s',
                                color: 'rgba(255, 255, 255, 0.6)',
                              }}
                            />
                          </Box>
                        </CardContent>

                        {/* Chain Content - Token Groups */}
                        <Collapse in={isChainExpanded}>
                          <CardContent sx={{ p: 2, pt: 0 }}>
                            <Stack spacing={1.5} sx={{ mt: 1 }}>
                              {Object.entries(tokenGroups).map(([tokenSymbol, keys]) => {
                                const tokenKey = `withdraw-${chainName}-${tokenSymbol}`;
                                const isTokenExpanded = expandedTokens[tokenKey];
                                const tokenLogo = getTokenLogo(tokenSymbol);

                                return (
                                  <Card
                                    key={tokenSymbol}
                                    sx={{
                                      background: 'rgba(255, 255, 255, 0.03)',
                                      border: '1px solid rgba(255, 255, 255, 0.08)',
                                      borderRadius: 1.5,
                                    }}
                                  >
                                    {/* Token Header */}
                                    <CardContent
                                      onClick={() => toggleToken(chainName, tokenSymbol)}
                                      sx={{
                                        cursor: 'pointer',
                                        p: 1.5,
                                        '&:last-child': { pb: 1.5 },
                                        '&:hover': {
                                          bgcolor: 'rgba(255, 255, 255, 0.02)',
                                        },
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          {tokenLogo && (
                                            <Box
                                              component="img"
                                              src={tokenLogo}
                                              alt={tokenSymbol}
                                              sx={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: '50%',
                                                objectFit: 'contain',
                                              }}
                                            />
                                          )}
                                          <Typography variant="body1" sx={{ fontWeight: 600, color: 'white' }}>
                                            {tokenSymbol}
                                          </Typography>
                                          <Chip
                                            label={(() => {
                                              const usedCount = keys.filter(k => k.isUsed).length;
                                              const totalCount = keys.length;
                                              return `${usedCount} used / ${totalCount} total`;
                                            })()}
                                            size="small"
                                            sx={{
                                              bgcolor: 'rgba(0, 230, 118, 0.15)',
                                              color: '#00e676',
                                              fontWeight: 600,
                                              fontSize: '0.7rem',
                                              height: 20,
                                            }}
                                          />
                                        </Box>
                                        <ExpandMore
                                          sx={{
                                            transform: isTokenExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.3s',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                            fontSize: 20,
                                          }}
                                        />
                                      </Box>
                                    </CardContent>

                                    {/* Token Content - Individual Keys */}
                                    <Collapse in={isTokenExpanded}>
                                      <Box sx={{ px: 1.5, pb: 1.5 }}>
                                        <Stack spacing={1}>
                                          {keys.map((key, idx) => (
                                            <Card
                                              key={`${key.keyIndex}-${idx}`}
                                              sx={{
                                                background: key.isUsed
                                                  ? 'rgba(255, 82, 82, 0.05)'
                                                  : 'rgba(0, 230, 118, 0.05)',
                                                border: key.isUsed
                                                  ? '1px solid rgba(255, 82, 82, 0.2)'
                                                  : '1px solid rgba(0, 230, 118, 0.2)',
                                                borderRadius: 1.5,
                                              }}
                                            >
                                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                                {/* Key Header */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {tokenLogo && (
                                                      <Box
                                                        component="img"
                                                        src={tokenLogo}
                                                        alt={tokenSymbol}
                                                        sx={{
                                                          width: 24,
                                                          height: 24,
                                                          borderRadius: '50%',
                                                          objectFit: 'contain',
                                                        }}
                                                      />
                                                    )}
                                                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'white' }}>
                                                      {key.denomination} {tokenSymbol}
                                                    </Typography>
                                                  </Box>
                                                  <Chip
                                                    label={key.isUsed ? '❌ Used' : '✅ Available'}
                                                    size="small"
                                                    sx={{
                                                      bgcolor: key.isUsed ? 'rgba(255, 82, 82, 0.15)' : 'rgba(0, 230, 118, 0.15)',
                                                      color: key.isUsed ? '#ff5252' : '#00e676',
                                                      fontWeight: 600,
                                                    }}
                                                  />
                                                </Box>

                                                {/* Key Details */}
                                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', mb: 1 }}>
                                                  Key #{key.keyIndex}
                                                </Typography>

                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                  <Button
                                                    size="small"
                                                    variant="contained"
                                                    color={key.isUsed ? "warning" : "primary"}
                                                    startIcon={<GetApp />}
                                                    onClick={() => handleWithdraw(key.deposit, key.keyIndex)}
                                                    sx={{
                                                      background: key.isUsed
                                                        ? 'rgba(255, 152, 0, 0.2)'
                                                        : 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
                                                      color: key.isUsed ? '#ff9800' : 'white',
                                                      border: key.isUsed ? '1px solid rgba(255, 152, 0, 0.5)' : 'none',
                                                      fontSize: '0.75rem',
                                                      px: 1.5,
                                                      py: 0.5,
                                                      flex: 1,
                                                      whiteSpace: 'nowrap',
                                                      '&:hover': {
                                                        background: key.isUsed
                                                          ? 'rgba(255, 152, 0, 0.3)'
                                                          : 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                                                      },
                                                    }}
                                                  >
                                                    {key.isUsed ? 'Retry' : 'Withdraw'}
                                                  </Button>
                                                  <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<Download />}
                                                    onClick={() => handleDownloadKeys(key.keyIndex, key.deposit)}
                                                    sx={{
                                                      borderColor: 'rgba(0, 242, 254, 0.3)',
                                                      color: '#00f2fe',
                                                      fontSize: '0.75rem',
                                                      px: 1.5,
                                                      py: 0.5,
                                                      flex: 1,
                                                      whiteSpace: 'nowrap',
                                                      '&:hover': {
                                                        borderColor: '#00f2fe',
                                                        bgcolor: 'rgba(0, 242, 254, 0.1)',
                                                      },
                                                    }}
                                                  >
                                                    Save Key
                                                  </Button>
                                                </Box>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </Stack>
                                      </Box>
                                    </Collapse>
                                  </Card>
                                );
                              })}
                            </Stack>
                          </CardContent>
                        </Collapse>
                      </Card>
                    );
                  });
                })()}
              </Stack>
            )
          }
        </Paper >
      </Box >

      {/* Key Request Dialog */}
      < Dialog open={keyRequestDialog} onClose={() => setKeyRequestDialog(false)} maxWidth="md" fullWidth >
        <DialogTitle>Request Cross-Chain Withdrawal Keys</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Request keys for your deposit of {selectedDeposit?.amount} {selectedDeposit?.metadata?.token || 'ETH'}.
            You can now request keys for different chains in a single request!
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }} disabled>
            <InputLabel>Source Chain (Where Deposit Was Made)</InputLabel>
            <Select
              value={sourceChain}
              label="Source Chain (Where Deposit Was Made)"
              disabled
            >
              {supportedChains.map(chain => (
                <MenuItem key={chain.chain_name} value={chain.chain_name}>
                  {chain.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Source Chain:</strong> Automatically set to <strong>{supportedChains.find(c => c.chain_name === sourceChain)?.name || sourceChain}</strong> based on your deposit transaction.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Token:</strong> Using <strong>{selectedDeposit?.metadata?.token || 'ETH'}</strong> from your deposit.
            </Typography>
          </Alert>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Denomination Requests
          </Typography>

          {denominationRequests.map((request, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
              <TextField
                label={`Denomination ${index + 1}`}
                value={request.denomination}
                onChange={(e) => updateDenominationRequest(index, 'denomination', e.target.value)}
                placeholder="1.0"
                type="number"
                inputProps={{ step: '0.01', min: '0' }}
                sx={{ flex: '0 0 120px' }}
              />
              <FormControl sx={{ flex: '0 0 140px' }}>
                <InputLabel>Token</InputLabel>
                <Select
                  value={request.token}
                  onChange={(e) => updateDenominationRequest(index, 'token', e.target.value)}
                  label="Token"
                >
                  {availableTokens.length > 0 ? (
                    availableTokens.map(token => (
                      <MenuItem key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </MenuItem>
                    ))
                  ) : (
                    // Fallback to default tokens if none loaded
                    <>
                      <MenuItem value="ETH">ETH</MenuItem>
                      <MenuItem value="SOL">SOL</MenuItem>
                    </>
                  )}
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Target Chain</InputLabel>
                <Select
                  value={request.chain}
                  onChange={(e) => updateDenominationRequest(index, 'chain', e.target.value)}
                  label="Target Chain"
                >
                  {supportedChains.map(chain => (
                    <MenuItem key={chain.chain_name} value={chain.chain_name}>
                      {chain.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {denominationRequests.length > 1 && (
                  <IconButton
                    onClick={() => removeDenominationRequest(index)}
                    color="error"
                    size="small"
                  >
                    <Remove />
                  </IconButton>
                )}
                {index === denominationRequests.length - 1 && (
                  <IconButton
                    onClick={addDenominationRequest}
                    color="primary"
                    size="small"
                  >
                    <Add />
                  </IconButton>
                )}
              </Box>
            </Box>
          ))}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Supported denominations:</strong> 0.001, 0.01, 0.1, 0.5, 1.0 per token
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Mixed cross-chain withdrawals:</strong> You can request different tokens on different chains! For example:
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 0.5, ml: 2 }}>
              • 1.0 ETH for Arbitrum<br />
              • 1.0 WETH for Polygon<br />
              • Backend validates token mappings and ensures security
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Security:</strong> The backend verifies that your deposit token can be mapped to the requested withdrawal tokens on the target chains.
            </Typography>
          </Alert>

          {keyRequestLoading && (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                Requesting keys from node...
              </Box>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKeyRequestDialog(false)} disabled={keyRequestLoading}>
            Cancel
          </Button>
          <Button
            onClick={executeKeyRequest}
            variant="contained"
            disabled={keyRequestLoading}
            startIcon={keyRequestLoading ? <CircularProgress size={16} /> : undefined}
          >
            {keyRequestLoading ? 'Requesting...' : 'Request Keys'}
          </Button>
        </DialogActions>
      </Dialog >

      {/* Withdrawal Dialog */}
      < Dialog open={withdrawDialog} onClose={() => setWithdrawDialog(false)} maxWidth="md" fullWidth >
        <DialogTitle>Withdraw from Smart Contract</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Ready to withdraw from the treasury smart contract using your DKG keys.
          </Typography>

          <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {availableKeys.length === 1 ? 'Withdraw Specific Key' : 'Withdrawal Details'}
            </Typography>
            <Typography variant="body2">
              <strong>Request ID:</strong> {withdrawDeposit?.requestId}
            </Typography>
            {availableKeys.length === 1 ? (
              <Typography variant="body2">
                <strong>Key:</strong> {availableKeys[0].denomination} {availableKeys[0].token_symbol} (Key #{availableKeys[0].keyIndex})
              </Typography>
            ) : (
              <>
                <Typography variant="body2">
                  <strong>Total Amount:</strong> {withdrawDeposit?.amount} {availableKeys.length > 0 ? (availableKeys[0].token_symbol || 'ETH') : 'ETH'}
                </Typography>
                <Typography variant="body2">
                  <strong>Keys:</strong> {(() => {
                    const totalKeys = withdrawDeposit?.keys?.length || availableKeys.length;
                    const usedKeys = withdrawDeposit?.keys?.filter(k => k.isUsed).length || 0;
                    return `${usedKeys} used / ${totalKeys} total`;
                  })()}
                </Typography>
              </>
            )}
            <Typography variant="body2">
              <strong>Keyshares:</strong> {withdrawDeposit?.keyshares ? Object.keys(withdrawDeposit.keyshares).length : 0} nodes
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Ready to withdraw:</strong> All required data is available for smart contract withdrawal.
            </Typography>
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                Available Keys
              </Typography>
              <Box>
                <Tooltip title="Save all encrypted keys">
                  <IconButton onClick={() => handleDownloadKeys()} color="primary" size="small">
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Upload encrypted keys">
                  <IconButton onClick={handleUploadKeys} color="primary" size="small">
                    <Upload />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Group keys by chain and token */}
            {(() => {
              // Group keys by chain -> token
              const groupedKeys = {};
              availableKeys.forEach(key => {
                const chainName = key.chain_name || 'localhost';
                const tokenSymbol = key.token_symbol || 'ETH';

                if (!groupedKeys[chainName]) {
                  groupedKeys[chainName] = {};
                }
                if (!groupedKeys[chainName][tokenSymbol]) {
                  groupedKeys[chainName][tokenSymbol] = [];
                }

                groupedKeys[chainName][tokenSymbol].push(key);
              });

              return (
                <Stack spacing={1.5}>
                  {Object.entries(groupedKeys).map(([chainName, tokens]) => {
                    const totalChainKeys = Object.values(tokens).reduce((sum, keys) => sum + keys.length, 0);
                    const chainLogo = getChainLogo(chainName);
                    const isChainExpanded = expandedChains[chainName];

                    return (
                      <Card
                        key={chainName}
                        sx={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 2,
                        }}
                      >
                        {/* Chain Header */}
                        <CardContent
                          onClick={() => toggleChain(chainName)}
                          sx={{
                            cursor: 'pointer',
                            p: 1.5,
                            bgcolor: 'rgba(102, 126, 234, 0.05)',
                            '&:hover': {
                              bgcolor: 'rgba(102, 126, 234, 0.1)',
                            },
                            '&:last-child': { pb: 1.5 },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              {chainLogo && (
                                <Box
                                  component="img"
                                  src={chainLogo}
                                  alt={chainName}
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    objectFit: 'contain',
                                  }}
                                />
                              )}
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 600, color: 'white' }}>
                                  {chainName}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                  {(() => {
                                    const allKeys = Object.values(tokens).flat();
                                    const usedCount = allKeys.filter(k => k.isUsed).length;
                                    const totalCount = allKeys.length;
                                    return `${usedCount} used / ${totalCount} total`;
                                  })()}
                                </Typography>
                              </Box>
                            </Box>
                            {isChainExpanded ? <ExpandLess /> : <ExpandMore />}
                          </Box>
                        </CardContent>

                        {/* Chain Content - Tokens */}
                        <Collapse in={isChainExpanded} timeout="auto" unmountOnExit>
                          <CardContent sx={{ p: 1.5, pt: 0 }}>
                            <Stack spacing={1} sx={{ mt: 1 }}>
                              {Object.entries(tokens).map(([tokenSymbol, keys]) => {
                                const tokenKey = `${chainName}-${tokenSymbol}`;
                                const isTokenExpanded = expandedTokens[tokenKey];
                                const tokenLogo = getTokenLogo(tokenSymbol);

                                return (
                                  <Card
                                    key={tokenSymbol}
                                    sx={{
                                      background: 'rgba(255, 255, 255, 0.03)',
                                      border: '1px solid rgba(255, 255, 255, 0.08)',
                                      borderRadius: 1.5,
                                    }}
                                  >
                                    {/* Token Header */}
                                    <CardContent
                                      onClick={() => toggleToken(chainName, tokenSymbol)}
                                      sx={{
                                        cursor: 'pointer',
                                        p: 1.5,
                                        '&:last-child': { pb: 1.5 },
                                        '&:hover': {
                                          bgcolor: 'rgba(255, 255, 255, 0.02)',
                                        },
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          {tokenLogo && (
                                            <Box
                                              component="img"
                                              src={tokenLogo}
                                              alt={tokenSymbol}
                                              sx={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: '50%',
                                                objectFit: 'contain',
                                              }}
                                            />
                                          )}
                                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                                            {tokenSymbol}
                                          </Typography>
                                          <Chip
                                            label={(() => {
                                              const usedCount = keys.filter(k => k.isUsed).length;
                                              const totalCount = keys.length;
                                              return `${usedCount} used / ${totalCount} total`;
                                            })()}
                                            size="small"
                                            sx={{
                                              bgcolor: 'rgba(0, 230, 118, 0.15)',
                                              color: '#00e676',
                                              fontWeight: 600,
                                              fontSize: '0.65rem',
                                              height: 18,
                                            }}
                                          />
                                        </Box>
                                        {isTokenExpanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                                      </Box>
                                    </CardContent>

                                    {/* Token Content - Individual Keys */}
                                    <Collapse in={isTokenExpanded} timeout="auto" unmountOnExit>
                                      <Box sx={{ px: 1.5, pb: 1.5 }}>
                                        <Stack spacing={1}>
                                          {keys.map((key) => (
                                            <Card
                                              key={key.keyIndex}
                                              sx={{
                                                background: key.isUsed ? 'rgba(255, 82, 82, 0.05)' : 'rgba(0, 230, 118, 0.05)',
                                                border: key.isUsed ? '1px solid rgba(255, 82, 82, 0.2)' : '1px solid rgba(0, 230, 118, 0.2)',
                                                borderRadius: 1,
                                              }}
                                            >
                                              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                  <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                      <Typography
                                                        variant="body2"
                                                        sx={{
                                                          fontWeight: 600,
                                                          color: 'white',
                                                          opacity: key.isUsed ? 0.5 : 1,
                                                        }}
                                                      >
                                                        Key #{key.keyIndex}: {key.denomination} {tokenSymbol}
                                                      </Typography>
                                                      <Typography
                                                        variant="caption"
                                                        sx={{
                                                          color: key.isUsed ? '#ff5252' : '#00e676',
                                                          fontWeight: 600,
                                                        }}
                                                      >
                                                        {key.isUsed ? '❌ Used' : '✅ Available'}
                                                      </Typography>
                                                    </Box>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block' }}>
                                                      Merkle Root: {key.merkleRoot ? `${key.merkleRoot.slice(0, 10)}...${key.merkleRoot.slice(-6)}` : 'Not available'}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block' }}>
                                                      Address: {(key.ethereum_address || key.solana_address) ? `${(key.ethereum_address || key.solana_address).slice(0, 10)}...${(key.ethereum_address || key.solana_address).slice(-6)}` : 'N/A'}
                                                    </Typography>
                                                  </Box>
                                                  <Tooltip title={key.isUsed ? 'Key already used' : `Save key ${key.keyIndex}`}>
                                                    <span>
                                                      <IconButton
                                                        size="small"
                                                        onClick={() => handleDownloadKeys(key.keyIndex, key.deposit)}
                                                        disabled={key.isUsed}
                                                        sx={{
                                                          color: key.isUsed ? 'rgba(255, 255, 255, 0.3)' : '#4facfe',
                                                          '&:hover': {
                                                            bgcolor: 'rgba(79, 172, 254, 0.1)',
                                                          },
                                                        }}
                                                      >
                                                        <Download fontSize="small" />
                                                      </IconButton>
                                                    </span>
                                                  </Tooltip>
                                                </Box>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </Stack>
                                      </Box>
                                    </Collapse>
                                  </Card>
                                );
                              })}
                            </Stack>
                          </CardContent>
                        </Collapse>
                      </Card>
                    );
                  })}
                </Stack>
              );
            })()}
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Key to Withdraw</InputLabel>
            <Select
              value={selectedKeyIndex !== null ? selectedKeyIndex : ''}
              onChange={(e) => setSelectedKeyIndex(e.target.value === '' ? null : parseInt(e.target.value))}
              disabled={withdrawing}
            >
              {availableKeys.map((key) => (
                <MenuItem key={key.keyIndex} value={key.keyIndex} disabled={key.isUsed}>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ opacity: key.isUsed ? 0.5 : 1 }}>
                        Key {key.keyIndex}: {key.denomination} {key.token_symbol || 'ETH'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={key.isUsed ? "error.main" : "success.main"}
                      >
                        {key.isUsed ? "❌ Used" : "✅ Available"}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Chain: {key.chain_name || 'localhost'} | {key.token_symbol || 'ETH'}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Current Signing Wallet:</strong> {account}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Switch to a different wallet in MetaMask if you want to sign with a different address.
            </Typography>
          </Alert>

          <TextField
            fullWidth
            label="Recipient Address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
            helperText="Enter the address to receive the withdrawal. For privacy, this can be different from your deposit address."
            sx={{ mb: 2 }}
            disabled={withdrawing}
          />

          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>✅ Ready to Withdraw:</strong>
            </Typography>
            <Typography variant="body2" component="div">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Select any available key to withdraw</li>
                <li>Specify recipient address (can be different from deposit address)</li>
                <li>Use any wallet to sign the transaction</li>
                <li>Keys can only be used once - used keys will be marked</li>
              </ul>
            </Typography>
          </Alert>

          {withdrawing && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                Processing withdrawal...
              </Box>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawDialog(false)} disabled={withdrawing}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={executeWithdrawal}
            disabled={withdrawing}
            startIcon={withdrawing ? <CircularProgress size={16} /> : <GetApp />}
          >
            {withdrawing ? 'Withdrawing...' : 'Withdraw to Wallet'}
          </Button>
        </DialogActions>
      </Dialog >


      {/* Hidden file input for uploading keys */}
      < input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".enc,.json"
        style={{ display: 'none' }}
      />

      {/* Password dialog for encryption/decryption */}
      <PasswordDialog
        open={passwordDialog}
        onClose={() => {
          setPasswordDialog(false);
          setDownloadKeyIndex(null);
        }}
        onConfirm={passwordDialogMode === 'download' ? downloadKeysWithPassword : uploadKeysWithPassword}
        title={
          passwordDialogMode === 'download'
            ? (downloadKeyIndex !== null ? `Encrypt Key ${downloadKeyIndex} for Saving` : 'Encrypt All Keys for Saving')
            : 'Decrypt Keys from File'
        }
        description={
          passwordDialogMode === 'download'
            ? (downloadKeyIndex !== null
              ? `Enter a password to encrypt key ${downloadKeyIndex}. You will need this password to decrypt the key later.`
              : 'Enter a password to encrypt all keys. You will need this password to decrypt the keys later.')
            : 'Enter the password used to encrypt this key file.'
        }
        confirmButtonText={passwordDialogMode === 'download' ? 'Save' : 'Load Keys'}
      />

      {/* Error Dialog */}
      <Dialog
        open={errorDialog}
        onClose={() => setErrorDialog(false)}
        maxWidth="sm"
      >
        <DialogTitle>
          {errorDetails.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {errorDetails.technicalDetails}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialog(false)} variant="contained" color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default Dashboard;