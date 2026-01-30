import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  History as HistoryIcon,
  OpenInNew,
} from '@mui/icons-material';
import { useWallet } from '../hooks/useWallet';
import { useWallet as useSolWallet } from '@solana/wallet-adapter-react';
import depositTracker from '../services/depositTracker';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const History = () => {
  const { connected, account } = useWallet();
  const { publicKey: solanaPublicKey, connected: solanaConnected } = useSolWallet();
  const [withdrawalHistory, setWithdrawalHistory] = useState({});
  const [supportedChains, setSupportedChains] = useState([]);
  const [expandedChains, setExpandedChains] = useState({});
  const [expandedTokens, setExpandedTokens] = useState({});

  useEffect(() => {
    if ((connected && account) || (solanaConnected && solanaPublicKey)) {
      loadSupportedChains();
      loadWithdrawalHistory();
    } else {
      setWithdrawalHistory({});
    }
  }, [connected, account, solanaConnected, solanaPublicKey]);

  const loadSupportedChains = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/cross-chain/chains`);
      const data = await response.json();
      if (data.success && data.chains) {
        setSupportedChains(data.chains);
      }
    } catch (error) {
      console.error('Failed to load supported chains:', error);
    }
  };

  const loadWithdrawalHistory = () => {
    let allDeposits = [];

    // Load EVM deposits
    if (account) {
      const evmDeposits = depositTracker.getUserDeposits(account);
      allDeposits = [...evmDeposits];
    }

    // Load Solana deposits
    if (solanaPublicKey) {
      const solanaAddress = solanaPublicKey.toString();
      const solanaDeposits = depositTracker.getUserDeposits(solanaAddress);
      allDeposits = [...allDeposits, ...solanaDeposits];
    }

    // Filter deposits that have withdrawals
    const depositsWithWithdrawals = allDeposits.filter(deposit =>
      deposit.withdrawals && deposit.withdrawals.length > 0
    );

    // Group by chain → token → withdrawals
    const grouped = {};

    depositsWithWithdrawals.forEach(deposit => {
      deposit.withdrawals.forEach(withdrawal => {
        const chainName = withdrawal.chainName || 'Unknown';
        const tokenSymbol = withdrawal.tokenSymbol || deposit.metadata?.token || 'ETH';

        if (!grouped[chainName]) {
          grouped[chainName] = {};
        }
        if (!grouped[chainName][tokenSymbol]) {
          grouped[chainName][tokenSymbol] = [];
        }

        // Find the key info for this withdrawal
        const key = deposit.keys?.find(k =>
          k.keyIndex === withdrawal.keyIndex || k.key_index === withdrawal.keyIndex
        );

        grouped[chainName][tokenSymbol].push({
          ...withdrawal,
          denomination: key?.denomination || withdrawal.amount || '0',
          tokenSymbol: tokenSymbol,
          chainName: chainName,
        });
      });
    });

    setWithdrawalHistory(grouped);
    console.log('📜 Withdrawal history grouped:', grouped);
  };

  const getChainLogo = (chainName) => {
    if (!chainName) return null;
    const name = chainName.toLowerCase();

    if (name.includes('sepolia') && name.includes('base')) {
      return '/logos/base.png';
    } else if (name.includes('sepolia') || name.includes('ethereum')) {
      return '/logos/ethereum.png';
    } else if (name.includes('polygon') || name.includes('mumbai')) {
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

  const getExplorerUrl = (chainName, txHash) => {
    const chain = supportedChains.find(c => c.chain_name === chainName);
    const explorerBase = chain?.block_explorer || 'https://etherscan.io';

    if (chainName?.toLowerCase().includes('solana')) {
      const isDevnet = chainName.toLowerCase().includes('devnet');
      return isDevnet
        ? `https://explorer.solana.com/tx/${txHash}?cluster=devnet`
        : `https://explorer.solana.com/tx/${txHash}`;
    }

    return `${explorerBase}/tx/${txHash}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateHash = (hash) => {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const toggleChain = (chainName) => {
    setExpandedChains(prev => ({
      ...prev,
      [chainName]: !prev[chainName]
    }));
  };

  const toggleToken = (chainName, tokenSymbol) => {
    const key = `${chainName}-${tokenSymbol}`;
    setExpandedTokens(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!connected && !solanaConnected) {
    return (
      <Box sx={{ pt: 3 }}>
        <Alert severity="info">
          Please connect your wallet to view withdrawal history.
        </Alert>
      </Box>
    );
  }

  const totalWithdrawals = Object.values(withdrawalHistory).reduce((total, tokens) =>
    total + Object.values(tokens).reduce((sum, withdrawals) => sum + withdrawals.length, 0)
    , 0);

  return (
    <Box sx={{ pt: 3 }}>
      {/* Header */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.05) 100%)',
          border: '1px solid rgba(240, 147, 251, 0.2)',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HistoryIcon sx={{ fontSize: 40, color: '#f093fb' }} />
          <Box>
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Withdrawal History
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              View all your completed withdrawals
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* History Content */}
      {totalWithdrawals === 0 ? (
        <Alert severity="info">
          No withdrawal history found. Withdrawals will appear here after you complete them.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {Object.entries(withdrawalHistory).map(([chainName, tokens]) => {
            const totalChainWithdrawals = Object.values(tokens).reduce(
              (sum, withdrawals) => sum + withdrawals.length, 0
            );
            const chainLogo = getChainLogo(chainName);
            const isChainExpanded = expandedChains[chainName];

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
                          {chainName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {totalChainWithdrawals} withdrawal{totalChainWithdrawals !== 1 ? 's' : ''}
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

                {/* Chain Content - Tokens */}
                {isChainExpanded && (
                  <CardContent sx={{ p: 2, pt: 0 }}>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      {Object.entries(tokens).map(([tokenSymbol, withdrawals]) => {
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
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        objectFit: 'contain',
                                      }}
                                    />
                                  )}
                                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'white' }}>
                                    {tokenSymbol}
                                  </Typography>
                                  <Chip
                                    label={`${withdrawals.length} withdrawal${withdrawals.length !== 1 ? 's' : ''}`}
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

                            {/* Token Content - Individual Withdrawals */}
                            {isTokenExpanded && (
                              <Box sx={{ px: 1.5, pb: 1.5 }}>
                                <Stack spacing={1}>
                                  {withdrawals.map((withdrawal, idx) => (
                                    <Card
                                      key={idx}
                                      sx={{
                                        background: 'rgba(0, 230, 118, 0.05)',
                                        border: '1px solid rgba(0, 230, 118, 0.2)',
                                        borderRadius: 1,
                                      }}
                                    >
                                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                          <CheckCircle sx={{ color: '#00e676', fontSize: 20, mt: 0.2 }} />
                                          <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'white', mb: 0.5 }}>
                                              {withdrawal.denomination} {tokenSymbol}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block' }}>
                                              {formatDate(withdrawal.timestamp)}
                                            </Typography>
                                            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                                  {truncateHash(withdrawal.txHash)}
                                                </Typography>
                                                <Button
                                                  size="small"
                                                  endIcon={<OpenInNew sx={{ fontSize: 12 }} />}
                                                  onClick={() => window.open(getExplorerUrl(chainName, withdrawal.txHash), '_blank')}
                                                  sx={{
                                                    minWidth: 'auto',
                                                    p: 0.5,
                                                    fontSize: '0.7rem',
                                                    color: '#4facfe',
                                                    '&:hover': {
                                                      bgcolor: 'rgba(79, 172, 254, 0.1)',
                                                    },
                                                  }}
                                                >
                                                  View
                                                </Button>
                                              </Box>
                                              {withdrawal.recipient && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                    To:
                                                  </Typography>
                                                  <Typography
                                                    variant="caption"
                                                    sx={{
                                                      fontFamily: 'monospace',
                                                      color: 'rgba(255, 255, 255, 0.8)',
                                                    }}
                                                  >
                                                    {truncateAddress(withdrawal.recipient)}
                                                  </Typography>
                                                </Box>
                                              )}
                                            </Box>
                                          </Box>
                                        </Box>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                          </Card>
                        );
                      })}
                    </Stack>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default History;
