// Helper for uploading keys in single node mode

export const processUploadedKeys = (keysData) => {
  // Check if this is single node format (has 'keys' array instead of 'keyshares')
  if (keysData.isSingleNode && keysData.keys) {
    // Convert from single node format to the format expected by the app
    const processedData = {
      depositId: keysData.depositId,
      requestId: keysData.requestId,
      isSingleNode: true,
      isSingleKey: keysData.isSingleKey,
      keyIndex: keysData.keyIndex,
      availableKeys: keysData.keys.map(key => ({
        keyIndex: key.keyIndex,
        private_key: key.private_key,
        ethereum_address: key.ethereum_address,
        solana_address: key.solana_address,  // Include Solana address
        denomination: key.denomination,
        denomination_wei: key.denomination_wei,
        merkleRoot: key.merkleRoot,
        merkleRootId: key.merkle_root_id || key.merkleRootId,  // Include merkle root ID
        merkleProof: key.merkleProof,
        treeIndex: key.treeIndex,
        batchId: key.batchId,
        userAddress: key.userAddress,
        isUsed: key.isUsed || false,
        // Chain and token information
        chain_name: key.chain_name || key.chainName || 'localhost',
        chain_id: key.chain_id || key.chainId || 31337,
        token_symbol: key.token_symbol || key.tokenSymbol || 'ETH',
        token_address: key.token_address || key.tokenAddress || '0x0000000000000000000000000000000000000000',
        treasury_address: key.treasury_address || key.treasuryAddress
      }))
    };

    return processedData;
  }

  // Legacy format with keyshares (multi-node)
  return keysData;
};