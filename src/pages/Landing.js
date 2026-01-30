import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  Paper,
  Divider,
  Chip,
  useTheme,
  alpha,
  Fade,
  Zoom,
  IconButton,
  LinearProgress,
  Avatar,
  Grow,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  AccountBalanceWallet,
  Visibility,
  ArrowForward,
  Check,
  GitHub,
  Article,
  KeyboardArrowDown,
  Wallet,
  Key,
  Timer,
  LocationOn,
  TrendingUp,
  Shield,
  Fingerprint,
  VisibilityOff,
  AutoAwesome,
  ElectricBolt,
  Token,
  Language,
  SwapHoriz,
  Security,
  Speed,
  Public,
  Link,
  LinkOff,
  Shuffle,
  CallSplit,
  X as XIcon
} from '@mui/icons-material';
// useWallet import removed - no longer requiring wallet connection on landing page
import { getChainLogo, chainConfig } from '../components/ChainLogos';
import { MainLogo, MinimalistDarkLogo } from '../components/LogoComponents';
import AnimatedFlowVideo from '../components/AnimatedFlowVideo';

// Multi-Chain Token Display Component
const SupportedChains = () => {
  const theme = useTheme();
  const chains = [
    { name: 'Ethereum', color: '#627EEA', tokens: ['ETH', 'USDC', 'USDT'], type: 'EVM' },
    { name: 'Solana', color: '#14F195', tokens: ['SOL', 'USDC', 'USDT'], type: 'Solana' },
    { name: 'BNB Chain', color: '#F3BA2F', tokens: ['BNB', 'USDC', 'USDT'], type: 'EVM' },
    { name: 'Polygon', color: '#8247E5', tokens: ['POL', 'USDC', 'USDT'], type: 'EVM' },
    { name: 'Base', color: '#0052FF', tokens: ['ETH', 'USDC'], type: 'EVM' },
    { name: 'Hyperliquid', color: '#00D9FF', tokens: ['HYPE', 'USDC'], type: 'Hyperliquid' }
  ];

  return (
    <Box sx={{ position: 'relative', py: 3 }}>
      <Typography variant="h6" fontWeight="bold" align="center" sx={{ mb: 3, color: 'white' }}>
        Supported Chains & Tokens - EVM & Solana
      </Typography>
      <Grid container spacing={2}>
        {chains.map((chain, index) => (
          <Grid item xs={12} sm={6} md={2} key={index}>
            <Zoom in timeout={500 + index * 100}>
              <Paper
                sx={{
                  p: 2,
                  background: `linear-gradient(135deg, ${alpha(chain.color, 0.1)} 0%, ${alpha(chain.color, 0.05)} 100%)`,
                  border: `1px solid ${alpha(chain.color, 0.3)}`,
                  borderRadius: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px) scale(1.05)',
                    boxShadow: `0 10px 20px ${alpha(chain.color, 0.3)}`,
                    borderColor: chain.color
                  }
                }}
              >
                <Box sx={{ mb: 1 }}>
                  {getChainLogo(chain.name, 32)}
                </Box>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: chain.color, mb: 1.5 }}>
                  {chain.name}
                </Typography>
                <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                  {chain.tokens.slice(0, 3).map((token, i) => (
                    <Chip
                      key={i}
                      label={token}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: alpha(chain.color, 0.2),
                        color: 'white',
                        border: 'none'
                      }}
                    />
                  ))}
                </Stack>
              </Paper>
            </Zoom>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// Privacy Flow Visualization (Same-chain and Cross-chain)
const PrivacyFlow = () => {
  const theme = useTheme();
  const [activeFlow, setActiveFlow] = useState(0);

  const flows = [
    {
      title: 'Same-Chain Privacy on Solana',
      from: { chain: 'Solana', token: 'SOL', amount: '100', address: 'DYw8...jQNd' },
      to: { chain: 'Solana', token: 'SOL', amount: '100', address: '7XzG...3mK9' },
      type: 'same-chain'
    },
    {
      title: 'EVM to Solana Bridge',
      from: { chain: 'Ethereum', token: 'USDC', amount: '10,000', address: '0x7a9f...3d2e' },
      to: { chain: 'Solana', token: 'USDC', amount: '10,000', address: '5KEn...9WzX' },
      type: 'cross-chain'
    },
    {
      title: 'Solana to EVM Bridge',
      from: { chain: 'Solana', token: 'USDC', amount: '5,000', address: 'DYw8...jQNd' },
      to: { chain: 'BNB Chain', token: 'USDC', amount: '5,000', address: '0x3e7a...2d9c' },
      type: 'cross-chain'
    },
    {
      title: 'Multi-Chain Split with Solana',
      from: { chain: 'Ethereum', token: 'USDT', amount: '8,000', address: '0x7a9f...3d2e' },
      to: [
        { chain: 'Solana', token: 'USDT', amount: '5,000' },
        { chain: 'Polygon', token: 'USDT', amount: '3,000' }
      ],
      type: 'multi-split'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFlow((prev) => (prev + 1) % flows.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box sx={{
      p: 3,
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(79, 172, 254, 0.05) 100%)',
      borderRadius: 3,
      border: '1px solid rgba(102, 126, 234, 0.2)'
    }}>
      <Typography variant="h6" fontWeight="bold" align="center" sx={{ mb: 1, color: 'white' }}>
        Privacy Protocol In Action
      </Typography>
      <Typography variant="body2" align="center" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.6)' }}>
        {flows[activeFlow].title}
      </Typography>

      <Fade in key={activeFlow} timeout={500}>
        <Box sx={{ textAlign: 'center' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={5}>
              <Paper sx={{
                p: 2,
                background: alpha('#667eea', 0.1),
                border: '2px solid #667eea'
              }}>
                <Box sx={{ mb: 1 }}>
                  {getChainLogo(flows[activeFlow].from.chain, 40)}
                </Box>
                <Typography variant="subtitle2" color="#667eea" fontWeight="bold">
                  {flows[activeFlow].from.chain}
                </Typography>
                <Stack spacing={0.5} alignItems="center">
                  <Chip
                    icon={<AccountBalanceWallet />}
                    label={flows[activeFlow].from.address}
                    size="small"
                    variant="outlined"
                    sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                  />
                  <Chip
                    label={`${flows[activeFlow].from.amount} ${flows[activeFlow].from.token}`}
                    sx={{ bgcolor: alpha('#667eea', 0.2), color: 'white' }}
                  />
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={2}>
              <Box sx={{ position: 'relative', height: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {flows[activeFlow].type === 'same-chain' ? (
                  <Shuffle sx={{ fontSize: 40, color: '#f093fb' }} />
                ) : flows[activeFlow].type === 'multi-split' ? (
                  <Stack spacing={0}>
                    <ArrowForward sx={{ fontSize: 30, color: '#f093fb', transform: 'rotate(-20deg)' }} />
                    <ArrowForward sx={{ fontSize: 30, color: '#4facfe', transform: 'rotate(20deg)' }} />
                  </Stack>
                ) : (
                  <SwapHoriz sx={{ fontSize: 40, color: '#f093fb', animation: 'slideArrow 1s ease-in-out infinite' }} />
                )}
                <Typography variant="caption" sx={{ display: 'block', color: '#f093fb', mt: 1 }}>
                  {flows[activeFlow].type === 'same-chain' ? 'Privacy Protocol' :
                   flows[activeFlow].type === 'multi-split' ? 'Split Keys' : 'Private Bridge'}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={5}>
              {flows[activeFlow].type === 'multi-split' ? (
                <Stack spacing={1}>
                  {flows[activeFlow].to.map((dest, index) => (
                    <Paper key={index} sx={{
                      p: 1.5,
                      background: alpha(index === 0 ? '#4facfe' : '#f093fb', 0.1),
                      border: `2px solid ${index === 0 ? '#4facfe' : '#f093fb'}`
                    }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box>{getChainLogo(dest.chain, 24)}</Box>
                        <Box flex={1}>
                          <Typography variant="caption" color={index === 0 ? '#4facfe' : '#f093fb'} fontWeight="bold">
                            {dest.chain}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {dest.amount} {dest.token}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Paper sx={{
                  p: 2,
                  background: alpha('#4facfe', 0.1),
                  border: '2px solid #4facfe'
                }}>
                  <LinkOff sx={{ fontSize: 40, color: '#4facfe', mb: 1 }} />
                  <Box sx={{ mb: 1 }}>
                    {getChainLogo(flows[activeFlow].to.chain, 40)}
                  </Box>
                  <Typography variant="subtitle2" color="#4facfe" fontWeight="bold">
                    {flows[activeFlow].to.chain}
                  </Typography>
                  <Stack spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                    <Chip
                      icon={<LocationOn />}
                      label={flows[activeFlow].to.address}
                      size="small"
                      variant="outlined"
                      sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                    />
                    <Chip
                      label={`${flows[activeFlow].to.amount} ${flows[activeFlow].to.token}`}
                      sx={{ bgcolor: alpha('#4facfe', 0.2), color: 'white' }}
                    />
                  </Stack>
                </Paper>
              )}
            </Grid>
          </Grid>

          <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.6)' }}>
            {flows[activeFlow].type === 'same-chain' ?
              'Complete privacy on Solana or any chain - no link between addresses' :
              flows[activeFlow].type === 'multi-split' ?
              'Split across EVM & Solana chains with untraceable withdrawals' :
              'Deposit on EVM, withdraw on Solana (or vice versa) - completely untraceable'
            }
          </Typography>
        </Box>
      </Fade>
    </Box>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      // Check visibility for animations
      const elements = document.querySelectorAll('.animate-on-scroll');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          setVisible((prev) => ({ ...prev, [el.id]: true }));
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Launch app - navigate directly without requiring wallet connection
  const handleLaunchApp = () => {
    navigate('/deposit');
  };

  const scrollToSection = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0e27', color: 'white', overflow: 'hidden' }}>
      {/* Animated Background */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 50%, ${alpha('#667eea', 0.3)} 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, ${alpha('#f093fb', 0.2)} 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, ${alpha('#4facfe', 0.2)} 0%, transparent 50%),
            linear-gradient(180deg, #0a0e27 0%, #151933 100%)
          `,
          zIndex: -1
        }}
      />
      {/* Floating Navigation */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: scrolled ? 'rgba(10, 14, 39, 0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          transition: 'all 0.3s ease',
          borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <MainLogo height={60} style={{ marginRight: 20 }} />
              <MinimalistDarkLogo height={48} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {/* Social Icons */}
              <IconButton
                onClick={() => window.open('https://x.com/0xinternull', '_blank')}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    color: '#1DA1F2',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <XIcon />
              </IconButton>
              <IconButton
                onClick={() => window.open('https://github.com/JamshedMemon/ecdsa_dkg_ots/tree/ecdsa_ots_crosschain', '_blank')}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    color: '#white',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <GitHub />
              </IconButton>
              <Button
                variant="outlined"
                onClick={() => navigate('/technical-paper')}
                startIcon={<Article />}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#f093fb',
                    background: 'rgba(240, 147, 251, 0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                Technical Paper
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/docs')}
                startIcon={<Article />}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#667eea',
                    background: 'rgba(102, 126, 234, 0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                Documentation
              </Button>
              <Button
                variant="contained"
                onClick={handleLaunchApp}
                sx={{
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 3,
                  px: 3,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #764ba2 0%, #667eea 100%)',
                    transform: 'scale(1.05)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                Launch Testnet
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section - Centered with Demo */}
      <Container maxWidth="lg" sx={{ pt: 15, pb: 8, position: 'relative' }}>
        <Fade in timeout={1000}>
          <Stack spacing={6} alignItems="center" textAlign="center">
            {/* Title Section */}
            <Box>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
                <MainLogo
                  height={80}
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(102, 126, 234, 0.5))'
                  }}
                />
              </Stack>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  fontWeight: 900,
                  background: 'linear-gradient(90deg, #667eea 0%, #f093fb 50%, #4facfe 100%)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2,
                  animation: 'gradient 3s ease infinite',
                  backgroundSize: '200% 200%',
                  lineHeight: 1.2
                }}
              >
                InterNull
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: 1.4,
                  fontWeight: 400,
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                  mb: 2,
                  maxWidth: 800,
                  mx: 'auto'
                }}
              >
                Complete Privacy, Any Chain
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  lineHeight: 1.6,
                  fontWeight: 300,
                  fontSize: { xs: '0.95rem', md: '1.1rem' },
                  maxWidth: 700,
                  mx: 'auto'
                }}
              >
                Privacy-preserving transactions across EVM & Solana.
                Deposit on one chain, withdraw on another with complete anonymity.
              </Typography>
            </Box>

            {/* Demo Video - Centered */}
            <Box sx={{ width: '100%', maxWidth: 1200 }}>
              <AnimatedFlowVideo />
            </Box>

            {/* CTA Buttons */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ElectricBolt />}
                onClick={handleLaunchApp}
                sx={{
                  py: 2,
                  px: 5,
                  borderRadius: 3,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  textTransform: 'none',
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 15px 40px rgba(102, 126, 234, 0.5)'
                  }
                }}
              >
                Launch Testnet
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<Article />}
                onClick={() => navigate('/docs')}
                sx={{
                  py: 2,
                  px: 5,
                  borderRadius: 3,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  fontSize: '1.1rem',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#667eea',
                    bgcolor: 'rgba(102, 126, 234, 0.1)'
                  }
                }}
              >
                Learn More
              </Button>
            </Stack>

            {/* Quick Stats */}
            <Stack direction="row" spacing={4} sx={{ mt: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#667eea' }}>
                  6
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Chains
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#f093fb' }}>
                  10+
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Tokens
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#4facfe' }}>
                  100%
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Private
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Fade>

        {/* Scroll Indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            cursor: 'pointer',
            animation: 'bounce 2s infinite'
          }}
          onClick={scrollToSection}
        >
          <IconButton sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            <KeyboardArrowDown fontSize="large" />
          </IconButton>
        </Box>
      </Container>

      {/* How It Works Section */}
      <Box id="how-it-works" sx={{ py: 10, bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            fontWeight="bold"
            textAlign="center"
            gutterBottom
            sx={{
              background: 'linear-gradient(90deg, #667eea 0%, #f093fb 100%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Privacy Protocol - EVM & Solana Support
          </Typography>
          <Typography
            variant="h6"
            textAlign="center"
            sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 8, maxWidth: 700, mx: 'auto' }}
          >
            Complete financial privacy on same chain or bridge between Ethereum, Solana, BNB Chain, Polygon, Base, Hyperliquid and more
          </Typography>

          <Grid container spacing={4}>
            {[
              {
                step: 1,
                title: 'Deposit Any Token',
                description: 'Send SOL, ETH, HYPE, USDC, or any token to our treasury on Solana or EVM chains.',
                icon: <Token fontSize="large" />,
                color: '#667eea',
                details: ['EVM & Solana support', 'Any source chain', 'Instant confirmation']
              },
              {
                step: 2,
                title: 'Choose Withdrawal Options',
                description: 'Withdraw on same chain or bridge between ecosystems with complete privacy.',
                icon: <Language fontSize="large" />,
                color: '#764ba2',
                details: ['Multi-chain bridge', 'Same-chain privacy', 'Multi-chain splits']
              },
              {
                step: 3,
                title: 'Receive OTS Keys',
                description: 'Get cryptographic keys (Ed25519 for Solana, ECDSA for EVM) for your target chains.',
                icon: <Key fontSize="large" />,
                color: '#f093fb',
                details: ['Chain-specific keys', 'Custom amounts', 'Encrypted storage']
              },
              {
                step: 4,
                title: 'Withdraw Privately',
                description: 'Use keys to withdraw with complete privacy - on any EVM or Solana chain.',
                icon: <LinkOff fontSize="large" />,
                color: '#4facfe',
                details: ['EVM & Solana support', 'Flexible timing', 'Any destination']
              }
            ].map((item, index) => (
              <Grid item xs={12} md={3} key={index}>
                <Grow in={visible[`step-${index}`]} timeout={1000 + index * 200}>
                  <Card
                    id={`step-${index}`}
                    className="animate-on-scroll"
                    sx={{
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 3,
                      p: 3,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: `0 20px 40px ${alpha(item.color, 0.3)}`,
                        borderColor: item.color
                      }
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${item.color} 0%, ${alpha(item.color, 0.5)} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 3,
                          boxShadow: `0 10px 30px ${alpha(item.color, 0.3)}`
                        }}
                      >
                        {React.cloneElement(item.icon, { sx: { color: 'white' } })}
                      </Box>

                      <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
                        Step {item.step}: {item.title}
                      </Typography>

                      <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}>
                        {item.description}
                      </Typography>

                      <Stack spacing={1}>
                        {item.details.map((detail, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Check sx={{ color: item.color, fontSize: 16 }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              {detail}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Supported Chains Section */}
      <Box sx={{ py: 8, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            fontWeight="bold"
            textAlign="center"
            gutterBottom
            sx={{
              background: 'linear-gradient(90deg, #667eea 0%, #f093fb 100%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            Privacy First, Not Just a Bridge
          </Typography>
          <Typography
            variant="h6"
            textAlign="center"
            sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 6 }}
          >
            True privacy protocol across EVM & Solana - anonymize on same chain or bridge between ecosystems
          </Typography>
          <SupportedChains />
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography
              variant="h3"
              fontWeight="bold"
              gutterBottom
              sx={{
                background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Complete Privacy Features
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 4 }}>
              Privacy-first protocol across EVM & Solana ecosystems
            </Typography>

            <Stack spacing={3}>
              {[
                {
                  icon: <SwapHoriz />,
                  title: 'Multi-Chain Bridge',
                  description: 'Private bridge between Ethereum, Solana, BNB Chain, Polygon, Base, Hyperliquid - complete anonymity'
                },
                {
                  icon: <Token />,
                  title: 'Multi-Token Support',
                  description: 'SOL, ETH, HYPE, USDC, USDT and more across EVM and Solana chains'
                },
                {
                  icon: <Security />,
                  title: 'Dual Key System',
                  description: 'Ed25519 for Solana, ECDSA for EVM - seamless cross-ecosystem privacy'
                },
                {
                  icon: <Speed />,
                  title: 'Privacy First',
                  description: 'Privacy protocol first - bridging is just one feature of complete anonymity'
                },
                {
                  icon: <LinkOff />,
                  title: 'Complete Unlinkability',
                  description: 'Mathematical guarantee: no connection between source and destination across any chain'
                }
              ].map((feature, index) => (
                <Fade in={visible[`feature-${index}`]} timeout={1000} key={index}>
                  <Box
                    id={`feature-${index}`}
                    className="animate-on-scroll"
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 2,
                      borderRadius: 2,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderColor: '#4facfe',
                        transform: 'translateX(8px)'
                      }
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: 'rgba(79, 172, 254, 0.2)',
                        color: '#4facfe'
                      }}
                    >
                      {feature.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {feature.description}
                      </Typography>
                    </Box>
                  </Box>
                </Fade>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 4,
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.05) 100%)',
                border: '1px solid rgba(79, 172, 254, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
                Privacy Protocol Architecture
              </Typography>

              <Stack spacing={3} sx={{ mt: 3 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#4facfe', mb: 1, fontWeight: 'bold' }}>
                    COMPLETE PRIVACY PROTOCOL - EVM & SOLANA
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.8 }}>
                    Deposit any token on Solana or EVM chains and withdraw with complete privacy - on the same chain for anonymization
                    or bridge between Solana ↔ EVM for maximum privacy. Split withdrawals across multiple chains.
                    Our protocol ensures zero correlation between deposits and withdrawals across both ecosystems.
                  </Typography>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#00f2fe', mb: 1, fontWeight: 'bold' }}>
                    TECHNICAL ARCHITECTURE
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#4facfe', minWidth: 95 }}>• Multi Ecosystem:</Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Solana SPL tokens + ERC-20 tokens with unified treasury system
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#4facfe', minWidth: 95 }}>• Dual Keys:</Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Ed25519 for Solana, ECDSA for EVM - automatic key type selection
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#4facfe', minWidth: 95 }}>• Backend Node:</Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Validates deposits on EVM and Solana chains, manages key distribution
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: '#00f2fe', fontWeight: 'bold' }}>
                      Chains
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                      6
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      All Ecosystems
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: '#4facfe', fontWeight: 'bold' }}>
                      Tokens
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                      10+
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      All majors
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" sx={{ color: '#f093fb', fontWeight: 'bold' }}>
                      Privacy
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                      100%
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Guaranteed
                    </Typography>
                  </Grid>
                </Grid>
              </Stack>

              {/* Animated Lines */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'linear-gradient(90deg, transparent, #4facfe, transparent)',
                  animation: 'slide 3s linear infinite'
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          py: 10,
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(244, 147, 251, 0.1) 100%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={3} alignItems="center" textAlign="center">
            <MainLogo
              height={80}
              style={{
                filter: 'drop-shadow(0 0 30px rgba(244, 147, 251, 0.5))'
              }}
            />
            <Typography
              variant="h3"
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(90deg, #667eea 0%, #f093fb 100%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Ready for True Privacy?
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', maxWidth: 500 }}>
              Join the revolution of truly private transactions across EVM & Solana
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleLaunchApp}
                endIcon={<ArrowForward />}
                sx={{
                  py: 2,
                  px: 5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  borderRadius: 50,
                  textTransform: 'none',
                  background: 'linear-gradient(90deg, #667eea 0%, #f093fb 100%)',
                  boxShadow: '0 10px 30px rgba(244, 147, 251, 0.4)',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 15px 40px rgba(244, 147, 251, 0.5)'
                  }
                }}
              >
                Launch Testnet
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<GitHub />}
                sx={{
                  py: 2,
                  px: 5,
                  borderRadius: 50,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#f093fb',
                    bgcolor: 'rgba(244, 147, 251, 0.1)'
                  }
                }}
                onClick={() => window.open('https://github.com/JamshedMemon/ecdsa_dkg_ots/tree/ecdsa_ots_crosschain', '_blank')}
              >
                View Code
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <MinimalistDarkLogo height={32} style={{ opacity: 0.8 }} />
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              © 2024 Internull. Privacy is a human right.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={3}>
            <Typography
              variant="body2"
              onClick={() => navigate('/pitch-deck')}
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'color 0.3s ease',
                '&:hover': { color: '#f093fb' }
              }}
            >
              Pitch Deck
            </Typography>
            <Typography
              variant="body2"
              onClick={() => navigate('/docs')}
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'color 0.3s ease',
                '&:hover': { color: '#667eea' }
              }}
            >
              Documentation
            </Typography>
            <Typography
              variant="body2"
              onClick={() => window.open('https://github.com/JamshedMemon/ecdsa_dkg_ots/tree/ecdsa_ots_crosschain', '_blank')}
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'color 0.3s ease',
                '&:hover': { color: '#667eea' }
              }}
            >
              GitHub
            </Typography>
            <Typography
              variant="body2"
              onClick={() => window.open('https://x.com/0xinternull', '_blank')}
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'color 0.3s ease',
                '&:hover': { color: '#1DA1F2' }
              }}
            >
              Twitter
            </Typography>
          </Stack>
        </Stack>
      </Container>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideArrow {
          0% { transform: translateX(0); }
          50% { transform: translateX(10px); }
          100% { transform: translateX(0); }
        }

        @keyframes expandWidth {
          from { width: 0; }
          to { width: 100%; }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px rgba(102, 126, 234, 0.5); }
          50% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.8); }
        }
      `}</style>
    </Box>
  );
};

export default Landing;