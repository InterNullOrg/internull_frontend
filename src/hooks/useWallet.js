import React, { createContext, useContext, useState, useEffect } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [walletType, setWalletType] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pausePolling, setPausePolling] = useState(false); // Flag to pause polling during signatures
  const [metamaskProvider, setMetamaskProvider] = useState(null); // Store reference to MetaMask provider specifically

  // Don't auto-initialize wallet on page load
  // useEffect(() => {
  //   initializeWallet();
  // }, []);

  useEffect(() => {
    // Use MetaMask provider specifically if available, otherwise fall back to window.ethereum
    const ethProvider = metamaskProvider || window.ethereum;
    if (!ethProvider) return;

    const handleAccountChange = async (accounts) => {
      // Don't process account changes if polling is paused (during signature requests)
      if (pausePolling) {
        console.log('⏸️  Ignoring account change during paused polling');
        return;
      }
      console.log('Accounts changed:', accounts);
      handleAccountsChanged(accounts);
    };

    const handleChainChange = (chainId) => {
      // Don't process chain changes if polling is paused (during signature requests)
      if (pausePolling) {
        console.log('⏸️  Ignoring chain change during paused polling');
        return;
      }
      console.log('Chain changed:', chainId);
      handleChainChanged(chainId);
    };

    // Listen for account changes on MetaMask provider
    ethProvider.on('accountsChanged', handleAccountChange);
    ethProvider.on('chainChanged', handleChainChange);

    // Poll for changes every 5 seconds as backup (reduced frequency to avoid conflicts)
    const pollInterval = setInterval(async () => {
      try {
        // Only poll if we have a connected account and polling is not paused
        if (!account || !ethProvider || pausePolling) return;

        const accounts = await ethProvider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const currentAccount = accounts[0];
          if (account && currentAccount.toLowerCase() !== account.toLowerCase()) {
            console.log('Account change detected via polling');
            handleAccountsChanged(accounts);
          }
        } else if (account) {
          console.log('Wallet disconnected via polling');
          handleAccountsChanged([]);
        }
      } catch (err) {
        // Silently ignore polling errors - they happen when MetaMask is busy with other requests
        // Only log if it's not the common "Unexpected error" during signature requests
        if (!err.message?.includes('Unexpected error')) {
          console.warn('Polling error:', err.message);
        }
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      if (ethProvider) {
        ethProvider.removeListener('accountsChanged', handleAccountChange);
        ethProvider.removeListener('chainChanged', handleChainChange);
      }
    };
  }, [account, pausePolling, metamaskProvider]);

  const initializeWallet = async () => {
    try {
      const ethereumProvider = await detectEthereumProvider();

      if (ethereumProvider) {
        const web3Provider = new ethers.providers.Web3Provider(ethereumProvider);
        setProvider(web3Provider);

        // Check if already connected
        const accounts = await ethereumProvider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setSigner(web3Provider.getSigner());
          setConnected(true);
          setWalletType('MetaMask');

          const network = await web3Provider.getNetwork();
          setChainId(network.chainId);

          console.log('Wallet initialized with account:', accounts[0]);
        }
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
      setIsInitialized(true);
    }
  };

  // Connect to EVM wallet - supports MetaMask and Phantom
  const connectWallet = async (preferredWallet = null) => {
    console.log('🔗 Attempting to connect to EVM wallet...', preferredWallet ? `Preferred: ${preferredWallet}` : '');

    // Find available EVM providers
    let selectedProvider = null;
    let detectedWalletType = null;

    // For Phantom, always check window.phantom.ethereum first (dedicated EVM provider)
    if (preferredWallet === 'phantom') {
      if (window.phantom?.ethereum) {
        selectedProvider = window.phantom.ethereum;
        detectedWalletType = 'Phantom';
        console.log('👻 Found Phantom via window.phantom.ethereum');
      } else if (window.ethereum?.providers) {
        // Check providers array for Phantom
        selectedProvider = window.ethereum.providers.find(p => p.isPhantom && !p.isMetaMask);
        if (selectedProvider) {
          detectedWalletType = 'Phantom';
          console.log('👻 Found Phantom in providers array');
        }
      } else if (window.ethereum?.isPhantom) {
        selectedProvider = window.ethereum;
        detectedWalletType = 'Phantom';
        console.log('👻 Using Phantom as window.ethereum');
      }

      if (!selectedProvider) {
        toast.error('Phantom wallet not detected. Please install Phantom extension.');
        return;
      }
    } else if (preferredWallet === 'metamask') {
      // For MetaMask, find the MetaMask-specific provider
      if (window.ethereum?.providers) {
        // Multiple providers - find MetaMask (not Phantom)
        selectedProvider = window.ethereum.providers.find(p => p.isMetaMask && !p.isPhantom);
        if (selectedProvider) {
          detectedWalletType = 'MetaMask';
          console.log('🦊 Found MetaMask in providers array');
        }
      } else if (window.ethereum?.isMetaMask && !window.ethereum?.isPhantom) {
        selectedProvider = window.ethereum;
        detectedWalletType = 'MetaMask';
        console.log('🦊 Using MetaMask as window.ethereum');
      }

      if (!selectedProvider) {
        toast.error('MetaMask not detected. Please install MetaMask extension.');
        return;
      }
    } else {
      // No preference - auto-detect (MetaMask first, then Phantom)
      if (window.ethereum) {
        if (window.ethereum.providers) {
          console.log('🔍 Multiple providers detected:', window.ethereum.providers.length);
          // Try MetaMask first
          selectedProvider = window.ethereum.providers.find(p => p.isMetaMask && !p.isPhantom);
          if (selectedProvider) {
            detectedWalletType = 'MetaMask';
            console.log('🦊 Using MetaMask as default');
          } else {
            // Try Phantom
            selectedProvider = window.ethereum.providers.find(p => p.isPhantom);
            if (selectedProvider) {
              detectedWalletType = 'Phantom';
              console.log('👻 Using Phantom EVM as fallback');
            }
          }
        } else {
          // Single provider
          if (window.ethereum.isPhantom) {
            selectedProvider = window.ethereum;
            detectedWalletType = 'Phantom';
            console.log('👻 Using Phantom as sole EVM provider');
          } else if (window.ethereum.isMetaMask) {
            selectedProvider = window.ethereum;
            detectedWalletType = 'MetaMask';
            console.log('🦊 Using MetaMask as sole provider');
          } else {
            selectedProvider = window.ethereum;
            detectedWalletType = 'Unknown';
            console.log('🔗 Using unknown EVM provider');
          }
        }
      }

      // Also check for Phantom's dedicated ethereum object as last resort
      if (!selectedProvider && window.phantom?.ethereum) {
        selectedProvider = window.phantom.ethereum;
        detectedWalletType = 'Phantom';
        console.log('👻 Found Phantom via window.phantom.ethereum');
      }
    }

    if (!selectedProvider) {
      toast.error('No EVM wallet detected. Please install MetaMask or Phantom.');
      return;
    }

    // Store provider reference for later use
    setMetamaskProvider(selectedProvider);

    setLoading(true);
    try {
      // Check if we should connect to Sepolia (from env) or let user stay on current network
      const targetChain = process.env.REACT_APP_CHAIN_ID;

      if (targetChain === '11155111') {
        // Try to switch to Sepolia if configured
        console.log('🌐 Switching to Sepolia network...');
        try {
          await selectedProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }] // 11155111 in hex
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            // Network not added, add it
            await selectedProvider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: [process.env.REACT_APP_RPC_URL || 'https://eth-sepolia.public.blastapi.io'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
          }
        }
      }

      // Now request accounts
      console.log(`📡 Requesting accounts from ${detectedWalletType}...`);
      const accounts = await selectedProvider.request({
        method: 'eth_requestAccounts',
      });
      console.log('📊 Accounts received:', accounts);

      if (accounts.length > 0) {
        // Create a fresh provider using the selected provider
        const web3Provider = new ethers.providers.Web3Provider(selectedProvider);
        setProvider(web3Provider);

        setAccount(accounts[0]);
        setSigner(web3Provider.getSigner());
        setConnected(true);
        setWalletType(detectedWalletType);

        const network = await web3Provider.getNetwork();
        setChainId(network.chainId);
        console.log('🌐 Connected to network:', network);

        toast.success(`${detectedWalletType} connected successfully!`);
      }
    } catch (error) {
      console.error('❌ Error connecting wallet:', error);

      let errorMessage = 'Failed to connect wallet';
      if (error.code === -32002) {
        errorMessage = `${detectedWalletType || 'Wallet'} is already processing a request. Please check your wallet.`;
      } else if (error.code === 4001) {
        errorMessage = 'Connection rejected by user';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Convenience methods for specific wallet connections
  const connectMetaMask = () => connectWallet('metamask');
  const connectPhantomEVM = () => connectWallet('phantom');


  const disconnectWallet = async () => {
    setAccount(null);
    setSigner(null);
    setConnected(false);
    setChainId(null);
    setWalletType(null);
    toast.info('Wallet disconnected');
  };

  const switchAccount = async () => {
    try {
      // Request MetaMask to show account selector
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      // The account change will be detected by the event listener
      toast.info('Select an account in MetaMask');
    } catch (error) {
      if (error.code === 4001) {
        toast.info('Account switch cancelled');
      } else {
        console.error('Failed to switch account:', error);
        toast.error('Failed to open account selector');
      }
    }
  };

  const switchNetwork = async (targetChainId) => {
    if (!window.ethereum) return;

    const chainHex = `0x${parseInt(targetChainId).toString(16)}`;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainHex }],
      });
    } catch (error) {
      if (error.code === 4902) {
        // Network not added, try to add it
        try {
          if (targetChainId === 11155111 || targetChainId === '11155111') {
            // Add Sepolia
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chainHex,
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: [process.env.REACT_APP_RPC_URL || 'https://eth-sepolia.public.blastapi.io'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
          } else {
            toast.error('Unsupported network - please add it manually in MetaMask');
          }
        } catch (addError) {
          console.error('Failed to add network:', addError);
          toast.error('Failed to add network to MetaMask');
        }
      } else {
        toast.error('Failed to switch network');
      }
    }
  };

  const handleAccountsChanged = async (accounts) => {
    console.log('handleAccountsChanged called with:', accounts);

    if (accounts.length === 0) {
      // Wallet disconnected
      console.log('Wallet disconnected');
      disconnectWallet();
    } else if (!account || accounts[0].toLowerCase() !== account.toLowerCase()) {
      // Account changed
      const newAccount = accounts[0];
      console.log('Account changed from', account, 'to', newAccount);

      // Update account
      setAccount(newAccount);

      // Create new provider and signer using MetaMask provider if available
      const ethProvider = metamaskProvider || window.ethereum;
      if (ethProvider) {
        const web3Provider = new ethers.providers.Web3Provider(ethProvider);
        setProvider(web3Provider);
        setSigner(web3Provider.getSigner());
        setConnected(true);
        setWalletType('MetaMask');

        // Update network info
        const network = await web3Provider.getNetwork();
        setChainId(network.chainId);

        toast.info(`Switched to account ${newAccount.slice(0, 6)}...${newAccount.slice(-4)}`);
      }
    }
  };

  const handleChainChanged = (chainId) => {
    console.log('Chain changed to:', chainId);
    setChainId(parseInt(chainId, 16));
    // Reinitialize provider instead of reloading - use MetaMask provider if available
    const ethProvider = metamaskProvider || window.ethereum;
    if (ethProvider) {
      const web3Provider = new ethers.providers.Web3Provider(ethProvider);
      setProvider(web3Provider);
      if (account) {
        setSigner(web3Provider.getSigner());
      }
    }
    toast.info('Network changed');
  };

  const getBalance = async () => {
    if (!provider || !account) return '0';
    
    try {
      const balance = await provider.getBalance(account);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  };

  const signMessage = async (message) => {
    if (!signer) throw new Error('Wallet not connected');

    try {
      // Pause polling during signature to avoid conflicts
      console.log('⏸️  Pausing wallet polling for signature request');
      setPausePolling(true);

      // Handle both string messages and object messages
      const messageText = typeof message === 'string'
        ? message
        : JSON.stringify(message, Object.keys(message).sort());

      const signature = await signer.signMessage(messageText);

      console.log('▶️  Resuming wallet polling after signature');
      setPausePolling(false);

      return signature;
    } catch (error) {
      // Always resume polling even if signature fails
      console.log('▶️  Resuming wallet polling after signature error');
      setPausePolling(false);

      console.error('Error signing message:', error);
      if (error.code === 4001) {
        throw new Error('User rejected signature request');
      }
      throw error;
    }
  };

  const sendTransaction = async (transaction) => {
    console.log('🔍 sendTransaction called with:', transaction);
    console.log('🔍 Wallet state:', { connected, account, signer: !!signer });
    
    if (!signer) {
      console.error('❌ No signer available');
      throw new Error('Wallet not connected - no signer available');
    }
    
    try {
      console.log('📡 Calling signer.sendTransaction...');
      const tx = await signer.sendTransaction(transaction);
      console.log('✅ Transaction sent successfully:', tx);
      return tx;
    } catch (error) {
      console.error('❌ Error in signer.sendTransaction:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      });
      throw error;
    }
  };

  // Wrapper to execute any MetaMask request with polling paused
  const executeWithPausedPolling = async (asyncFn) => {
    try {
      console.log('⏸️  Pausing wallet polling for MetaMask request');
      setPausePolling(true);

      // Wait longer to ensure polling completely stops and MetaMask settles
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('📞 Executing MetaMask request...');
      const result = await asyncFn();

      console.log('▶️  Resuming wallet polling after MetaMask request');
      setPausePolling(false);

      return result;
    } catch (error) {
      // Always resume polling even if request fails
      console.log('▶️  Resuming wallet polling after MetaMask request error');
      console.error('Error during paused MetaMask request:', error);
      setPausePolling(false);
      throw error;
    }
  };

  const value = {
    account,
    provider,
    signer,
    chainId,
    loading,
    connected,
    walletType,
    isInitialized,
    connectWallet, // Export as connectWallet (auto-detects best wallet)
    connect: connectWallet, // Also export as connect for compatibility
    connectMetaMask, // Connect specifically to MetaMask
    connectPhantomEVM, // Connect specifically to Phantom's EVM support
    disconnectWallet,
    switchAccount,
    switchNetwork,
    getBalance,
    signMessage,
    sendTransaction,
    executeWithPausedPolling, // Export helper to pause polling during wallet requests
    // Additional utilities for components
    wallet: account ? {
      address: account,
      utils: ethers.utils,
      sendTransaction: sendTransaction
    } : null,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};