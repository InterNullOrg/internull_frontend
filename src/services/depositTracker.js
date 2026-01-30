// Deposit tracking service
import { ethers } from 'ethers';

const STORAGE_KEY = 'treasury_deposits';

export class DepositTracker {
  constructor() {
    this.deposits = this.loadDeposits();
  }

  loadDeposits() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading deposits:', error);
      return [];
    }
  }

  saveDeposits() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.deposits));
    } catch (error) {
      console.error('Error saving deposits:', error);
    }
  }

  addDeposit(txHash, amount, userAddress, chainId, metadata = {}) {
    const deposit = {
      id: `${txHash}-${Date.now()}`,
      txHash,
      amount: parseFloat(amount),
      userAddress: userAddress.toLowerCase(),
      chainId,
      timestamp: Date.now(),
      status: 'pending', // pending, confirmed, keys_requested, keys_received, withdrawn
      blockNumber: null,
      keyRequestId: null,
      keyShares: null,
      metadata: metadata // Store token, tokenAddress, crossChain, targetChain, etc.
    };

    this.deposits.unshift(deposit); // Add to beginning
    this.saveDeposits();
    return deposit;
  }

  updateDepositStatus(txHash, status, additionalData = {}) {
    const deposit = this.deposits.find(d => d.txHash === txHash);
    if (deposit) {
      deposit.status = status;
      Object.assign(deposit, additionalData);
      this.saveDeposits();
    }
    return deposit;
  }

  getUserDeposits(userAddress) {
    return this.deposits.filter(d => 
      d.userAddress === userAddress.toLowerCase()
    ).sort((a, b) => b.timestamp - a.timestamp);
  }

  getDepositByTxHash(txHash) {
    return this.deposits.find(d => d.txHash === txHash);
  }

  // Check deposit confirmation on blockchain
  async checkDepositConfirmation(provider, txHash) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt && receipt.status === 1) {
        this.updateDepositStatus(txHash, 'confirmed', {
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking deposit confirmation:', error);
      return false;
    }
  }

  // Check Solana deposit confirmation on blockchain
  async checkSolanaDepositConfirmation(connection, txHash) {
    try {
      const transaction = await connection.getTransaction(txHash, {
        maxSupportedTransactionVersion: 0
      });

      if (transaction && transaction.meta && transaction.meta.err === null) {
        this.updateDepositStatus(txHash, 'confirmed', {
          blockNumber: transaction.slot,
          blockTime: transaction.blockTime
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking Solana deposit confirmation:', error);
      return false;
    }
  }

  // This method is now handled by the DKG service directly
  // Keeping for backward compatibility but deprecated
  async requestKeysFromDKG(txHash, userAddress, amount, requestedDenominations = null) {
    throw new Error('This method is deprecated. Use DKGService.completeWithdrawal() instead.');
  }

  // Get deposits that need key requests
  getDepositsNeedingKeys(userAddress) {
    return this.getUserDeposits(userAddress).filter(d => 
      d.status === 'confirmed' || d.status === 'keys_requested'
    );
  }

  // Clear all deposits (for testing)
  clearDeposits() {
    this.deposits = [];
    this.saveDeposits();
  }
}

export default new DepositTracker();