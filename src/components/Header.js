import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  AccountBalanceWallet,
  MoreVert,
  Article,
  History as HistoryIcon,
  VpnKey,
  AccountBalance,
  KeyboardArrowDown
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useWallet as useSolWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { MainLogo, MinimalistDarkLogo } from '../components/LogoComponents';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    account,
    connected,
    connectWallet,
    disconnectWallet,
    loading
  } = useWallet();

  // Solana wallet
  const solanaWallet = useSolWallet();
  const { publicKey: solanaPublicKey, connected: solanaConnected, disconnect: disconnectSolana } = solanaWallet;

  const [anchorEl, setAnchorEl] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [walletMenuAnchor, setWalletMenuAnchor] = useState({ evm: null, solana: null, unified: null });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navigationItems = [
    { label: 'Deposits', path: '/deposit', icon: <AccountBalance fontSize="small" /> },
    { label: 'Manage Keys', path: '/dashboard', icon: <VpnKey fontSize="small" /> },
    { label: 'History', path: '/history', icon: <HistoryIcon fontSize="small" /> },
    { label: 'Docs', path: '/docs', icon: <Article fontSize="small" /> },
  ];

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: scrolled
            ? 'rgba(10, 14, 39, 0.95)'
            : 'rgba(10, 14, 39, 0.7)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          borderBottom: scrolled
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(255, 255, 255, 0.05)',
          zIndex: 1100,
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexGrow: 1,
              cursor: 'pointer'
            }}
            onClick={() => navigate('/deposit')}
          >
            <MainLogo height={40} style={{ marginRight: 12 }} />
            <MinimalistDarkLogo height={32} />
          </Box>

          {/* Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 2 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                color="inherit"
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  mx: 1,
                  px: 2,
                  borderRadius: 2,
                  fontSize: '0.95rem',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  color: location.pathname === item.path ? '#667eea' : 'rgba(255, 255, 255, 0.8)',
                  background: location.pathname === item.path
                    ? 'rgba(102, 126, 234, 0.15)'
                    : 'transparent',
                  border: '1px solid',
                  borderColor: location.pathname === item.path
                    ? 'rgba(102, 126, 234, 0.3)'
                    : 'transparent',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(102, 126, 234, 0.1)',
                    borderColor: 'rgba(102, 126, 234, 0.2)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Mobile menu */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
            >
              <MoreVert />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              {navigationItems.map((item) => (
                <MenuItem
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    handleMenuClose();
                  }}
                  selected={location.pathname === item.path}
                >
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Unified Wallet Dropdown */}
          {(() => {
            const connectedCount = (connected ? 1 : 0) + (solanaConnected && solanaPublicKey ? 1 : 0);
            return (
              <>
                <Button
                  onClick={(e) => setWalletMenuAnchor({ ...walletMenuAnchor, unified: e.currentTarget })}
                  sx={{
                    background: connectedCount > 0
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    color: 'white',
                    textTransform: 'none',
                    minWidth: connectedCount > 0 ? 'auto' : '140px',
                    boxShadow: connectedCount === 0 ? '0 4px 15px rgba(102, 126, 234, 0.3)' : 'none',
                    '&:hover': {
                      background: connectedCount > 0
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'linear-gradient(90deg, #764ba2 0%, #667eea 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {connectedCount > 0 ? (
                      <>
                        {/* Show connected wallet icons */}
                        {connected && (
                          <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <Box
                              component="img"
                              src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                              alt="MetaMask"
                              sx={{ width: 22, height: 22 }}
                            />
                            <Box sx={{
                              width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e',
                              position: 'absolute', bottom: -2, right: -2, border: '2px solid #0a0e27'
                            }} />
                          </Box>
                        )}
                        {solanaConnected && solanaPublicKey && (
                          <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <Box
                              component="img"
                              src="https://cryptologos.cc/logos/solana-sol-logo.svg"
                              alt="Solana"
                              sx={{ width: 22, height: 22 }}
                            />
                            <Box sx={{
                              width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e',
                              position: 'absolute', bottom: -2, right: -2, border: '2px solid #0a0e27'
                            }} />
                          </Box>
                        )}
                      </>
                    ) : (
                      <>
                        <AccountBalanceWallet sx={{ fontSize: 20 }} />
                        <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          Wallets
                        </Typography>
                      </>
                    )}
                    <KeyboardArrowDown sx={{ fontSize: 18 }} />
                  </Box>
                </Button>
                <Menu
                  anchorEl={walletMenuAnchor.unified}
                  open={Boolean(walletMenuAnchor.unified)}
                  onClose={() => setWalletMenuAnchor({ ...walletMenuAnchor, unified: null })}
                  PaperProps={{
                    sx: {
                      background: 'rgba(20, 20, 30, 0.98)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 2,
                      mt: 1,
                      minWidth: '280px',
                      p: 1,
                    },
                  }}
                >
                  {/* EVM Section - MetaMask Only */}
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, px: 1.5, pt: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                    EVM Wallet
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 1.5,
                      mb: 1,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: connected ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': connected ? {} : {
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderColor: 'rgba(102, 126, 234, 0.3)',
                      },
                    }}
                    onClick={() => {
                      if (!connected) {
                        connectWallet();
                        setWalletMenuAnchor({ ...walletMenuAnchor, unified: null });
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        component="img"
                        src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                        alt="MetaMask"
                        sx={{ width: 24, height: 24 }}
                      />
                      <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                        MetaMask
                      </Typography>
                    </Box>
                    {connected ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'white' }}>
                          {formatAddress(account)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            disconnectWallet();
                            setWalletMenuAnchor({ ...walletMenuAnchor, unified: null });
                          }}
                          sx={{
                            color: 'rgba(255,255,255,0.5)',
                            p: 0.5,
                            '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' },
                          }}
                        >
                          <Box component="span" sx={{ fontSize: '14px', fontWeight: 'bold' }}>✕</Box>
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                        {loading ? '...' : 'Connect'}
                      </Typography>
                    )}
                  </Box>

                  {/* Solana Section */}
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, px: 1.5, pt: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Solana Wallets
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 1.5,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        component="img"
                        src="https://cryptologos.cc/logos/solana-sol-logo.svg"
                        alt="Solana"
                        sx={{ width: 24, height: 24 }}
                      />
                      <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                        Solana
                      </Typography>
                    </Box>
                    {solanaConnected && solanaPublicKey ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'white' }}>
                          {formatAddress(solanaPublicKey.toString())}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            if (disconnectSolana) await disconnectSolana();
                            setWalletMenuAnchor({ ...walletMenuAnchor, unified: null });
                          }}
                          sx={{
                            color: 'rgba(255,255,255,0.5)',
                            p: 0.5,
                            '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' },
                          }}
                        >
                          <Box component="span" sx={{ fontSize: '14px', fontWeight: 'bold' }}>✕</Box>
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{
                        '& .wallet-adapter-button': {
                          background: 'linear-gradient(90deg, #dc1fff 0%, #00ffa3 100%)',
                          color: 'white',
                          borderRadius: '6px',
                          padding: '4px 16px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: 'none',
                          fontFamily: 'inherit',
                          minWidth: 'auto',
                          height: 'auto',
                          '&:hover': {
                            background: 'linear-gradient(90deg, #00ffa3 0%, #dc1fff 100%)',
                          },
                        },
                      }}>
                        <WalletMultiButton />
                      </Box>
                    )}
                  </Box>
                </Menu>
              </>
            );
          })()}
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* Spacer for fixed header */}
    </>
  );
};

export default Header;