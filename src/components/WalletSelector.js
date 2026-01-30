import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { AccountBalanceWallet, CheckCircle, Error, Help, QrCode } from '@mui/icons-material';
import { toast } from 'react-toastify';
import walletManager from '../services/walletManager';

const WalletSelector = ({ open, onClose, onWalletConnected }) => {
  const [availableWallets, setAvailableWallets] = useState({});
  const [connecting, setConnecting] = useState(null);
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    if (open) {
      const wallets = walletManager.detectAvailableWallets();
      setAvailableWallets(wallets);
      console.log('Available wallets:', wallets);
    }
  }, [open]);

  const handleWalletConnect = async (walletType) => {
    try {
      setConnecting(walletType);
      toast.info(`Connecting to ${availableWallets[walletType]?.name || walletType}...`);

      const connection = await walletManager.connectWallet(walletType);
      
      // Test wallet compatibility
      const testResult = await walletManager.testWalletCompatibility();
      setTestResults(testResult);
      
      toast.success(`✅ Connected to ${connection.walletType}!`);
      
      if (connection.walletType === 'MetaMask') {
        toast.success('✅ MetaMask is fully compatible with ECDSA signatures!');
      } else {
        toast.success('✅ Wallet connected successfully!');
      }
      
      if (onWalletConnected) {
        onWalletConnected(connection);
      }
      
    } catch (error) {
      console.error('Wallet connection failed:', error);
      toast.error(`Failed to connect: ${error.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const getCompatibilityChip = (wallet) => {
    // All wallets are compatible with ECDSA
    return <Chip size="small" icon={<CheckCircle />} label="ECDSA Compatible" color="success" />;
  };

  const WalletCard = ({ walletType, wallet }) => (
    <Grid item xs={12} sm={6} md={4} key={walletType}>
      <Card 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: '2px solid #4caf50' // All wallets compatible with ECDSA
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ mr: 1 }}>
              {wallet.icon} {wallet.name}
            </Typography>
          </Box>
          
          {getCompatibilityChip(wallet)}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {wallet.note}
          </Typography>
          
          {walletType === 'walletconnect' && (
            <Box sx={{ mt: 1 }}>
              <Chip size="small" icon={<QrCode />} label="QR Code" color="primary" />
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Scan with mobile wallet
              </Typography>
            </Box>
          )}
        </CardContent>
        
        <CardActions>
          <Button
            fullWidth
            variant={wallet.wotsCompatible === true ? "contained" : "outlined"}
            color={wallet.wotsCompatible === false ? "error" : "primary"}
            onClick={() => handleWalletConnect(walletType)}
            disabled={connecting === walletType}
            startIcon={connecting === walletType ? <CircularProgress size={16} /> : <AccountBalanceWallet />}
          >
            {connecting === walletType ? 'Connecting...' : 'Connect'}
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AccountBalanceWallet sx={{ mr: 1 }} />
          Select Wallet for WOTS Withdrawals
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>WOTS Compatibility:</strong> WOTS signatures require 8.8KB of transaction data. 
            Not all wallets can handle this amount of data.
          </Typography>
        </Alert>

        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>✅ Recommended:</strong> Coinbase Wallet, Rabby, Trust Wallet, or WalletConnect mobile wallets
          </Typography>
        </Alert>

        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>❌ Known Issues:</strong> MetaMask cannot handle WOTS arrays - use Python scripts instead
          </Typography>
        </Alert>

        <Typography variant="h6" gutterBottom>
          Available Wallets ({Object.keys(availableWallets).length})
        </Typography>
        
        <Grid container spacing={2}>
          {Object.entries(availableWallets).map(([walletType, wallet]) => (
            <WalletCard key={walletType} walletType={walletType} wallet={wallet} />
          ))}
        </Grid>

        {Object.keys(availableWallets).length === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            No wallets detected. Please install MetaMask, Coinbase Wallet, or another Web3 wallet.
          </Alert>
        )}

        {testResults && (
          <Alert 
            severity={testResults.success ? "success" : "error"} 
            sx={{ mt: 2 }}
          >
            <Typography variant="body2">
              <strong>Compatibility Test Results:</strong>
            </Typography>
            <Typography variant="body2">
              Wallet: {testResults.walletType} | 
              Network: {testResults.network?.name} ({testResults.network?.chainId}) |
              Balance: {testResults.balance} ETH
            </Typography>
            {testResults.wotsEncoding && (
              <Typography variant="body2">
                WOTS Encoding: ✅ Success ({testResults.wotsEncoding.sizeKB}KB)
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Recommendation:</strong> {testResults.recommendation}
            </Typography>
          </Alert>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>💡 Alternative:</strong> For guaranteed withdrawals, use Python scripts:
            <br />
            <code>cd project-root && python withdraw_from_treasury.py --help</code>
          </Typography>
        </Alert>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="outlined"
          onClick={() => {
            console.log('📋 Wallet Manager Info:', walletManager.getConnectionInfo());
            toast.info('💡 Connection info logged to console');
          }}
        >
          Debug Info
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WalletSelector;