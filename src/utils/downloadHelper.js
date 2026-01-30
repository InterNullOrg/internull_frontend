// Helper for downloading keys in single node mode

export const prepareKeysForDownload = (availableKeys, withdrawDeposit, downloadKeyIndex = null) => {
  let keysData;
  let filename;

  // Single node mode - we have complete keys, not keyshares
  const isSingleNode = !withdrawDeposit?.keyshares;

  if (downloadKeyIndex !== null) {
    // Download individual key
    const selectedKey = availableKeys.find(key => key.keyIndex === downloadKeyIndex);
    if (!selectedKey) {
      throw new Error('Selected key not found');
    }

    // Package single key
    keysData = {
      depositId: withdrawDeposit?.txHash || 'single_node_withdrawal',
      requestId: withdrawDeposit?.requestId || null,
      keys: [{
        keyIndex: selectedKey.keyIndex,
        private_key: selectedKey.private_key,
        ethereum_address: selectedKey.ethereum_address,
        solana_address: selectedKey.solana_address,  // Include Solana address
        denomination: selectedKey.denomination,
        denomination_wei: selectedKey.denomination_wei,
        merkleRoot: selectedKey.merkleRoot || selectedKey.merkle_root,
        merkle_root_id: selectedKey.merkle_root_id || selectedKey.merkleRootId,
        merkleProof: selectedKey.merkleProof || selectedKey.merkle_proof,
        treeIndex: selectedKey.treeIndex || selectedKey.tree_index,
        batchId: selectedKey.batchId || selectedKey.merkle_root_id,
        userAddress: selectedKey.userAddress,
        chain_name: selectedKey.chain_name || 'localhost',  // Include chain name
        chain_id: selectedKey.chain_id || 31337,  // Include chain ID
        treasury_address: selectedKey.treasury_address || process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS,  // Include treasury address
        token_symbol: selectedKey.token_symbol || 'ETH',  // Include token symbol
        token_address: selectedKey.token_address || '0x0000000000000000000000000000000000000000',  // Include token address
        isUsed: selectedKey.isUsed || false
      }],
      isSingleKey: true,
      isSingleNode,
      timestamp: new Date().toISOString()
    };

    filename = `treasury-key-${withdrawDeposit?.txHash || 'single'}-index${downloadKeyIndex}-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.enc`;
  } else {
    // Download all keys
    keysData = {
      depositId: withdrawDeposit?.txHash || 'single_node_withdrawal',
      requestId: withdrawDeposit?.requestId || null,
      keys: availableKeys.map(key => ({
        keyIndex: key.keyIndex,
        private_key: key.private_key,
        ethereum_address: key.ethereum_address,
        solana_address: key.solana_address,  // Include Solana address
        denomination: key.denomination,
        denomination_wei: key.denomination_wei,
        merkleRoot: key.merkleRoot || key.merkle_root,
        merkle_root_id: key.merkle_root_id || key.merkleRootId,
        merkleProof: key.merkleProof || key.merkle_proof,
        treeIndex: key.treeIndex || key.tree_index,
        batchId: key.batchId || key.merkle_root_id,
        userAddress: key.userAddress,
        chain_name: key.chain_name || 'localhost',  // Include chain name
        chain_id: key.chain_id || 31337,  // Include chain ID
        treasury_address: key.treasury_address || process.env.REACT_APP_TREASURY_CONTRACT_ADDRESS,  // Include treasury address
        token_symbol: key.token_symbol || 'ETH',  // Include token symbol
        token_address: key.token_address || '0x0000000000000000000000000000000000000000',  // Include token address
        isUsed: key.isUsed || false
      })),
      isSingleKey: false,
      isSingleNode,
      timestamp: new Date().toISOString()
    };

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    filename = `treasury-keys-${withdrawDeposit?.txHash || 'single'}-${timestamp}.enc`;
  }

  return { keysData, filename };
};