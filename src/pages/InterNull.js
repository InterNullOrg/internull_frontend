import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  FormHelperText,
  InputAdornment,
} from '@mui/material';
import {
  ShoppingCart,
  AccountBalanceWallet,
  CheckCircle,
  SwapHoriz,
  Toll,
  HourglassEmpty,
  Error as ErrorIcon,
  Launch,
  ContentCopy,
  VpnKey,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

import { useWallet } from '../hooks/useWallet';
import { useWallet as useSolWallet, useConnection } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import depositTracker from '../services/depositTracker';
import multiTokenTreasuryService from '../services/multiTokenTreasuryService';
import solanaInternullService from '../services/solanaInternullService';

// Contract addresses and supported chains are now loaded dynamically from backend
// via multiTokenTreasuryService.loadChainsFromBackend()

const InterNull = () => {
  const navigate = useNavigate();
  const { connected, account, chainId, sendTransaction, signer, provider, connectWallet } = useWallet();
  const { publicKey: solanaPublicKey, connected: solanaConnected, sendTransaction: solanaSendTransaction } = useSolWallet();
  const { connection: solanaConnection } = useConnection();

  const [selectedChainId, setSelectedChainId] = useState(''); // No default selection
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [selectedDenomination, setSelectedDenomination] = useState('');
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reservation, setReservation] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [txHash, setTxHash] = useState('');
  const [depositDialog, setDepositDialog] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [supportedChains, setSupportedChains] = useState([]);
  const [targetChain, setTargetChain] = useState('');
  const [crossChainMode, setCrossChainMode] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [depositProgressDialog, setDepositProgressDialog] = useState(false);
  const [depositStatus, setDepositStatus] = useState(''); // 'pending', 'confirming', 'confirmed', 'failed'

  // Store completed deposit info for display
  const [completedDeposit, setCompletedDeposit] = useState(null);

  const steps = crossChainMode
    ? ['Select Token & Chain', 'Make Deposit', 'Request Cross-Chain Keys']
    : ['Select Token & Amount', 'Make Deposit', 'Verify & Request Keys'];

  // Load chains on mount - no wallet needed
  useEffect(() => {
    const loadChainsOnMount = async () => {
      try {
        await multiTokenTreasuryService.loadChainsFromBackend();
        await loadChains();
      } catch (error) {
        console.error('Failed to load chains:', error);
        toast.error('Failed to load chains. Please refresh the page.');
      }
    };

    loadChainsOnMount();
  }, []); // Run once on mount

  // Don't auto-load tokens - they will be loaded when user clicks "Make Deposit" and wallet connects
  // Tokens loading is now triggered by wallet connection in handleRequestKey

  // Availability check removed - users can deposit any amount regardless of backend key availability
  // Keys are only needed for withdrawal, not deposit
  // useEffect(() => {
  //   if (selectedToken && selectedDenomination) {
  //     checkAvailability();
  //   }
  // }, [selectedToken, selectedDenomination]);

  // Don't automatically check wallet balance - it will be checked after user clicks "Make Deposit"
  // Automatic balance checking was causing unwanted wallet connections and account switches
  // useEffect(() => {
  //   if (selectedToken && provider && account) {
  //     checkWalletBalance();
  //   }
  // }, [selectedToken, provider, account]);

  const checkWalletBalance = async () => {
    if (!selectedToken || !provider || !account) return;

    try {
      const token = tokens.find(t => t.address === selectedToken);
      if (!token) return;

      let balance;
      if (token.isNative || token.address === '0x0000000000000000000000000000000000000000') {
        // Get native token balance (ETH, BNB, etc.)
        const balanceWei = await provider.getBalance(account);
        balance = ethers.utils.formatEther(balanceWei);
      } else {
        // Get ERC20 token balance
        const tokenContract = new ethers.Contract(
          token.address,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );
        const balanceWei = await tokenContract.balanceOf(account);
        balance = ethers.utils.formatUnits(balanceWei, token.decimals);
      }

      setWalletBalance(parseFloat(balance));
      console.log(`💰 Wallet balance: ${balance} ${token.symbol}`);
    } catch (error) {
      console.error('Failed to check wallet balance:', error);
      setWalletBalance(null);
    }
  };

  const loadTokens = async (chainId) => {
    // Use the passed chainId parameter instead of state to avoid async state issues
    const targetChainId = chainId || selectedChainId;
    console.log('🔗 [Purchase.js] Loading supported tokens for chain:', targetChainId, typeof targetChainId);

    try {
      const supportedTokens = await multiTokenTreasuryService.getSupportedTokens(targetChainId);
      console.log('📋 [Purchase.js] Received tokens from service:', supportedTokens);

      setTokens(supportedTokens);

      // Auto-select native token based on chain
      const chainInfo = supportedChains.find(c => c.chainId === targetChainId);
      console.log('🔍 [Purchase.js] Chain info:', chainInfo);
      const nativeSymbol = chainInfo?.nativeCurrency || chainInfo?.symbol || 'ETH';
      const defaultToken = supportedTokens.find(t =>
        t.symbol === nativeSymbol ||
        t.isNative ||
        t.address === '0x0000000000000000000000000000000000000000' ||
        t.address === '11111111111111111111111111111111'
      );

      console.log('🔍 [Purchase.js] Looking for default native token:', nativeSymbol, 'Found:', defaultToken);

      if (defaultToken) {
        setSelectedToken(defaultToken.address);
        console.log('✅ [Purchase.js] Auto-selected token:', defaultToken.symbol);
      } else if (supportedTokens.length > 0) {
        // If no native token found, select the first token
        setSelectedToken(supportedTokens[0].address);
        console.log('✅ [Purchase.js] Auto-selected first token:', supportedTokens[0].symbol);
      }

      console.log('✅ [Purchase.js] Tokens loaded and set:', supportedTokens.map(t => t.symbol));
    } catch (error) {
      console.error('[Purchase.js] Failed to load tokens:', error);
      // Fallback to native token based on selected chain
      const chainInfo = supportedChains.find(c => c.chainId === targetChainId);
      const fallbackSymbol = chainInfo?.nativeCurrency || chainInfo?.symbol || 'ETH';
      const fallbackName = fallbackSymbol === 'BNB' || fallbackSymbol === 'tBNB' ? 'Binance Coin' :
        fallbackSymbol === 'SOL' ? 'Solana' : 'Ethereum';

      console.log('⚠️ [Purchase.js] Using fallback token:', fallbackSymbol);

      const fallbackTokens = [{
        address: fallbackSymbol === 'SOL' ? '11111111111111111111111111111111' : '0x0000000000000000000000000000000000000000',
        symbol: fallbackSymbol,
        name: fallbackName,
        decimals: fallbackSymbol === 'SOL' ? 9 : 18,
        chainId: targetChainId,
        isNative: true,
        denominations: [0.001, 0.01, 0.1, 0.5, 1.0]
      }];
      setTokens(fallbackTokens);
      setSelectedToken(fallbackTokens[0].address);

      console.log('✅ [Purchase.js] Fallback token set:', fallbackTokens[0]);
    }
  };

  const loadChains = async () => {
    const chains = await multiTokenTreasuryService.getSupportedChains();
    console.log('📋 Loaded chains from backend:', chains);

    // Format chains for the UI
    const formattedChains = chains.map(chain => ({
      chainId: chain.chainId,
      name: chain.name,
      symbol: chain.nativeCurrency || 'ETH',
      treasuryAddress: chain.treasuryAddress,
      chainType: chain.chainType || 'evm'
    }));

    setSupportedChains(formattedChains);
    // Don't set a default chain - user must select one
  };

  const loadSolanaTokens = async (chainId) => {
    const targetChainId = chainId || selectedChainId;
    console.log('🌟 [Purchase.js] Loading Solana tokens for chain:', targetChainId);

    try {
      const supportedTokens = await solanaInternullService.getSupportedTokens();
      console.log('📋 [Purchase.js] Received Solana tokens:', supportedTokens);

      setTokens(supportedTokens);

      // Auto-select SOL as default
      const defaultToken = supportedTokens.find(t => t.symbol === 'SOL' || t.isNative);

      if (defaultToken) {
        setSelectedToken(defaultToken.address);
        console.log('✅ [Purchase.js] Auto-selected Solana token:', defaultToken.symbol);
      }

      console.log('✅ [Purchase.js] Solana tokens loaded:', supportedTokens.map(t => t.symbol));
    } catch (error) {
      console.error('[Purchase.js] Failed to load Solana tokens:', error);
      // Fallback to default SOL token
      const fallbackTokens = [{
        address: '11111111111111111111111111111111',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        chainId: targetChainId,
        isNative: true,
        denominations: [0.1, 1, 10]
      }];
      setTokens(fallbackTokens);
      setSelectedToken(fallbackTokens[0].address);

      console.log('✅ [Purchase.js] Fallback Solana token set:', fallbackTokens[0]);
    }
  };

  const checkAvailability = async () => {
    if (!selectedToken || !selectedDenomination) {
      setAvailability(null);
      return;
    }

    const depositAmount = parseFloat(selectedDenomination);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setAvailability(null);
      return;
    }

    try {
      const token = tokens.find(t => t.address === selectedToken);
      if (!token) {
        setAvailability(null);
        return;
      }

      console.log('🔍 Checking availability for:', {
        token: token.symbol,
        amount: depositAmount,
        targetChain: crossChainMode ? targetChain : chainId
      });

      // Check availability through service
      const result = await multiTokenTreasuryService.checkKeyAvailability(
        selectedToken,
        depositAmount
      );

      setAvailability({
        ...result,
        token: token.symbol,
        crossChain: crossChainMode,
        targetChain: crossChainMode ? targetChain : chainId
      });

      console.log('✅ Availability:', result);
    } catch (error) {
      console.error('Failed to check availability:', error);
      setAvailability(null);
    }
  };

  const handleRequestKey = async () => {
    if (!selectedChainId) {
      toast.error('Please select a network first');
      return;
    }

    if (!selectedDenomination) {
      toast.error('Please enter a deposit amount');
      return;
    }

    const depositAmount = parseFloat(selectedDenomination);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    // Detect chain type
    const selectedChain = supportedChains.find(c => c.chainId === selectedChainId);
    const isSolana = selectedChain?.chainType === 'solana' ||
      selectedChain?.name?.toLowerCase().includes('solana') ||
      typeof selectedChainId === 'string' && selectedChainId.toLowerCase().includes('solana');

    try {
      setLoading(true);

      // Get the selected token
      const token = tokens.find(t => t.address === selectedToken);
      if (!token) {
        toast.error('Please select a token');
        setLoading(false);
        return;
      }

      // Connect appropriate wallet based on chain type
      if (isSolana) {
        // Solana chain - check if Phantom is connected
        if (!solanaConnected || !solanaPublicKey) {
          toast.info('Please connect your Phantom wallet using the button in the header');
          setLoading(false);
          return;
        }

        console.log('✅ Solana wallet connected:', solanaPublicKey.toString());
      } else {
        // EVM chain - connect MetaMask if not connected
        if (!connected || !account) {
          toast.info('Connecting to MetaMask...');
          await connectWallet(); // This will trigger MetaMask popup

          // Wait a moment for state to update
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Get MetaMask provider specifically to verify connection
          let metamaskProvider = null;
          if (window.ethereum) {
            if (window.ethereum.providers) {
              // Multiple wallets - find MetaMask
              metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
            } else if (window.ethereum.isMetaMask) {
              // Only MetaMask
              metamaskProvider = window.ethereum;
            }
          }

          if (!metamaskProvider || !metamaskProvider.selectedAddress) {
            toast.error('Failed to connect MetaMask. Please try again.');
            setLoading(false);
            return;
          }

          console.log('✅ MetaMask connected:', metamaskProvider.selectedAddress);
        } else {
          console.log('✅ MetaMask already connected:', account);
        }
      }

      // Get minimum denomination from token configuration
      // Use the smallest denomination from the token's supported denominations
      let minimumAmount = 0.001; // Default fallback (updated to support 0.001)
      if (token.denominations && token.denominations.length > 0) {
        // Check if denominations are in wei (large numbers) or already in token units (strings like "0.001")
        const firstDenom = token.denominations[0];
        let denominationsInTokens;

        if (typeof firstDenom === 'string' && firstDenom.includes('.')) {
          // Already in token units (e.g., "0.001", "0.01")
          denominationsInTokens = token.denominations.map(d => parseFloat(d));
        } else {
          // In wei format (large integers)
          denominationsInTokens = token.denominations.map(d => parseFloat(d) / (10 ** token.decimals));
        }

        minimumAmount = Math.min(...denominationsInTokens);
      } else {
        // Fallback to hardcoded minimums if denominations not available
        minimumAmount = token.isNative ? 0.001 : 0.1; // Default minimum (updated to 0.001)
      }

      if (depositAmount < minimumAmount) {
        toast.error(`Minimum deposit: ${minimumAmount} ${token.symbol}`);
        setLoading(false);
        return;
      }

      console.log('🎯 Creating reservation:', {
        token: token.symbol,
        amount: depositAmount,
        crossChain: crossChainMode,
        targetChain: targetChain
      });

      // Get the correct treasury address for the selected chain
      const treasuryAddress = multiTokenTreasuryService.getContractAddressForChain(selectedChainId);
      console.log('🏦 Treasury address for chain', selectedChainId, ':', treasuryAddress);

      // Create reservation
      const reservationData = {
        reservation_id: `res_${Date.now()}`,
        amount: depositAmount,
        token: token,
        tokenAddress: token.address,
        expiry: Date.now() + (15 * 60 * 1000),
        crossChain: crossChainMode,
        sourceChain: chainId,
        targetChain: crossChainMode ? targetChain : chainId,
        deposit_address: treasuryAddress || multiTokenTreasuryService.contractAddress
      };

      setReservation(reservationData);
      setActiveStep(1);
      console.log('✅ Reservation created:', reservationData);

    } catch (error) {
      console.error('Request key error:', error);
      toast.error(error.message || 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  // Add chain to MetaMask
  const handleAddChainToMetaMask = async (chainParams) => {
    if (!window.ethereum) {
      toast.error('MetaMask not detected. Please install MetaMask to add networks.');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [chainParams],
      });
      toast.success(`${chainParams.chainName} added to MetaMask successfully!`);
    } catch (error) {
      console.error('Error adding chain to MetaMask:', error);
      if (error.code === 4001) {
        toast.error('User rejected the request');
      } else {
        toast.error(`Failed to add ${chainParams.chainName}: ${error.message}`);
      }
    }
  };

  const handleDeposit = () => {
    setDepositDialog(true);
  };

  const executeDeposit = async () => {
    if (!reservation) return;

    try {
      setLoading(true);
      setDepositDialog(false); // Close confirmation dialog
      setDepositProgressDialog(true); // Open progress dialog
      setDepositStatus('pending');
      console.log('💰 Executing deposit:', reservation);

      // Detect if the selected chain is Solana
      const selectedChain = supportedChains.find(c => c.chainId === selectedChainId);
      const isSolana = selectedChain?.name?.toLowerCase().includes('solana') ||
        typeof selectedChainId === 'string' && selectedChainId.toLowerCase().includes('solana');

      console.log('🔍 Chain detection:', {
        selectedChain,
        selectedChainId,
        isSolana,
        solanaConnected,
        evmConnected: connected
      });

      // Branch based on chain type
      if (isSolana) {
        // Solana deposit logic
        console.log('🌟 Processing Solana deposit...');

        if (!solanaConnected || !solanaPublicKey) {
          throw new Error('Solana wallet not connected. Please connect your Phantom wallet.');
        }

        const depositAmount = reservation.amount;
        const token = reservation.token;
        const isNativeSOL = token.isNative || token.symbol === 'SOL';

        console.log('💰 Depositing:', depositAmount, token.symbol);
        console.log('Token details:', {
          symbol: token.symbol,
          address: token.address,
          decimals: token.decimals,
          isNative: isNativeSOL
        });

        // Use backend RPC for better performance if available
        let connectionToUse = solanaConnection;
        const backendRpcUrl = multiTokenTreasuryService.getRpcUrlByChainName('solana-devnet');
        if (backendRpcUrl) {
          console.log('🔗 Using backend RPC for Solana deposit:', backendRpcUrl);
          connectionToUse = new Connection(backendRpcUrl, 'confirmed');
        } else {
          console.log('🔗 Using default Solana connection for deposit');
        }

        // Initialize Solana service with the chosen connection
        await solanaInternullService.initialize(connectionToUse, {
          publicKey: solanaPublicKey,
          sendTransaction: solanaSendTransaction
        });

        // Execute Solana deposit - use appropriate method based on token type
        let result;
        if (isNativeSOL) {
          console.log('📤 Calling depositNative for SOL...');
          result = await solanaInternullService.depositNative(depositAmount);
        } else {
          console.log(`📤 Calling depositToken for ${token.symbol}...`);
          result = await solanaInternullService.depositToken(
            depositAmount,
            token.address,
            token.decimals
          );
        }

        if (result && result.success) {
          setTxHash(result.txHash);
          setDepositStatus('confirming');

          // Track the deposit
          const deposit = depositTracker.addDeposit(
            result.txHash,
            reservation.amount,
            solanaPublicKey.toString(),
            'solana-devnet',
            {
              token: token.symbol,
              tokenAddress: isNativeSOL ? 'native' : token.address,
              crossChain: reservation.crossChain,
              targetChain: reservation.targetChain
            }
          );

          console.log('📊 Solana deposit tracked:', deposit);
          toast.success('Solana transaction submitted!');

          // Wait for Solana confirmation
          try {
            console.log('⏳ Waiting for Solana confirmation...');
            const confirmation = await solanaConnection.confirmTransaction(result.txHash, 'confirmed');

            if (!confirmation.value.err) {
              setDepositStatus('confirmed');
              toast.success('Solana deposit confirmed!');

              // Store completed deposit info for key request
              setCompletedDeposit({
                txHash: result.txHash,
                amount: reservation.amount,
                userAddress: solanaPublicKey.toString(),
                chainId: selectedChainId,
                token: token
              });

              setTimeout(() => {
                setDepositProgressDialog(false);
                setActiveStep(2);
              }, 2000);
            } else {
              throw new Error('Solana transaction failed on-chain');
            }
          } catch (confirmError) {
            console.error('Solana confirmation error:', confirmError);
            setDepositStatus('confirmed'); // Still move forward
            toast.warning('Could not verify confirmation automatically. Please check Solana Explorer.');

            // Store completed deposit info for key request
            setCompletedDeposit({
              txHash: result.txHash,
              amount: reservation.amount,
              userAddress: solanaPublicKey.toString(),
              chainId: selectedChainId,
              token: token
            });

            setTimeout(() => {
              setDepositProgressDialog(false);
              setActiveStep(2);
            }, 2000);
          }
        } else {
          throw new Error('Solana deposit failed');
        }
      } else {
        // EVM deposit logic (existing)
        if (!signer) {
          throw new Error('EVM wallet not connected');
        }

        const depositAmount = reservation.amount;
        const isEth = reservation.tokenAddress === '0x0000000000000000000000000000000000000000';

        console.log('💰 Depositing:', depositAmount, isEth ? 'ETH' : 'tokens');
        console.log('📊 Token address:', reservation.tokenAddress);
        console.log('🔐 Wallet connection status:', { connected, account, signer, chainId });

        // Check wallet connection first
        if (!connected || !account) {
          throw new Error('Wallet not connected');
        }

        // Check if wallet is on the correct network and switch if needed
        console.log(`🔍 Network check: Wallet is on chainId ${chainId}, need chainId ${selectedChainId}`);

        if (chainId !== selectedChainId) {
          console.log(`⚠️ Network mismatch! Switching from ${chainId} to ${selectedChainId}...`);

          try {
            // Get MetaMask provider specifically (not Phantom)
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
              throw new Error('MetaMask not found. Please install MetaMask to deposit on EVM chains.');
            }

            // Request network switch from MetaMask specifically
            await metamaskProvider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${selectedChainId.toString(16)}` }],
            });

            // Wait for the switch to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Refresh provider and signer after switch (use MetaMask provider)
            const newProvider = new ethers.providers.Web3Provider(metamaskProvider);
            const newSigner = await newProvider.getSigner();
            const newChainId = (await newProvider.getNetwork()).chainId;

            console.log(`✅ Switched to network ${newChainId}`);

            // Verify the switch was successful
            if (newChainId !== selectedChainId) {
              throw new Error(`Network switch failed. Expected ${selectedChainId}, got ${newChainId}`);
            }

            // Use the new provider and signer
            const treasuryAddress = multiTokenTreasuryService.getContractAddressForChain(selectedChainId);
            if (!treasuryAddress) {
              throw new Error(`Treasury contract not configured for chain ${selectedChainId}`);
            }

            console.log('🔧 Initializing treasury service with address:', treasuryAddress);
            await multiTokenTreasuryService.initialize(newProvider, newSigner, treasuryAddress);

          } catch (switchError) {
            console.error('Network switch error:', switchError);

            // Define proper RPC URLs for each chain - use multiple fallbacks
            const getRpcUrlsForChain = (chainId) => {
              const rpcUrls = {
                97: [ // BNB Testnet - multiple fallbacks
                  'https://bsc-testnet-rpc.publicnode.com',
                  'https://bsc-testnet.public.blastapi.io',
                  'https://data-seed-prebsc-1-s1.binance.org:8545',
                  'https://data-seed-prebsc-2-s1.binance.org:8545'
                ],
                56: ['https://bsc-dataseed.binance.org', 'https://bsc-rpc.publicnode.com'], // BNB Mainnet
                11155111: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'], // Sepolia
                1: ['https://ethereum-rpc.publicnode.com', 'https://rpc.ankr.com/eth'], // Ethereum Mainnet
                137: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'], // Polygon Mainnet
                80001: ['https://rpc-mumbai.maticvigil.com'] // Polygon Mumbai Testnet
              };
              return rpcUrls[chainId] || [];
            };

            const getBlockExplorerForChain = (chainId) => {
              const explorers = {
                97: ['https://testnet.bscscan.com'],
                56: ['https://bscscan.com'],
                11155111: ['https://sepolia.etherscan.io'],
                1: ['https://etherscan.io'],
                137: ['https://polygonscan.com'],
                80001: ['https://mumbai.polygonscan.com']
              };
              return explorers[chainId] || [];
            };

            if (switchError.code === 4902 || switchError.message?.includes('not connected to the requested chain')) {
              // Chain not added to MetaMask, try to add it
              const chainInfo = supportedChains.find(c => c.chainId === selectedChainId);
              if (chainInfo) {
                try {
                  // Get MetaMask provider specifically (not Phantom)
                  let metamaskProvider = null;
                  if (window.ethereum) {
                    if (window.ethereum.providers) {
                      metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
                    } else if (window.ethereum.isMetaMask) {
                      metamaskProvider = window.ethereum;
                    }
                  }

                  if (!metamaskProvider) {
                    throw new Error('MetaMask not found. Please install MetaMask to deposit on EVM chains.');
                  }

                  console.log(`📝 Adding ${chainInfo.name} to MetaMask...`);
                  await metamaskProvider.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                      chainId: `0x${selectedChainId.toString(16)}`,
                      chainName: chainInfo.name,
                      nativeCurrency: {
                        name: chainInfo.symbol,
                        symbol: chainInfo.symbol,
                        decimals: 18
                      },
                      rpcUrls: getRpcUrlsForChain(selectedChainId),
                      blockExplorerUrls: getBlockExplorerForChain(selectedChainId)
                    }],
                  });

                  console.log(`✅ Chain added successfully. Waiting for MetaMask to switch...`);

                  // Wait for the add to complete
                  await new Promise(resolve => setTimeout(resolve, 2000));

                  // Refresh provider and signer after adding chain (use MetaMask provider)
                  const newProvider = new ethers.providers.Web3Provider(metamaskProvider);
                  const newSigner = await newProvider.getSigner();
                  const newChainId = (await newProvider.getNetwork()).chainId;

                  console.log(`✅ Now on network ${newChainId}`);

                  // Initialize treasury service with new provider
                  const treasuryAddress = multiTokenTreasuryService.getContractAddressForChain(selectedChainId);
                  if (!treasuryAddress) {
                    throw new Error(`Treasury contract not configured for chain ${selectedChainId}`);
                  }

                  console.log('🔧 Initializing treasury service with address:', treasuryAddress);
                  await multiTokenTreasuryService.initialize(newProvider, newSigner, treasuryAddress);

                } catch (addError) {
                  console.error('Failed to add chain:', addError);
                  throw new Error(`Please add ${chainInfo.name} to MetaMask manually and try again`);
                }
              } else {
                throw new Error(`Chain ${selectedChainId} not found in configuration`);
              }
            } else if (switchError.code === 4001) {
              throw new Error('Network switch rejected by user');
            } else {
              throw new Error(`Failed to switch to ${supportedChains.find(c => c.chainId === selectedChainId)?.name || selectedChainId}. Please switch manually in MetaMask.`);
            }
          }
        } else {
          // Already on correct network
          const treasuryAddress = multiTokenTreasuryService.getContractAddressForChain(selectedChainId);
          if (!treasuryAddress) {
            throw new Error(`Treasury contract not configured for chain ${selectedChainId}`);
          }

          console.log('🔧 Initializing treasury service with address:', treasuryAddress);
          await multiTokenTreasuryService.initialize(provider, signer, treasuryAddress);
        }

        // Check wallet balance
        if (walletBalance !== null && depositAmount > walletBalance) {
          throw new Error(`Insufficient balance. You have ${walletBalance.toFixed(4)} ${reservation.token.symbol} but trying to deposit ${depositAmount} ${reservation.token.symbol}`);
        }

        // Call the multitoken treasury service deposit function
        console.log('📝 Calling deposit function...');

        const result = await multiTokenTreasuryService.deposit(
          reservation.tokenAddress,
          depositAmount // Pass the amount as a string
        );

        console.log('💰 Deposit result:', result);

        if (result && result.success) {
          setTxHash(result.txHash);
          setDepositStatus('confirmed'); // Immediately mark as confirmed when we get tx hash

          // IMPORTANT: Use selectedChainId (the chain we actually deposited on) not chainId (which might be stale)
          console.log('💾 Saving deposit with chainId:', selectedChainId, 'NOT:', chainId);

          // Track the deposit as confirmed (no need to wait for blockchain verification)
          const deposit = depositTracker.addDeposit(
            result.txHash,
            reservation.amount,
            account,
            selectedChainId, // Use selectedChainId instead of chainId
            {
              token: reservation.token.symbol,
              tokenAddress: reservation.tokenAddress,
              crossChain: reservation.crossChain,
              targetChain: reservation.targetChain || selectedChainId
            }
          );

          // Immediately update status to confirmed
          depositTracker.updateDepositStatus(result.txHash, 'confirmed');

          console.log('📊 Deposit tracked and confirmed:', deposit);

          // Store completed deposit info for key request
          setCompletedDeposit({
            txHash: result.txHash,
            amount: reservation.amount,
            userAddress: account,
            chainId: selectedChainId,
            token: reservation.token
          });

          toast.success(`Deposit successful! Transaction: ${result.txHash.slice(0, 10)}...`);

          // Move to next step after showing success
          setTimeout(() => {
            setDepositProgressDialog(false);
            setActiveStep(2);
          }, 2000);
        } else {
          throw new Error('Deposit failed');
        }
      } // End of EVM deposit logic

    } catch (error) {
      console.error('❌ Deposit error:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error reason:', error.reason);
      console.error('❌ Error data:', error.data);

      // Try to extract the actual error from JSON-RPC response
      let actualError = error;
      if (error.error && error.error.message) {
        actualError = error.error;
      }

      console.error('❌ Actual error:', actualError);

      let errorMessage = 'Deposit transaction failed';

      // Check for specific error patterns
      if (error.code === -32603) {
        errorMessage = 'Internal JSON-RPC error - this usually means insufficient gas or contract revert';

        // Try to parse the error data
        if (error.data && error.data.message) {
          errorMessage = `Transaction failed: ${error.data.message}`;
        } else if (actualError.message) {
          errorMessage = `Transaction failed: ${actualError.message}`;
        }
      } else if (error.message.includes('User rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.message.includes('Wallet not connected')) {
        errorMessage = 'Please connect your wallet';
      } else if (error.message.includes('Use deposit() function')) {
        errorMessage = 'Contract requires using deposit() function';
      } else if (error.reason) {
        errorMessage = `Transaction failed: ${error.reason}`;
      } else if (error.message) {
        errorMessage = `Transaction failed: ${error.message}`;
      }

      // Log the transaction details for debugging
      console.error('❌ Failed transaction details:', {
        to: process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        value: reservation?.amount || 'unknown',
        data: '0xd0e30db0'
      });

      setDepositStatus('failed');
      toast.error(error.message || 'Deposit failed');

      // Close progress dialog after showing error
      setTimeout(() => {
        setDepositProgressDialog(false);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndClaim = async () => {
    if (!reservation || !txHash || !account) return;

    try {
      setVerifying(true);

      if (reservation.crossChain) {
        // Request cross-chain keys
        console.log('🔐 Requesting cross-chain keys...');

        const result = await multiTokenTreasuryService.requestCrossChainKeys(
          txHash,
          reservation.sourceChain,
          reservation.targetChain,
          reservation.token.symbol,
          [reservation.amount.toString()]
        );

        if (result.success) {
          toast.success(`Cross-chain keys requested! Request ID: ${result.request_id}`);
          toast.info('Keys will be available on the target chain after processing.');
        } else {
          throw new Error(result.error || 'Failed to request cross-chain keys');
        }
      } else {
        // Regular key request
        toast.success('Deposit verified! Go to Dashboard to request withdrawal keys.');
      }

      // Reset form
      setActiveStep(0);
      setReservation(null);
      setTxHash('');
      setSelectedToken('');
      setSelectedDenomination('');
      setCrossChainMode(false);

    } catch (error) {
      toast.error(error.message || 'Failed to process request');
    } finally {
      setVerifying(false);
    }
  };

  const getSelectedTokenInfo = () => {
    if (!selectedToken) return null;
    return tokens.find(t => t.address === selectedToken);
  };

  const getExplorerUrl = (txHash) => {
    if (!txHash) return '';

    // Check if current chain is Solana
    const selectedChain = supportedChains.find(c => c.chainId === selectedChainId);
    const isSolana = selectedChain?.name?.toLowerCase().includes('solana') ||
      typeof selectedChainId === 'string' && selectedChainId.toLowerCase().includes('solana');

    if (isSolana) {
      // Solana Explorer URLs
      if (selectedChainId?.includes('mainnet')) {
        return `https://explorer.solana.com/tx/${txHash}`;
      } else {
        // Devnet by default
        return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
      }
    }

    // EVM Explorer URLs
    if (chainId === 11155111) {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    } else if (chainId === 97) {
      return `https://testnet.bscscan.com/tx/${txHash}`;
    } else if (chainId === 31337) {
      return `http://localhost:8545/tx/${txHash}`;
    } else {
      return `https://etherscan.io/tx/${txHash}`;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };


  const handleChainSwitch = async (newChainId) => {
    try {
      setLoading(true);
      await multiTokenTreasuryService.switchChain(newChainId);
      setTargetChain(newChainId);
      toast.success('Chain switched successfully');
    } catch (error) {
      console.error('Chain switch error:', error);
      toast.error('Failed to switch chain');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (expiryTime) => {
    if (!expiryTime) return '';

    const expiry = new Date(expiryTime);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleChainChange = async (event) => {
    const rawValue = event.target.value;
    // Keep as string if it's a string chain ID (Solana), otherwise convert to number (EVM)
    const newChainId = isNaN(rawValue) || typeof rawValue === 'string' && rawValue.includes('-') ? rawValue : Number(rawValue);

    setSelectedChainId(newChainId);
    setTargetChain(newChainId);

    // Reset form when changing chains
    setSelectedToken('');
    setSelectedDenomination('');
    setAvailability(null);
    setReservation(null);
    setActiveStep(0);
    setTokens([]);

    // Detect chain type
    const selectedChain = supportedChains.find(c => c.chainId === newChainId);
    const isSolana = selectedChain?.chainType === 'solana' ||
      selectedChain?.name?.toLowerCase().includes('solana') ||
      typeof newChainId === 'string' && newChainId.toLowerCase().includes('solana');

    console.log(`Chain selected: ${newChainId} (${isSolana ? 'Solana' : 'EVM'})`);

    // Load tokens for the selected chain immediately (without wallet connection)
    // IMPORTANT: Pass newChainId as parameter to avoid async state issues
    try {
      setLoading(true);
      if (isSolana) {
        console.log('🌟 Loading Solana tokens...');
        await loadSolanaTokens(newChainId);
      } else {
        console.log('🔗 Loading EVM tokens...');
        await loadTokens(newChainId);
      }
      console.log('✅ Tokens loaded for chain:', newChainId);
    } catch (error) {
      console.error('Failed to load tokens for chain:', error);
      toast.error('Failed to load tokens for this chain');
    } finally {
      setLoading(false);
    }
  };

  // Remove the wallet connection gate - allow users to see chains without connecting wallet first

  // Chain logos mapping - match exact backend names
  const getChainLogo = (chainName) => {
    if (chainName.toLowerCase().includes('sepolia') && chainName.toLowerCase().includes('base')) {
      return '/logos/base.png';
    } else if (chainName.toLowerCase().includes('sepolia')) {
      return '/logos/ethereum.png';
    } else if (chainName.toLowerCase().includes('polygon') || chainName.toLowerCase().includes('mumbai')) {
      return '/logos/polygon.png';
    } else if (chainName.toLowerCase().includes('bnb') || chainName.toLowerCase().includes('bsc')) {
      return '/logos/bnb.png';
    } else if (chainName.toLowerCase().includes('hyperliquid')) {
      return '/logos/hyperliquid.png';
    } else if (chainName.toLowerCase().includes('solana')) {
      return '/logos/solana.png';
    }
    return null;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0a0e27' }}>
      {/* Left Sidebar - Chain Selection */}
      <Box sx={{
        width: 220,
        bgcolor: '#151933',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        p: 2,
        overflowY: 'auto'
      }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, fontSize: '0.95rem', color: 'white' }}>
          Select Network
        </Typography>

        {supportedChains.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={30} sx={{ color: '#667eea' }} />
            <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.6)' }}>
              Loading networks...
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0.75}>
            {supportedChains.map((chain) => {
              const logoSrc = getChainLogo(chain.name);
              const isSelected = selectedChainId === chain.chainId;
              return (
                <Card
                  key={chain.chainId}
                  sx={{
                    cursor: 'pointer',
                    border: isSelected ? '1px solid #667eea' : '1px solid rgba(255, 255, 255, 0.1)',
                    bgcolor: isSelected ? 'rgba(102, 126, 234, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: isSelected ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      borderColor: isSelected ? '#667eea' : 'rgba(255, 255, 255, 0.2)',
                      transform: 'translateX(4px)',
                    }
                  }}
                  onClick={() => {
                    const event = { target: { value: chain.chainId } };
                    handleChainChange(event);
                  }}
                >
                  <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {logoSrc && (
                        <Box
                          component="img"
                          src={logoSrc}
                          alt={chain.name}
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            objectFit: 'contain',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: 'white',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {chain.name}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Right Side - Main Content */}
      <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 1: Select Token & Amount */}
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Enter Deposit Amount
                    </Typography>
                    {selectedChainId && (
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        <strong>Network:</strong> {supportedChains.find(c => c.chainId === selectedChainId)?.name || 'Select a network'}
                      </Typography>
                    )}

                    {!selectedChainId && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Please select a network from the dropdown above to continue
                      </Alert>
                    )}

                    {selectedChainId && (
                      <>
                        {/* Token Selector */}
                        {tokens.length > 0 && (
                          <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Select Token</InputLabel>
                            <Select
                              value={selectedToken}
                              label="Select Token"
                              onChange={(e) => setSelectedToken(e.target.value)}
                            >
                              {tokens.map(token => (
                                <MenuItem key={token.address} value={token.address}>
                                  {token.symbol} - {token.name}
                                </MenuItem>
                              ))}
                            </Select>
                            <FormHelperText>
                              Choose which token you want to deposit
                            </FormHelperText>
                          </FormControl>
                        )}

                        {/* Show loading state while tokens are being fetched */}
                        {loading && tokens.length === 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                            <CircularProgress size={30} />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                              Loading supported tokens...
                            </Typography>
                          </Box>
                        )}

                        {walletBalance !== null && (
                          <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              <strong>Wallet Balance:</strong> {walletBalance.toFixed(4)} {tokens.find(t => t.address === selectedToken)?.symbol || supportedChains.find(c => c.chainId === selectedChainId)?.symbol || 'ETH'}
                            </Typography>
                          </Alert>
                        )}

                        {/* Only show amount input if token is selected */}
                        {selectedToken && (
                          <TextField
                            fullWidth
                            type="number"
                            label={`Deposit Amount (${tokens.find(t => t.address === selectedToken)?.symbol || 'Token'})`}
                            value={selectedDenomination}
                            onChange={(e) => setSelectedDenomination(e.target.value)}
                            placeholder="Enter amount (e.g., 0.2, 1.5)"
                            helperText={
                              <Box>
                                <Typography variant="caption" display="block">
                                  💡 <strong>Minimum:</strong> 0.001 {tokens.find(t => t.address === selectedToken)?.symbol || 'Token'}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  🔐 <strong>Privacy tip:</strong> Deposit any amount ≥ 0.001
                                </Typography>
                                <Typography variant="caption" display="block">
                                  🔑 <strong>Note:</strong> Wallet will connect when you click "Make Deposit"
                                </Typography>
                              </Box>
                            }
                            InputProps={{
                              endAdornment: <InputAdornment position="end">
                                <Typography variant="body2" color="text.secondary">
                                  {tokens.find(t => t.address === selectedToken)?.symbol || 'Token'}
                                </Typography>
                              </InputAdornment>
                            }}
                            error={selectedDenomination && parseFloat(selectedDenomination) < 0.001}
                            sx={{ mb: 3 }}
                          />
                        )}
                      </>
                    )}

                    {availability && (
                      <Alert
                        severity={availability.available ? 'success' : 'warning'}
                        sx={{ mb: 2 }}
                      >
                        {availability.available
                          ? `✅ Ready to deposit ${availability.denomination} ${availability.token}. You'll receive multiple keys for various denominations.`
                          : `❌ Amount too small. Minimum deposit: 0.001 ${availability.token || 'ETH'}`
                        }
                      </Alert>
                    )}

                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleRequestKey}
                      disabled={
                        !selectedChainId ||
                        !selectedToken ||
                        !selectedDenomination ||
                        parseFloat(selectedDenomination) < 0.001 ||
                        isNaN(parseFloat(selectedDenomination)) ||
                        loading
                      }
                      startIcon={loading ? <CircularProgress size={20} /> : <ShoppingCart />}
                    >
                      {loading ? 'Processing...' : 'Make Deposit'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      How It Works
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        1. <strong>Select Network:</strong> Choose {supportedChains.find(c => c.chainId === selectedChainId)?.name || `Chain ${selectedChainId}`}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        2. <strong>Enter Amount:</strong> Minimum 0.001 {supportedChains.find(c => c.chainId === selectedChainId)?.symbol || 'ETH'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        3. <strong>Deposit:</strong> Send tokens to the treasury contract
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        4. <strong>Request Keys:</strong> Use scripts to get keyshares from DKG nodes
                      </Typography>
                      <Typography variant="body2">
                        5. <strong>Withdraw:</strong> Reconstruct keys for anonymous withdrawals
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Testnet Faucets Section */}
              <Grid item xs={12}>
                <Card sx={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      💧 Testnet Faucets & Network Setup
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      Get free testnet tokens to try out the treasury dashboard. Click on a faucet link to receive tokens, or use "Add to MetaMask" to quickly configure your wallet.
                    </Alert>

                    <Grid container spacing={2}>
                      {/* Ethereum Sepolia */}
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{
                          p: 2,
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          bgcolor: 'rgba(0,0,0,0.2)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Box
                              component="img"
                              src="https://cryptologos.cc/logos/ethereum-eth-logo.svg"
                              alt="Ethereum"
                              sx={{ width: 24, height: 24 }}
                            />
                            <Typography variant="subtitle1" fontWeight="bold">
                              Ethereum Sepolia
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            href="https://sepoliafaucet.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mb: 1 }}
                          >
                            Get Sepolia ETH
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            onClick={() => handleAddChainToMetaMask({
                              chainId: '0xaa36a7',
                              chainName: 'Sepolia',
                              nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                              rpcUrls: ['https://rpc.sepolia.org'],
                              blockExplorerUrls: ['https://sepolia.etherscan.io']
                            })}
                          >
                            Add to MetaMask
                          </Button>
                        </Box>
                      </Grid>

                      {/* BNB Testnet */}
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{
                          p: 2,
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          bgcolor: 'rgba(0,0,0,0.2)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Box
                              component="img"
                              src="https://cryptologos.cc/logos/bnb-bnb-logo.svg"
                              alt="BNB"
                              sx={{ width: 24, height: 24 }}
                            />
                            <Typography variant="subtitle1" fontWeight="bold">
                              BNB Testnet
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            href="https://testnet.bnbchain.org/faucet-smart"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mb: 1 }}
                          >
                            Get tBNB
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            onClick={() => handleAddChainToMetaMask({
                              chainId: '0x61',
                              chainName: 'BNB Smart Chain Testnet',
                              nativeCurrency: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 },
                              rpcUrls: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'],
                              blockExplorerUrls: ['https://testnet.bscscan.com']
                            })}
                          >
                            Add to MetaMask
                          </Button>
                        </Box>
                      </Grid>

                      {/* Polygon Amoy */}
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{
                          p: 2,
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          bgcolor: 'rgba(0,0,0,0.2)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Box
                              component="img"
                              src="https://cryptologos.cc/logos/polygon-matic-logo.svg"
                              alt="Polygon"
                              sx={{ width: 24, height: 24 }}
                            />
                            <Typography variant="subtitle1" fontWeight="bold">
                              Polygon Amoy
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            href="https://faucet.polygon.technology/"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mb: 1 }}
                          >
                            Get MATIC
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            onClick={() => handleAddChainToMetaMask({
                              chainId: '0x13882',
                              chainName: 'Polygon Amoy Testnet',
                              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                              rpcUrls: ['https://rpc-amoy.polygon.technology'],
                              blockExplorerUrls: ['https://amoy.polygonscan.com']
                            })}
                          >
                            Add to MetaMask
                          </Button>
                        </Box>
                      </Grid>

                      {/* Base Sepolia */}
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{
                          p: 2,
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          bgcolor: 'rgba(0,0,0,0.2)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Box
                              component="img"
                              src="https://avatars.githubusercontent.com/u/108554348?s=280&v=4"
                              alt="Base"
                              sx={{ width: 24, height: 24, borderRadius: '50%' }}
                            />
                            <Typography variant="subtitle1" fontWeight="bold">
                              Base Sepolia
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            href="https://www.alchemy.com/faucets/base-sepolia"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mb: 1 }}
                          >
                            Get Base ETH
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            onClick={() => handleAddChainToMetaMask({
                              chainId: '0x14a34',
                              chainName: 'Base Sepolia',
                              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                              rpcUrls: ['https://sepolia.base.org'],
                              blockExplorerUrls: ['https://sepolia.basescan.org']
                            })}
                          >
                            Add to MetaMask
                          </Button>
                        </Box>
                      </Grid>

                      {/* Solana Devnet */}
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{
                          p: 2,
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          bgcolor: 'rgba(0,0,0,0.2)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Box
                              component="img"
                              src="https://cryptologos.cc/logos/solana-sol-logo.svg"
                              alt="Solana"
                              sx={{ width: 24, height: 24 }}
                            />
                            <Typography variant="subtitle1" fontWeight="bold">
                              Solana Devnet
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            href="https://faucet.solana.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mb: 1 }}
                          >
                            Get SOL
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            disabled
                            sx={{ opacity: 0.5 }}
                          >
                            Use Phantom Wallet
                          </Button>
                        </Box>
                      </Grid>

                      {/* Hyperliquid Testnet */}
                      <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{
                          p: 2,
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          bgcolor: 'rgba(0,0,0,0.2)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Box
                              component="img"
                              src="https://avatars.githubusercontent.com/u/125160171?s=200&v=4"
                              alt="Hyperliquid"
                              sx={{ width: 24, height: 24, borderRadius: '50%' }}
                            />
                            <Typography variant="subtitle1" fontWeight="bold">
                              Hyperliquid Testnet
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            href="https://app.hyperliquid-testnet.xyz/faucet"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mb: 1 }}
                          >
                            Get Test Tokens
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            onClick={() => handleAddChainToMetaMask({
                              chainId: '0x28c5d',
                              chainName: 'Hyperliquid Testnet',
                              nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 6 },
                              rpcUrls: ['https://api.hyperliquid-testnet.xyz/evm'],
                              blockExplorerUrls: ['https://explorer.hyperliquid-testnet.xyz']
                            })}
                          >
                            Add to MetaMask
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Step 2: Make Deposit */}
          {activeStep === 1 && reservation && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Make Deposit
                </Typography>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Key Reserved:</strong> {reservation?.key_id || reservation?.reservation_id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Expires in:</strong> {formatTimeRemaining(reservation?.reservation_expires || reservation?.expiry)}
                  </Typography>
                </Alert>

                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Deposit Details
                  </Typography>
                  <Typography variant="body2">
                    <strong>Amount:</strong> {reservation?.amount} {reservation?.token?.symbol || 'ETH'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Contract:</strong> {reservation?.deposit_address || multiTokenTreasuryService.contractAddress || 'Not initialized'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Chain:</strong> {supportedChains.find(c => c.chainId === selectedChainId)?.name || selectedChainId}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  onClick={handleDeposit}
                  startIcon={<AccountBalanceWallet />}
                  size="large"
                >
                  Make Deposit
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Deposit Complete - Go to Manage Keys */}
          {activeStep === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" />
                  Deposit Confirmed!
                </Typography>

                {txHash && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>Transaction Hash:</strong> {txHash}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Launch />}
                      onClick={() => window.open(getExplorerUrl(txHash), '_blank')}
                      sx={{ mt: 1 }}
                    >
                      View on Explorer
                    </Button>
                  </Alert>
                )}

                <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, mb: 3, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Deposit Summary
                  </Typography>
                  <Typography variant="body2">
                    <strong>Amount:</strong> {completedDeposit?.amount || reservation?.amount} {completedDeposit?.token?.symbol || reservation?.token?.symbol || 'ETH'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Chain:</strong> {supportedChains.find(c => c.chainId === selectedChainId)?.name || selectedChainId}
                  </Typography>
                  <Typography variant="body2">
                    <strong>From:</strong> {completedDeposit?.userAddress?.slice(0, 10)}...{completedDeposit?.userAddress?.slice(-8)}
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Next Step:</strong> Go to <strong>Manage Keys</strong> to request your withdrawal keys. You can split your deposit across multiple chains and denominations.
                  </Typography>
                </Alert>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/dashboard')}
                    startIcon={<VpnKey />}
                    size="large"
                    sx={{
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #764ba2 0%, #667eea 100%)',
                      }
                    }}
                  >
                    Go to Manage Keys
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      // Reset and start new deposit
                      setActiveStep(0);
                      setReservation(null);
                      setTxHash('');
                      setSelectedDenomination('');
                      setCompletedDeposit(null);
                    }}
                  >
                    New Deposit
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Paper>

        {/* Deposit Confirmation Dialog */}
        <Dialog open={depositDialog} onClose={() => setDepositDialog(false)}>
          <DialogTitle>Confirm Deposit</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              You are about to deposit {reservation?.amount} {reservation?.token?.symbol || 'ETH'}
              to the treasury contract.
            </Typography>
            <Alert severity="warning">
              Make sure you have enough tokens and gas fees in your wallet.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDepositDialog(false)}>Cancel</Button>
            <Button onClick={executeDeposit} variant="contained">
              Confirm Deposit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Deposit Progress Dialog */}
        <Dialog
          open={depositProgressDialog}
          onClose={() => depositStatus === 'confirmed' || depositStatus === 'failed' ? setDepositProgressDialog(false) : null}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {depositStatus === 'pending' && 'Submitting Transaction...'}
            {depositStatus === 'confirming' && 'Confirming Transaction...'}
            {depositStatus === 'confirmed' && 'Deposit Confirmed!'}
            {depositStatus === 'failed' && 'Transaction Failed'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
              {/* Status Icon */}
              {depositStatus === 'pending' && (
                <CircularProgress size={60} sx={{ mb: 3 }} />
              )}
              {depositStatus === 'confirming' && (
                <HourglassEmpty sx={{ fontSize: 60, color: 'warning.main', mb: 3 }} />
              )}
              {depositStatus === 'confirmed' && (
                <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 3 }} />
              )}
              {depositStatus === 'failed' && (
                <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 3 }} />
              )}

              {/* Status Message */}
              <Typography variant="h6" align="center" gutterBottom>
                {depositStatus === 'pending' && 'Please confirm the transaction in your wallet...'}
                {depositStatus === 'confirming' && 'Waiting for blockchain confirmation...'}
                {depositStatus === 'confirmed' && 'Your deposit has been confirmed!'}
                {depositStatus === 'failed' && 'The transaction could not be completed'}
              </Typography>

              {/* Transaction Hash Display */}
              {txHash && (depositStatus === 'confirming' || depositStatus === 'confirmed') && (
                <Box sx={{ mt: 3, width: '100%' }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Transaction Hash:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          wordBreak: 'break-all'
                        }}
                      >
                        {txHash}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => copyToClipboard(txHash)}
                        startIcon={<ContentCopy />}
                        sx={{ minWidth: 'auto' }}
                      >
                        Copy
                      </Button>
                    </Box>
                  </Alert>

                  {/* Explorer Link */}
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Launch />}
                    onClick={() => window.open(getExplorerUrl(txHash), '_blank')}
                    sx={{ mt: 1 }}
                  >
                    View on Explorer
                  </Button>
                </Box>
              )}

              {/* Additional Info */}
              {depositStatus === 'confirmed' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                  Proceeding to next step...
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            {(depositStatus === 'confirmed' || depositStatus === 'failed') && (
              <Button onClick={() => setDepositProgressDialog(false)} variant="contained">
                Close
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default InterNull;