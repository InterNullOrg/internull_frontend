import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  alpha,
  Fade,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Replay,
  AccountBalanceWallet,
  CheckCircle,
  Key,
  Send
} from '@mui/icons-material';
import { getChainLogo } from './ChainLogos';

const AnimatedFlowVideo = () => {
  const [playing, setPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentExample, setCurrentExample] = useState(0);
  const [typingProgress, setTypingProgress] = useState(0);

  // Example scenarios
  const examples = [
    {
      title: 'ETH Cross-Chain Split',
      deposit: {
        chain: 'Ethereum',
        chainDisplay: 'Ethereum',
        token: 'ETH',
        amount: '1.0',
        address: '0x7a9f...3d2e'
      },
      keys: [
        { chain: 'Ethereum', chainDisplay: 'Ethereum', token: 'ETH', amount: '0.5' },
        { chain: 'BNB Chain', chainDisplay: 'BNB Chain', token: 'WETH', amount: '0.5' }
      ],
      withdrawals: [
        { chain: 'Ethereum', chainDisplay: 'Ethereum', token: 'ETH', amount: '0.5', address: '0x9b2c...8f41' },
        { chain: 'BNB Chain', chainDisplay: 'BNB Chain', token: 'WETH', amount: '0.5', address: '0x3e7a...2d9c' }
      ]
    },
    {
      title: 'USDC EVM to Solana',
      deposit: {
        chain: 'Ethereum',
        chainDisplay: 'Ethereum',
        token: 'USDC',
        amount: '20',
        address: '0x4f5c...1a2b'
      },
      keys: [
        { chain: 'Solana', chainDisplay: 'Solana', token: 'USDC', amount: '10' },
        { chain: 'BNB Chain', chainDisplay: 'BNB Chain', token: 'USDC', amount: '10' }
      ],
      withdrawals: [
        { chain: 'Solana', chainDisplay: 'Solana', token: 'USDC', amount: '10', address: 'DYw8...jQNd' },
        { chain: 'BNB Chain', chainDisplay: 'BNB Chain', token: 'USDC', amount: '10', address: '0x8c3d...7e2f' }
      ]
    },
    {
      title: 'Solana Privacy Split',
      deposit: {
        chain: 'Solana',
        chainDisplay: 'Solana',
        token: 'SOL',
        amount: '100',
        address: '5KEn...9WzX'
      },
      keys: [
        { chain: 'Solana', chainDisplay: 'Solana', token: 'SOL', amount: '60' },
        { chain: 'Solana', chainDisplay: 'Solana', token: 'SOL', amount: '40' }
      ],
      withdrawals: [
        { chain: 'Solana', chainDisplay: 'Solana', token: 'SOL', amount: '60', address: 'DYw8...jQNd' },
        { chain: 'Solana', chainDisplay: 'Solana', token: 'SOL', amount: '40', address: '7XzG...3mK9' }
      ]
    }
  ];

  const steps = ['deposit', 'confirming', 'dashboard', 'filling-request', 'requesting', 'keys-received', 'withdrawal', 'complete'];
  const example = examples[currentExample];

  // Auto-play logic with typing animation
  useEffect(() => {
    if (!playing) return;

    const stepTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentStep((step) => {
            if (step >= steps.length - 1) {
              setCurrentExample((ex) => (ex + 1) % examples.length);
              return 0;
            }
            return step + 1;
          });
          setTypingProgress(0);
          return 0;
        }
        return prev + 1.2;
      });
    }, 50);

    return () => clearInterval(stepTimer);
  }, [playing, currentStep, steps.length, examples.length]);

  // Typing animation for form filling
  useEffect(() => {
    if (!playing) return;
    if (currentStep === 3) { // filling-request step
      const typingTimer = setInterval(() => {
        setTypingProgress((prev) => Math.min(prev + 2, 100));
      }, 30);
      return () => clearInterval(typingTimer);
    }
  }, [playing, currentStep]);

  const handlePlayPause = () => setPlaying(!playing);
  const handleReplay = () => {
    setCurrentStep(0);
    setProgress(0);
    setTypingProgress(0);
    setPlaying(true);
  };
  const handleExampleChange = (index) => {
    setCurrentExample(index);
    setCurrentStep(0);
    setProgress(0);
    setTypingProgress(0);
    setPlaying(true);
  };

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Laptop Mockup Container */}
      <Paper
        elevation={20}
        sx={{
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
          borderRadius: 4,
          p: 3,
          pb: 8,
          position: 'relative',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5)',
          maxWidth: 1000,
          mx: 'auto'
        }}
      >
        {/* Laptop Screen Bezel */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            borderRadius: 2,
            p: 1.5,
            border: '8px solid #0a0a0a',
            position: 'relative'
          }}
        >
          {/* Camera */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #333 0%, #000 100%)',
              zIndex: 10
            }}
          />

          {/* Screen Content */}
          <Box
            sx={{
              background: '#0a0e27',
              borderRadius: 1,
              minHeight: 500,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Browser Chrome */}
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Stack direction="row" spacing={0.5}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#27c93f' }} />
              </Stack>
              <Box
                sx={{
                  flex: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 1,
                  px: 2,
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#667eea' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  internull.xyz
                </Typography>
              </Box>
            </Box>

            {/* Dashboard Content */}
            <Box sx={{ p: 3 }}>
              {/* Header */}
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                  Treasury Dashboard
                </Typography>
                <Chip
                  icon={<AccountBalanceWallet />}
                  label={example.deposit.address}
                  size="small"
                  sx={{
                    bgcolor: alpha('#667eea', 0.2),
                    color: '#667eea',
                    border: '1px solid rgba(102, 126, 234, 0.3)'
                  }}
                />
              </Box>

              {/* Progress Bar */}
              <LinearProgress
                variant="determinate"
                value={(currentStep / (steps.length - 1)) * 100}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  mb: 3,
                  bgcolor: 'rgba(102, 126, 234, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#667eea'
                  }
                }}
              />

              {/* Step Content */}
              <Fade in key={currentStep} timeout={300}>
                <Box>
                  {/* Step 1: Deposit Form */}
                  {currentStep === 0 && (
                    <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          Make a Deposit
                        </Typography>
                      </Box>
                      <CardContent>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Select Chain</InputLabel>
                          <Select value={example.deposit.chain} label="Select Chain">
                            <MenuItem value={example.deposit.chain}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                {getChainLogo(example.deposit.chain, 20)}
                                <span>{example.deposit.chainDisplay}</span>
                              </Stack>
                            </MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Select Token</InputLabel>
                          <Select value={example.deposit.token} label="Select Token">
                            <MenuItem value={example.deposit.token}>{example.deposit.token}</MenuItem>
                          </Select>
                        </FormControl>

                        <TextField
                          fullWidth
                          label="Amount"
                          value={example.deposit.amount}
                          sx={{ mb: 2 }}
                        />

                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<Send />}
                          sx={{
                            bgcolor: '#667eea',
                            py: 1.5,
                            animation: progress > 70 ? 'pulse 1s infinite' : 'none'
                          }}
                        >
                          Deposit {example.deposit.amount} {example.deposit.token}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 2: Confirming Deposit */}
                  {currentStep === 1 && (
                    <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                      <CardContent>
                        <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
                          <CircularProgress size={60} sx={{ color: '#667eea' }} />
                          <Typography variant="h6" sx={{ color: 'white' }}>
                            Confirming Deposit...
                          </Typography>
                          <Alert severity="info" sx={{ width: '100%' }}>
                            <Typography variant="body2">
                              Waiting for blockchain confirmation of {example.deposit.amount} {example.deposit.token} on{' '}
                              {example.deposit.chainDisplay}
                            </Typography>
                          </Alert>
                          <Box sx={{ width: '100%' }}>
                            <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 3: Dashboard with Confirmed Deposit */}
                  {currentStep === 2 && (
                    <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ color: '#667eea', mb: 2, fontWeight: 'bold' }}>
                          YOUR DEPOSITS
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>Chain</TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>Amount</TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>Status</TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>Action</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              <TableRow>
                                <TableCell>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {getChainLogo(example.deposit.chain, 20)}
                                    <Typography variant="body2" sx={{ color: 'white' }}>
                                      {example.deposit.chainDisplay}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={`${example.deposit.amount} ${example.deposit.token}`}
                                    size="small"
                                    sx={{ bgcolor: alpha('#667eea', 0.2), color: 'white' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    icon={<CheckCircle />}
                                    label="Confirmed"
                                    size="small"
                                    sx={{ bgcolor: alpha('#00ff00', 0.2), color: '#00ff00' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    sx={{
                                      bgcolor: '#667eea',
                                      textTransform: 'none',
                                      animation: progress > 50 ? 'pulse 1s infinite' : 'none',
                                      '&:hover': { bgcolor: '#764ba2' }
                                    }}
                                  >
                                    Request Keys
                                  </Button>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 4: Filling Key Request (with typing animation) */}
                  {currentStep === 3 && (
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          backdropFilter: 'blur(2px)',
                          zIndex: 1
                        }}
                      />
                      <Card
                        sx={{
                          position: 'relative',
                          zIndex: 2,
                          maxWidth: 500,
                          mx: 'auto',
                          bgcolor: 'rgba(10, 14, 39, 0.98)',
                          border: '1px solid rgba(102, 126, 234, 0.3)'
                        }}
                      >
                        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <Typography variant="h6" sx={{ color: 'white' }}>
                            Request Cross-Chain Withdrawal Keys
                          </Typography>
                        </Box>
                        <CardContent>
                          <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="caption">
                              Deposited: {example.deposit.amount} {example.deposit.token} on {example.deposit.chainDisplay}
                            </Typography>
                          </Alert>

                          {example.keys.map((key, idx) => (
                            <Box key={idx} sx={{ mb: 2, display: 'flex', gap: 1 }}>
                              <TextField
                                size="small"
                                label="Amount"
                                value={typingProgress > idx * 30 ? key.amount : ''}
                                sx={{
                                  flex: '0 0 100px',
                                  '& input': {
                                    animation: typingProgress > idx * 30 && typingProgress < (idx * 30 + 20) ? 'blink 0.5s step-end infinite' : 'none'
                                  }
                                }}
                              />
                              <TextField
                                size="small"
                                label="Token"
                                value={typingProgress > (idx * 30 + 10) ? key.token : ''}
                                sx={{ flex: '0 0 100px' }}
                              />
                              <FormControl size="small" sx={{ flex: 1 }}>
                                <InputLabel>Target Chain</InputLabel>
                                <Select
                                  value={typingProgress > (idx * 30 + 20) ? key.chain : ''}
                                  label="Target Chain"
                                >
                                  {typingProgress > (idx * 30 + 20) && (
                                    <MenuItem value={key.chain}>{key.chainDisplay}</MenuItem>
                                  )}
                                </Select>
                              </FormControl>
                            </Box>
                          ))}

                          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Button size="small" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              Cancel
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={typingProgress < 90}
                              sx={{
                                bgcolor: typingProgress >= 90 ? '#667eea' : 'rgba(102, 126, 234, 0.3)',
                                animation: typingProgress >= 90 ? 'pulse 1s infinite' : 'none'
                              }}
                            >
                              Request Keys
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* Step 5: Requesting Keys */}
                  {currentStep === 4 && (
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          backdropFilter: 'blur(2px)',
                          zIndex: 1
                        }}
                      />
                      <Card
                        sx={{
                          position: 'relative',
                          zIndex: 2,
                          maxWidth: 500,
                          mx: 'auto',
                          bgcolor: 'rgba(10, 14, 39, 0.98)',
                          border: '1px solid rgba(102, 126, 234, 0.3)'
                        }}
                      >
                        <CardContent>
                          <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
                            <CircularProgress size={60} sx={{ color: '#667eea' }} />
                            <Typography variant="h6" sx={{ color: 'white' }}>
                              Requesting OTS Keys...
                            </Typography>
                            <Alert severity="info" sx={{ width: '100%' }}>
                              <Typography variant="body2">
                                Requesting {example.keys.length} one-time signature keys for your withdrawal
                              </Typography>
                            </Alert>
                            <Box sx={{ width: '100%' }}>
                              <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* Step 6: Keys Received */}
                  {currentStep === 5 && (
                    <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                      <CardContent>
                        <Stack spacing={2}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircle sx={{ color: '#00ff00', fontSize: 32 }} />
                            <Typography variant="h6" sx={{ color: '#00ff00', fontWeight: 'bold' }}>
                              Keys Received Successfully!
                            </Typography>
                          </Box>

                          <Alert severity="success" sx={{ bgcolor: alpha('#00ff00', 0.1) }}>
                            <Typography variant="body2">
                              Received {example.keys.length} one-time signature keys - Ready to withdraw
                            </Typography>
                          </Alert>

                          {example.keys.map((key, idx) => (
                            <Paper
                              key={idx}
                              sx={{
                                p: 2,
                                bgcolor: alpha(idx === 0 ? '#667eea' : '#f093fb', 0.1),
                                border: `1px solid ${alpha(idx === 0 ? '#667eea' : '#f093fb', 0.3)}`,
                                animation: `slideIn 0.5s ease-out ${idx * 0.2}s both`
                              }}
                            >
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Key sx={{ color: idx === 0 ? '#667eea' : '#f093fb' }} />
                                <Box flex={1}>
                                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {key.amount} {key.token}
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    {getChainLogo(key.chain, 16)}
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                      on {key.chainDisplay}
                                    </Typography>
                                  </Stack>
                                </Box>
                                <Chip label="Ready" size="small" sx={{ bgcolor: alpha('#00ff00', 0.2), color: '#00ff00' }} />
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 7: Withdrawal Dialog with Wallet Popup */}
                  {currentStep === 6 && (
                    <Box sx={{ position: 'relative' }}>
                      {/* Main Background Overlay */}
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          backdropFilter: 'blur(2px)',
                          zIndex: 1
                        }}
                      />

                      {/* Withdrawal Dialog */}
                      <Card
                        sx={{
                          position: 'relative',
                          zIndex: 2,
                          maxWidth: 500,
                          mx: 'auto',
                          bgcolor: 'rgba(10, 14, 39, 0.98)',
                          border: '1px solid rgba(79, 172, 254, 0.3)'
                        }}
                      >
                        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <Typography variant="h6" sx={{ color: 'white' }}>
                            Withdraw from Treasury
                          </Typography>
                        </Box>
                        <CardContent>
                          <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Select Key</InputLabel>
                            <Select value="0" label="Select Key">
                              <MenuItem value="0">
                                Key #1 - {example.withdrawals[0].amount} {example.withdrawals[0].token} on{' '}
                                {example.withdrawals[0].chainDisplay}
                              </MenuItem>
                            </Select>
                          </FormControl>

                          <TextField
                            fullWidth
                            label="Recipient Address"
                            value={example.withdrawals[0].address}
                            sx={{ mb: 2 }}
                          />

                          <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="caption">
                              This withdrawal will be completely untraceable from your deposit
                            </Typography>
                          </Alert>

                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              Cancel
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              sx={{
                                bgcolor: '#4facfe',
                                animation: progress > 50 ? 'pulse 1s infinite' : 'none'
                              }}
                            >
                              Withdraw
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>

                      {/* Wallet Popup (appears after a delay) */}
                      {progress > 30 && (
                        <Fade in timeout={500}>
                          <Card
                            sx={{
                              position: 'absolute',
                              top: -100,
                              right: 20,
                              zIndex: 3,
                              width: 300,
                              bgcolor: 'rgba(255, 255, 255, 0.98)',
                              border: '2px solid rgba(79, 172, 254, 0.5)',
                              boxShadow: '0 20px 60px rgba(79, 172, 254, 0.4)',
                              animation: 'slideIn 0.3s ease-out'
                            }}
                          >
                            <Box sx={{ bgcolor: '#f7f7f7', p: 1.5, borderBottom: '1px solid #e0e0e0' }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                {example.withdrawals[0].chain === 'Solana' ||
                                 example.withdrawals[0].chain.includes('Solana') ? (
                                  <>
                                    <Box
                                      sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)'
                                      }}
                                    />
                                    <Typography variant="subtitle2" sx={{ color: '#000', fontWeight: 'bold' }}>
                                      Phantom
                                    </Typography>
                                  </>
                                ) : (
                                  <>
                                    <Box
                                      sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #f6851b 0%, #e2761b 100%)'
                                      }}
                                    />
                                    <Typography variant="subtitle2" sx={{ color: '#000', fontWeight: 'bold' }}>
                                      MetaMask
                                    </Typography>
                                  </>
                                )}
                              </Stack>
                            </Box>
                            <Box sx={{ p: 2 }}>
                              <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                                Using address for withdrawal:
                              </Typography>
                              <Paper
                                sx={{
                                  p: 1.5,
                                  bgcolor: '#f0f0f0',
                                  border: '1px solid #4facfe',
                                  animation: 'glow 2s ease-in-out infinite'
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: '#000',
                                    fontWeight: 'bold',
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-all'
                                  }}
                                >
                                  {example.withdrawals[0].address}
                                </Typography>
                              </Paper>
                              <Typography variant="caption" sx={{ color: '#4facfe', display: 'block', mt: 1, fontWeight: 'bold' }}>
                                ✓ This is a NEW address - no link to deposit
                              </Typography>
                            </Box>
                          </Card>
                        </Fade>
                      )}
                    </Box>
                  )}

                  {/* Step 8: Complete */}
                  {currentStep === 7 && (
                    <Card sx={{ bgcolor: alpha('#00ff00', 0.05), border: '1px solid rgba(0, 255, 0, 0.3)' }}>
                      <CardContent>
                        <Stack spacing={3} alignItems="center" textAlign="center">
                          <CheckCircle sx={{ fontSize: 60, color: '#00ff00' }} />
                          <Typography variant="h6" sx={{ color: '#00ff00', fontWeight: 'bold' }}>
                            Withdrawal Complete!
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Successfully withdrawn with complete privacy
                          </Typography>

                          <Stack spacing={1} sx={{ width: '100%' }}>
                            {example.withdrawals.map((withdrawal, idx) => (
                              <Paper
                                key={idx}
                                sx={{
                                  p: 2,
                                  bgcolor: 'rgba(0, 255, 0, 0.1)',
                                  border: '1px solid rgba(0, 255, 0, 0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2
                                }}
                              >
                                {getChainLogo(withdrawal.chain, 24)}
                                <Box flex={1}>
                                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {withdrawal.amount} {withdrawal.token}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                    to {withdrawal.address} on {withdrawal.chainDisplay}
                                  </Typography>
                                </Box>
                                <CheckCircle sx={{ color: '#00ff00', fontSize: 20 }} />
                              </Paper>
                            ))}
                          </Stack>

                          <Alert severity="success" sx={{ bgcolor: alpha('#00ff00', 0.1), width: '100%' }}>
                            <Typography variant="caption">
                              ✅ No link between deposit and withdrawal - complete privacy achieved
                            </Typography>
                          </Alert>
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              </Fade>
            </Box>
          </Box>
        </Box>

        {/* Laptop Base */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '110%',
            height: 30,
            background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
            borderRadius: '0 0 20px 20px',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '30%',
              height: 4,
              bgcolor: '#1a1a1a',
              borderRadius: '0 0 4px 4px'
            }
          }}
        />
      </Paper>

      {/* Video Controls */}
      <Box
        sx={{
          mt: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2
        }}
      >
        {/* Example Selector */}
        <Stack direction="row" spacing={1} sx={{ flex: 1, justifyContent: 'center' }}>
          {examples.map((ex, idx) => (
            <Chip
              key={idx}
              label={ex.title}
              size="small"
              onClick={() => handleExampleChange(idx)}
              sx={{
                bgcolor: currentExample === idx ? alpha('#667eea', 0.3) : 'rgba(255, 255, 255, 0.05)',
                color: currentExample === idx ? '#667eea' : 'rgba(255, 255, 255, 0.6)',
                border: currentExample === idx ? '1px solid #667eea' : '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: alpha('#667eea', 0.2)
                }
              }}
            />
          ))}
        </Stack>

        {/* Play Controls */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={handlePlayPause}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            {playing ? <Pause sx={{ color: 'white' }} /> : <PlayArrow sx={{ color: 'white' }} />}
          </IconButton>
          <IconButton
            onClick={handleReplay}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <Replay sx={{ color: 'white' }} />
          </IconButton>
        </Box>
      </Box>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(102, 126, 234, 0);
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes blink {
          50% {
            border-right: 2px solid #667eea;
          }
        }
      `}</style>
    </Box>
  );
};

export default AnimatedFlowVideo;
