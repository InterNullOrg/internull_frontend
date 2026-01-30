import React, { useState } from 'react';
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
  Chip,
  alpha,
  Fade,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
} from '@mui/material';
import {
  ArrowForward,
  ArrowBack,
  CheckCircle,
  Lock,
  SwapHoriz,
  Speed,
  GitHub,
  Article,
  Security,
  Shield,
  VisibilityOff,
  Public,
  AccountBalance,
  Groups,
  Fingerprint,
  Timer,
  Language,
  LinkOff,
  AutoAwesome,
} from '@mui/icons-material';
import Header from '../components/Header';
import { getChainLogo } from '../components/ChainLogos';

const PitchDeck = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const slides = [
    {
      id: 'title',
      title: 'InterNull',
      subtitle: 'Deferred Privacy Intents Protocol',
      tagline: 'Express your intent. Hold the keys. Execute on any chain.',
    },
    {
      id: 'problem',
      title: 'The Privacy Crisis in Web3',
      content: 'problem',
    },
    {
      id: 'solution',
      title: 'Our Solution',
      content: 'solution',
    },
    {
      id: 'how-it-works',
      title: 'How It Works',
      content: 'howItWorks',
    },
    {
      id: 'technology',
      title: 'Breakthrough Technology',
      content: 'technology',
    },
    {
      id: 'features',
      title: 'Why InterNull Wins',
      content: 'features',
    },
    {
      id: 'market',
      title: 'Massive Market Opportunity',
      content: 'market',
    },
    {
      id: 'traction',
      title: 'Live & Growing',
      content: 'traction',
    },
    {
      id: 'cta',
      title: 'Join the Privacy Revolution',
      content: 'cta',
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const SlideContainer = ({ children }) => (
    <Fade in timeout={600}>
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 6,
        }}
      >
        {children}
      </Box>
    </Fade>
  );

  const renderSlideContent = () => {
    const slide = slides[currentSlide];

    switch (slide.content) {
      case 'problem':
        return (
          <SlideContainer>
            <Typography variant="h3" fontWeight="700" gutterBottom sx={{ color: '#ef4444', mb: 4 }}>
              {slide.title}
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card sx={{
                  bgcolor: alpha('#ef4444', 0.1),
                  border: `2px solid ${alpha('#ef4444', 0.3)}`,
                  height: '100%'
                }}>
                  <CardContent>
                    <VisibilityOff sx={{ fontSize: 48, color: '#ef4444', mb: 2 }} />
                    <Typography variant="h5" fontWeight="600" gutterBottom>
                      Complete Transparency = Zero Privacy
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      Every transaction on blockchain is public, permanent, and traceable. Your entire financial history is exposed.
                    </Typography>
                    <List dense>
                      <ListItem><Typography>• Wallet balances visible to everyone</Typography></ListItem>
                      <ListItem><Typography>• Transaction history permanently recorded</Typography></ListItem>
                      <ListItem><Typography>• Identity easily linked to addresses</Typography></ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{
                  bgcolor: alpha('#f59e0b', 0.1),
                  border: `2px solid ${alpha('#f59e0b', 0.3)}`,
                  height: '100%'
                }}>
                  <CardContent>
                    <Fingerprint sx={{ fontSize: 48, color: '#f59e0b', mb: 2 }} />
                    <Typography variant="h5" fontWeight="600" gutterBottom>
                      Real-World Consequences
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon><CheckCircle sx={{ color: '#f59e0b' }} /></ListItemIcon>
                        <ListItemText
                          primary="Business Intelligence Leaks"
                          secondary="Competitors track your treasury movements"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle sx={{ color: '#f59e0b' }} /></ListItemIcon>
                        <ListItemText
                          primary="Personal Security Risks"
                          secondary="Large holdings make you a target"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle sx={{ color: '#f59e0b' }} /></ListItemIcon>
                        <ListItemText
                          primary="Price Manipulation"
                          secondary="Whales front-run your trades"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </SlideContainer>
        );

      case 'solution':
        return (
          <SlideContainer>
            <Typography variant="h3" fontWeight="700" gutterBottom sx={{ color: '#4ade80', mb: 2 }}>
              {slide.title}
            </Typography>

            {/* Deferred Intents Explanation */}
            <Paper sx={{
              p: 4,
              mb: 4,
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(240, 147, 251, 0.15) 100%)',
              border: '2px solid rgba(102, 126, 234, 0.4)',
            }}>
              <Typography variant="h5" fontWeight="700" gutterBottom sx={{ color: '#667eea' }}>
                🎯 Deferred Privacy Intents
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Express your cross-chain intent. Receive cryptographic keys that tokenize that intent. Execute whenever you want, on any chain, with complete privacy.
              </Typography>

              {/* Intent Flow Visualization */}
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <Paper sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: 'rgba(102, 126, 234, 0.2)',
                    border: '1px solid rgba(102, 126, 234, 0.4)'
                  }}>
                    <Typography variant="h6" fontWeight="700" sx={{ color: '#667eea' }}>
                      1️⃣ Express
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      "I want 0.3 ETH on Solana, 0.4 ETH on Polygon"
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={1} sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#667eea' }}>→</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Paper sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: 'rgba(240, 147, 251, 0.2)',
                    border: '1px solid rgba(240, 147, 251, 0.4)'
                  }}>
                    <Typography variant="h6" fontWeight="700" sx={{ color: '#f093fb' }}>
                      2️⃣ Receive Keys
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cryptographic tokens of your intent
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={1} sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#f093fb' }}>→</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: 'rgba(74, 222, 128, 0.2)',
                    border: '1px solid rgba(74, 222, 128, 0.4)'
                  }}>
                    <Typography variant="h6" fontWeight="700" sx={{ color: '#4ade80' }}>
                      3️⃣ Execute Anytime
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Any chain. Any address. Complete privacy.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>

            {/* Technology Cards */}
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              Powered by battle-tested cryptography:
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{
                  p: 3,
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  transition: 'transform 0.3s',
                  '&:hover': { transform: 'translateY(-8px)' }
                }}>
                  <Lock sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    ECDSA One-Time Signatures
                  </Typography>
                  <Typography color="text.secondary">
                    Each key can only be used once. Prevents tracking and ensures perfect forward secrecy.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{
                  p: 3,
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  transition: 'transform 0.3s',
                  '&:hover': { transform: 'translateY(-8px)' }
                }}>
                  <Security sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    Merkle Tree Verification
                  </Typography>
                  <Typography color="text.secondary">
                    Efficiently proves key ownership without revealing which key from the set you're using.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{
                  p: 3,
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  transition: 'transform 0.3s',
                  '&:hover': { transform: 'translateY(-8px)' }
                }}>
                  <Groups sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    Threshold Cryptography
                  </Typography>
                  <Typography color="text.secondary">
                    Distributed key generation ensures no single party can compromise your privacy.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </SlideContainer>
        );

      case 'howItWorks':
        return (
          <SlideContainer>
            <Typography variant="h3" fontWeight="700" gutterBottom sx={{ mb: 6 }}>
              {slide.title}
            </Typography>
            <Stack spacing={4}>
              {[
                {
                  step: '1',
                  icon: <AccountBalance />,
                  title: 'Deposit Assets',
                  description: 'Send ETH, BNB, or other tokens to the InterNull smart contract on any supported chain.',
                  color: '#667eea',
                },
                {
                  step: '2',
                  icon: <AutoAwesome />,
                  title: 'Request Privacy Keys',
                  description: 'System generates unique one-time signature keys for your deposit using distributed threshold cryptography.',
                  color: '#764ba2',
                },
                {
                  step: '3',
                  icon: <SwapHoriz />,
                  title: 'Withdraw Anywhere, Anytime',
                  description: 'Use your keys to withdraw to a fresh address on the same chain or cross-chain. No time limits. Complete anonymity.',
                  color: '#f093fb',
                },
              ].map((item) => (
                <Paper
                  key={item.step}
                  sx={{
                    p: 4,
                    display: 'flex',
                    gap: 3,
                    background: `linear-gradient(135deg, ${alpha(item.color, 0.1)} 0%, ${alpha(item.color, 0.05)} 100%)`,
                    border: `2px solid ${alpha(item.color, 0.3)}`,
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateX(10px)',
                      borderColor: item.color,
                    }
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: item.color,
                      width: 64,
                      height: 64,
                      fontSize: 28,
                      fontWeight: 700,
                    }}
                  >
                    {item.step}
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: item.color }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {item.description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', color: item.color }}>
                    {item.icon}
                  </Box>
                </Paper>
              ))}
            </Stack>
          </SlideContainer>
        );

      case 'technology':
        return (
          <SlideContainer>
            <Typography variant="h3" fontWeight="700" gutterBottom sx={{ mb: 4 }}>
              {slide.title}
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: '#667eea' }}>
                  What Makes Us Different
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><CheckCircle sx={{ color: '#4ade80' }} /></ListItemIcon>
                    <ListItemText
                      primary="No Trusted Setup Required"
                      secondary="Unlike zk-SNARKs, our system needs no ceremony or trust assumptions"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle sx={{ color: '#4ade80' }} /></ListItemIcon>
                    <ListItemText
                      primary="Instant Withdrawals"
                      secondary="No relayer delays or waiting periods. Withdraw immediately."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle sx={{ color: '#4ade80' }} /></ListItemIcon>
                    <ListItemText
                      primary="Keys Never Expire"
                      secondary="Hold your keys for years. No time pressure to withdraw."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle sx={{ color: '#4ade80' }} /></ListItemIcon>
                    <ListItemText
                      primary="Native Cross-Chain Support"
                      secondary="Deposit on Ethereum, withdraw on BNB Chain. Built-in from day one."
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: '#667eea', mb: 3 }}>
                  Technical Advantages
                </Typography>
                <Stack spacing={2}>
                  {[
                    { label: 'Gas Efficiency', value: '~200k gas', icon: <Speed /> },
                    { label: 'Security Model', value: 'Ethereum-grade', icon: <Shield /> },
                    { label: 'Anonymity Set', value: 'Unlimited growth', icon: <Groups /> },
                    { label: 'Merkle Proof Size', value: '~500 bytes', icon: <Fingerprint /> },
                  ].map((stat) => (
                    <Paper
                      key={stat.label}
                      sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        background: 'rgba(102, 126, 234, 0.05)',
                        border: '1px solid rgba(102, 126, 234, 0.2)',
                      }}
                    >
                      <Box sx={{ color: '#667eea' }}>{stat.icon}</Box>
                      <Box flex={1}>
                        <Typography variant="body2" color="text.secondary">
                          {stat.label}
                        </Typography>
                        <Typography variant="h6" fontWeight="600">
                          {stat.value}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </SlideContainer>
        );

      case 'features':
        return (
          <SlideContainer>
            <Typography variant="h3" fontWeight="700" gutterBottom sx={{ mb: 6, textAlign: 'center' }}>
              {slide.title}
            </Typography>
            <Grid container spacing={3}>
              {[
                {
                  icon: <LinkOff />,
                  title: 'Unlinkable Transactions',
                  description: 'Mathematical impossibility to link deposits to withdrawals',
                  color: '#667eea',
                },
                {
                  icon: <Language />,
                  title: 'True Cross-Chain',
                  description: 'Deposit on one chain, withdraw on another. No bridges needed.',
                  color: '#764ba2',
                },
                {
                  icon: <Timer />,
                  title: 'No Expiration',
                  description: 'Keys remain valid forever. Withdraw when you want.',
                  color: '#f093fb',
                },
                {
                  icon: <Speed />,
                  title: 'Instant Execution',
                  description: 'No relayer delays. Direct smart contract interaction.',
                  color: '#667eea',
                },
                {
                  icon: <Shield />,
                  title: 'Battle-Tested Crypto',
                  description: 'Built on ECDSA, the same crypto securing Bitcoin & Ethereum.',
                  color: '#764ba2',
                },
                {
                  icon: <Public />,
                  title: 'Open Source',
                  description: 'Fully auditable code. No hidden backdoors.',
                  color: '#f093fb',
                },
              ].map((feature, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card
                    sx={{
                      height: '100%',
                      background: `linear-gradient(135deg, ${alpha(feature.color, 0.1)} 0%, ${alpha(feature.color, 0.05)} 100%)`,
                      border: `2px solid ${alpha(feature.color, 0.3)}`,
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-8px) scale(1.02)',
                        borderColor: feature.color,
                        boxShadow: `0 20px 40px ${alpha(feature.color, 0.3)}`,
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 4 }}>
                      <Box sx={{ color: feature.color, mb: 2 }}>
                        {React.cloneElement(feature.icon, { sx: { fontSize: 56 } })}
                      </Box>
                      <Typography variant="h6" fontWeight="600" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </SlideContainer>
        );

      case 'market':
        return (
          <SlideContainer>
            <Typography variant="h3" fontWeight="700" gutterBottom sx={{ mb: 4 }}>
              {slide.title}
            </Typography>
            <Grid container spacing={4}>
              {/* Left side - Privacy Protocol Market Chart */}
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 4, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                  <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: '#667eea', mb: 3 }}>
                    Privacy Protocols Volume Comparison
                  </Typography>
                  <Stack spacing={3}>
                    {/* Tornado Cash Bar */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" fontWeight="600" sx={{ color: '#4ade80' }}>
                          🌪️ Tornado Cash
                        </Typography>
                        <Typography variant="body1" fontWeight="700" sx={{ color: '#4ade80' }}>
                          $1.9B
                        </Typography>
                      </Box>
                      <Box sx={{
                        height: 32,
                        background: 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)',
                        borderRadius: 2,
                        width: '100%',
                        boxShadow: '0 4px 20px rgba(74, 222, 128, 0.4)',
                      }} />
                      <Typography variant="caption" color="text.secondary">
                        H1 2024 deposits (+50% YoY)
                      </Typography>
                    </Box>

                    {/* Monero Bar */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" fontWeight="600" sx={{ color: '#f59e0b' }}>
                          🔒 Monero (XMR)
                        </Typography>
                        <Typography variant="body1" fontWeight="700" sx={{ color: '#f59e0b' }}>
                          $3.5B
                        </Typography>
                      </Box>
                      <Box sx={{
                        height: 32,
                        background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                        borderRadius: 2,
                        width: '85%',
                        boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
                      }} />
                      <Typography variant="caption" color="text.secondary">
                        Market Cap (+17% in 2024)
                      </Typography>
                    </Box>

                    {/* Zcash Bar */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" fontWeight="600" sx={{ color: '#667eea' }}>
                          🛡️ Zcash (ZEC)
                        </Typography>
                        <Typography variant="body1" fontWeight="700" sx={{ color: '#667eea' }}>
                          $800M+
                        </Typography>
                      </Box>
                      <Box sx={{
                        height: 32,
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 2,
                        width: '45%',
                        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                      }} />
                      <Typography variant="caption" color="text.secondary">
                        Daily volume (+112% growth in 2024)
                      </Typography>
                    </Box>
                  </Stack>

                  {/* The Gap */}
                  <Paper sx={{
                    mt: 4,
                    p: 2,
                    background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(102, 126, 234, 0.1) 100%)',
                    border: '2px dashed rgba(240, 147, 251, 0.5)',
                    textAlign: 'center'
                  }}>
                    <Typography variant="h6" fontWeight="700" sx={{ color: '#f093fb' }}>
                      🚀 The Market Gap: Cross-Chain + Privacy + Intents
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No protocol combines deferred execution, multi-chain support, and unlinkable transactions
                    </Typography>
                  </Paper>
                </Paper>
              </Grid>

              {/* Right side - Market Stats */}
              <Grid item xs={12} md={5}>
                <Stack spacing={3}>
                  <Paper sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(102, 126, 234, 0.05) 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    textAlign: 'center'
                  }}>
                    <Typography variant="h2" fontWeight="800" sx={{
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      $3T+
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      DeFi Total Market Cap
                    </Typography>
                  </Paper>

                  <Paper sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(74, 222, 128, 0.05) 100%)',
                    border: '1px solid rgba(74, 222, 128, 0.3)',
                    textAlign: 'center'
                  }}>
                    <Typography variant="h2" fontWeight="800" sx={{ color: '#4ade80' }}>
                      500M+
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Crypto Users Globally
                    </Typography>
                  </Paper>

                  <Paper sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.15) 0%, rgba(240, 147, 251, 0.05) 100%)',
                    border: '1px solid rgba(240, 147, 251, 0.3)',
                    textAlign: 'center'
                  }}>
                    <Typography variant="h2" fontWeight="800" sx={{ color: '#f093fb' }}>
                      $5B+
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Privacy Protocol Volume (2024)
                    </Typography>
                  </Paper>

                  <Chip
                    label="📈 Privacy demand growing 50%+ YoY"
                    sx={{
                      bgcolor: 'rgba(74, 222, 128, 0.2)',
                      color: '#4ade80',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      py: 2
                    }}
                  />
                </Stack>
              </Grid>
            </Grid>
          </SlideContainer>
        );

      case 'traction':
        return (
          <SlideContainer>
            <Typography variant="h3" fontWeight="700" gutterBottom sx={{ mb: 4 }}>
              {slide.title}
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Card sx={{ p: 4, background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)' }}>
                  <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: '#4ade80', mb: 3 }}>
                    ✅ Live & Multi-Chain
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    Supporting 6 major blockchains across EVM & Solana ecosystems
                  </Typography>
                  <Grid container spacing={2}>
                    {[
                      { name: 'Ethereum', color: '#627EEA' },
                      { name: 'Solana', color: '#14F195' },
                      { name: 'BNB Chain', color: '#F3BA2F' },
                      { name: 'Polygon', color: '#8247E5' },
                      { name: 'Base', color: '#0052FF' },
                      { name: 'Hyperliquid', color: '#00D9FF' }
                    ].map((chain, index) => (
                      <Grid item xs={6} md={2} key={index}>
                        <Paper
                          sx={{
                            p: 2,
                            textAlign: 'center',
                            background: `linear-gradient(135deg, ${alpha(chain.color, 0.1)} 0%, ${alpha(chain.color, 0.05)} 100%)`,
                            border: `1px solid ${alpha(chain.color, 0.3)}`,
                            borderRadius: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-5px)',
                              borderColor: chain.color,
                              boxShadow: `0 10px 20px ${alpha(chain.color, 0.3)}`
                            }
                          }}
                        >
                          <Box sx={{ mb: 1 }}>
                            {getChainLogo(chain.name, 32)}
                          </Box>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ color: chain.color }}>
                            {chain.name}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(102, 126, 234, 0.05)' }}>
                  <Typography variant="h5" fontWeight="600" gutterBottom>
                    Ready for Scale
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Built with production-grade infrastructure. Supporting cross-chain operations, multiple tokens, and unlimited anonymity sets.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </SlideContainer>
        );

      case 'cta':
        return (
          <SlideContainer>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" fontWeight="700" gutterBottom sx={{
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 3
              }}>
                {slide.title}
              </Typography>
              <Typography variant="h5" color="text.secondary" paragraph sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}>
                The future of finance demands privacy. InterNull makes it possible.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center" sx={{ mb: 6 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/dashboard')}
                  endIcon={<ArrowForward />}
                  sx={{
                    bgcolor: '#667eea',
                    '&:hover': { bgcolor: '#5a67d8' },
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                  }}
                >
                  Launch App
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/docs')}
                  startIcon={<Article />}
                  sx={{
                    borderColor: '#667eea',
                    color: '#667eea',
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: '#5a67d8',
                      bgcolor: alpha('#667eea', 0.1),
                    }
                  }}
                >
                  Read Documentation
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => window.open('https://github.com/yourusername/internull', '_blank')}
                  startIcon={<GitHub />}
                  sx={{
                    borderColor: '#667eea',
                    color: '#667eea',
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: '#5a67d8',
                      bgcolor: alpha('#667eea', 0.1),
                    }
                  }}
                >
                  View on GitHub
                </Button>
              </Stack>

              <Divider sx={{ my: 6 }} />

              <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                "Privacy is not about having something to hide. Privacy is about protecting who you are."
              </Typography>
            </Box>
          </SlideContainer>
        );

      default:
        // Title slide
        return (
          <SlideContainer>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '3rem', md: '5rem' },
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 3,
                }}
              >
                {slide.title}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 500,
                  color: 'text.secondary',
                  mb: 2,
                }}
              >
                {slide.subtitle}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: '#667eea',
                  fontStyle: 'italic',
                  mb: 6,
                }}
              >
                {slide.tagline}
              </Typography>

              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 8 }}>
                <Chip icon={<Lock />} label="Private" sx={{ bgcolor: alpha('#667eea', 0.2), color: '#667eea' }} />
                <Chip icon={<Language />} label="Cross-Chain" sx={{ bgcolor: alpha('#764ba2', 0.2), color: '#764ba2' }} />
                <Chip icon={<Speed />} label="Instant" sx={{ bgcolor: alpha('#f093fb', 0.2), color: '#f093fb' }} />
              </Stack>

              <Button
                variant="contained"
                size="large"
                onClick={nextSlide}
                endIcon={<ArrowForward />}
                sx={{
                  bgcolor: '#667eea',
                  '&:hover': { bgcolor: '#5a67d8' },
                  px: 6,
                  py: 2,
                  fontSize: '1.2rem',
                }}
              >
                Start Presentation
              </Button>
            </Box>
          </SlideContainer>
        );
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0a0e27',
        background: `
          radial-gradient(circle at 10% 20%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 90% 80%, rgba(240, 147, 251, 0.1) 0%, transparent 50%),
          linear-gradient(180deg, #0a0e27 0%, #151933 100%)
        `,
        color: 'white',
      }}
    >
      <Header />

      <Container maxWidth="lg" sx={{ pt: 4, pb: 8 }}>
        {renderSlideContent()}

        {/* Navigation */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 6,
          pt: 4,
          borderTop: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <Button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            startIcon={<ArrowBack />}
            sx={{ color: '#667eea' }}
          >
            Previous
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {slides.map((_, index) => (
              <Box
                key={index}
                onClick={() => setCurrentSlide(index)}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: index === currentSlide ? '#667eea' : 'rgba(102, 126, 234, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    bgcolor: index === currentSlide ? '#667eea' : 'rgba(102, 126, 234, 0.5)',
                    transform: 'scale(1.2)',
                  }
                }}
              />
            ))}
          </Box>

          <Button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            endIcon={<ArrowForward />}
            sx={{ color: '#667eea' }}
          >
            Next
          </Button>
        </Box>

        {/* Slide counter */}
        <Typography
          variant="body2"
          sx={{
            textAlign: 'center',
            mt: 2,
            color: 'text.secondary',
          }}
        >
          Slide {currentSlide + 1} of {slides.length}
        </Typography>
      </Container>
    </Box>
  );
};

export default PitchDeck;
