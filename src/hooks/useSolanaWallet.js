import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by app
import '@solana/wallet-adapter-react-ui/styles.css';

const SolanaWalletContext = createContext();

export const useSolanaWallet = () => {
  const context = useContext(SolanaWalletContext);
  if (!context) {
    throw new Error('useSolanaWallet must be used within a SolanaWalletProvider');
  }
  return context;
};

export const SolanaWalletProvider = ({ children }) => {
  // Solana network - use devnet for testing
  const network = process.env.REACT_APP_SOLANA_NETWORK || 'devnet';
  const endpoint = useMemo(
    () => process.env.REACT_APP_SOLANA_RPC_URL ||
      // Use Ankr public RPC as fallback (more reliable than default Solana RPC)
      (network === 'devnet' ? 'https://rpc.ankr.com/solana_devnet' : clusterApiUrl(network)),
    [network]
  );

  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [] // Remove network dependency - adapters don't need it
  );

  // Handle wallet errors gracefully
  const onError = useCallback((error) => {
    console.warn('Wallet error:', error.name, error.message);
    // Don't throw - just log the error
    // Common errors: WalletNotReadyError, WalletConnectionError
  }, []);

  // Disable autoConnect - it causes issues with Phantom on page load
  // Users will click "Connect Wallet" manually
  const shouldAutoConnect = false;

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={shouldAutoConnect}
        onError={onError}
      >
        <WalletModalProvider>
          <SolanaWalletContext.Provider value={{ network, endpoint }}>
            {children}
          </SolanaWalletContext.Provider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaWalletProvider;
