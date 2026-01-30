import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
  Security,
  Code,
  Architecture,
  Speed,
  Lock,
  SwapHoriz,
  Shield,
  CheckCircle,
  GitHub,
  Article,
} from '@mui/icons-material';
import Header from '../components/Header';

const Docs = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('introduction');
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    technical: true,
    implementation: true,
    advanced: true,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const drawerWidth = 280;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSectionClick = (section) => {
    setActiveSection(section);
    if (isMobile) {
      setMobileOpen(false);
    }
    // Scroll to section
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleExpanded = (category) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const menuStructure = {
    overview: {
      title: 'Overview',
      icon: <Article />,
      items: [
        { id: 'introduction', label: 'Introduction' },
        { id: 'problem', label: 'Problem Statement' },
        { id: 'solution', label: 'Our Solution' },
        { id: 'features', label: 'Key Features' },
      ]
    },
    technical: {
      title: 'Technical Architecture',
      icon: <Architecture />,
      items: [
        { id: 'protocol', label: 'Protocol Overview' },
        { id: 'ecdsa-ots', label: 'ECDSA One-Time Signatures' },
        { id: 'merkle', label: 'Merkle Tree Verification' },
        { id: 'threshold', label: 'Threshold Signatures' },
        { id: 'crosschain', label: 'Cross-Chain Mechanism' },
        { id: 'solana', label: 'Solana Integration' },
      ]
    },
    implementation: {
      title: 'Implementation',
      icon: <Code />,
      items: [
        { id: 'contracts', label: 'Smart Contracts' },
        { id: 'deposit', label: 'Deposit Flow' },
        { id: 'withdrawal', label: 'Withdrawal Flow' },
        { id: 'security', label: 'Security Model' },
      ]
    },
    advanced: {
      title: 'Advanced Topics',
      icon: <Security />,
      items: [
        { id: 'usecases', label: 'Use Cases' },
        { id: 'references', label: 'References' },
      ]
    },
  };

  const drawer = (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
          Documentation
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <List>
        {Object.entries(menuStructure).map(([category, section]) => (
          <Box key={category}>
            <ListItemButton
              onClick={() => toggleExpanded(category)}
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.1)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Box sx={{ mr: 1, color: '#667eea' }}>{section.icon}</Box>
                <ListItemText primary={section.title} sx={{ '& .MuiListItemText-primary': { color: 'rgba(255, 255, 255, 0.9)' } }} />
                {expandedSections[category] ? <ExpandLess /> : <ExpandMore />}
              </Box>
            </ListItemButton>
            <Collapse in={expandedSections[category]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {section.items.map((item) => (
                  <ListItemButton
                    key={item.id}
                    onClick={() => handleSectionClick(item.id)}
                    selected={activeSection === item.id}
                    sx={{
                      pl: 6,
                      borderLeft: activeSection === item.id ? '3px solid #667eea' : 'none',
                      bgcolor: activeSection === item.id ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                      color: activeSection === item.id ? '#667eea' : 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                      },
                    }}
                  >
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </Box>
        ))}
      </List>
      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <Box sx={{ px: 2 }}>
        <ListItemButton
          onClick={() => window.open('https://github.com/internull/protocol', '_blank')}
          sx={{
            borderRadius: 2,
            bgcolor: 'rgba(102, 126, 234, 0.1)',
            '&:hover': {
              bgcolor: 'rgba(102, 126, 234, 0.2)',
            },
          }}
        >
          <GitHub sx={{ mr: 1 }} />
          <ListItemText primary="View on GitHub" />
        </ListItemButton>
      </Box>
    </Box>
  );

  const content = {
    introduction: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Introduction
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          InterNull is a privacy-preserving protocol that enables untraceable transactions across multiple blockchain networks.
          By leveraging ECDSA one-time signatures and advanced cryptographic techniques, InterNull provides transaction
          privacy while maintaining the security and decentralization properties of blockchain technology.
        </Typography>

        <Alert severity="info" sx={{ my: 3, bgcolor: 'rgba(102, 126, 234, 0.1)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2">
            InterNull is not just a bridge - it's a comprehensive privacy layer that works for same-chain privacy,
            cross-chain transfers, and multi-chain split withdrawals.
          </Typography>
        </Alert>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Core Technology
        </Typography>
        <Typography variant="body1" paragraph>
          At its heart, InterNull uses ECDSA one-time signatures (OTS) to break the link between deposits and withdrawals.
          This approach provides:
        </Typography>
        <List>
          {[
            'Complete unlinkability between sender and receiver',
            'Time-independent withdrawals (keys never expire)',
            'No need for atomic swaps or complex coordination',
            'Support for multiple tokens and chains',
            'Threshold signature schemes for enhanced security'
          ].map((item, idx) => (
            <ListItem key={idx}>
              <CheckCircle sx={{ mr: 2, color: '#4ade80' }} fontSize="small" />
              <ListItemText primary={item} />
            </ListItem>
          ))}
        </List>
      </Box>
    ),

    problem: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Problem Statement
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          Blockchain technology, despite its transparency and immutability properties, presents significant privacy challenges:
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#ef4444' }}>
            Current Challenges
          </Typography>
          <List>
            <ListItem>
              <Typography variant="body1">
                <strong>Public Ledger:</strong> All transactions are permanently visible to anyone
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body1">
                <strong>Address Clustering:</strong> Advanced analysis can link multiple addresses to the same entity
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body1">
                <strong>Cross-Chain Tracking:</strong> Bridge transactions create clear links between chains
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body1">
                <strong>Metadata Leakage:</strong> Transaction patterns reveal user behavior and relationships
              </Typography>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Why Existing Solutions Fall Short
        </Typography>

        <TableContainer component={Paper} sx={{ my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Solution</strong></TableCell>
                <TableCell><strong>Limitation</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Centralized Privacy Services</TableCell>
                <TableCell>Often centralized, require trust, vulnerable to analysis</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>ZK-SNARKs</TableCell>
                <TableCell>Complex trusted setup, high computational overhead</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Ring Signatures</TableCell>
                <TableCell>Limited anonymity set, chain-specific implementations</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Standard Bridges</TableCell>
                <TableCell>No privacy features, create clear transaction links</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    ),

    solution: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Our Solution
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          InterNull implements a cryptographic approach to blockchain privacy using ECDSA one-time signatures combined with
          Merkle tree verification and threshold cryptography.
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.3)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#667eea' }}>
            Three-Phase Protocol
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              1. Deposit Phase
            </Typography>
            <Typography variant="body2" paragraph>
              Users deposit tokens to the InterNull smart contract on any supported chain. The deposit is recorded
              but not linked to future withdrawals.
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              2. Key Distribution Phase
            </Typography>
            <Typography variant="body2" paragraph>
              Users receive one-time signature keys from the distributed backend nodes. These keys are pre-generated
              and their Merkle roots are already stored on-chain. The keys can be used immediately or saved for later use.
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              3. Withdrawal Phase
            </Typography>
            <Typography variant="body2" paragraph>
              Users can withdraw funds using their OTS keys on any supported chain. The withdrawal transaction has no
              link to the original deposit, ensuring complete privacy.
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Key Innovations
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
          {[
            { label: 'Time Independence', desc: 'Keys maintain validity indefinitely' },
            { label: 'Multi-Chain Support', desc: 'Compatible with EVM and Solana architectures' },
            { label: 'Asynchronous Operation', desc: 'No atomic swap or relayer dependencies' },
            { label: 'Threshold Security', desc: '3-of-5 multisignature requirement' },
            { label: 'Flexible Denominations', desc: 'Configurable withdrawal amounts across chains' },
            { label: 'Optimized Execution', desc: 'Gas-efficient cryptographic verification' },
          ].map((item, idx) => (
            <Paper key={idx} sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 250 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#667eea' }}>
                {item.label}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {item.desc}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    ),

    features: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Key Features
        </Typography>

        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Lock sx={{ mr: 2, color: '#667eea' }} />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Complete Privacy
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              Our ECDSA one-time signatures ensure that withdrawal transactions cannot be linked to deposits.
              Each key can only be used once, and the signature reveals nothing about the depositor's identity.
            </Typography>
            <Chip label="No KYC Required" sx={{ mr: 1 }} />
            <Chip label="No IP Tracking" sx={{ mr: 1 }} />
            <Chip label="No Cookies" />
          </Paper>

          <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SwapHoriz sx={{ mr: 2, color: '#667eea' }} />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Cross-Chain Flexibility
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              Deposit on one chain and withdraw on another - or split your withdrawal across multiple chains.
              Our protocol handles all the complexity while maintaining privacy.
            </Typography>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
              Supported Networks:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['Ethereum', 'Solana', 'BNB Chain', 'Polygon', 'Optimism', 'Base'].map(chain => (
                <Chip key={chain} label={chain} variant="outlined" />
              ))}
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Speed sx={{ mr: 2, color: '#667eea' }} />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Instant Availability
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              No waiting periods or time locks. Once you receive your OTS keys, you can use them immediately
              or save them for later. Keys never expire, giving you complete control over timing.
            </Typography>
            <Alert severity="success" sx={{ mt: 2 }}>
              Average key generation time: &lt; 2 seconds
            </Alert>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Security sx={{ mr: 2, color: '#667eea' }} />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Decentralized Security
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              Our threshold signature scheme (3-of-5) ensures that no single node can compromise the system.
              Keys are generated and distributed securely across multiple nodes.
            </Typography>
            <List>
              <ListItem>
                <CheckCircle sx={{ mr: 2, color: '#4ade80' }} fontSize="small" />
                <ListItemText primary="Distributed key generation" />
              </ListItem>
              <ListItem>
                <CheckCircle sx={{ mr: 2, color: '#4ade80' }} fontSize="small" />
                <ListItemText primary="No single point of failure" />
              </ListItem>
              <ListItem>
                <CheckCircle sx={{ mr: 2, color: '#4ade80' }} fontSize="small" />
                <ListItemText primary="Byzantine fault tolerant" />
              </ListItem>
            </List>
          </Paper>
        </Box>
      </Box>
    ),

    protocol: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Protocol Overview
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          The InterNull protocol consists of three main components working together to provide privacy-preserving
          transactions across multiple blockchain networks.
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(102, 126, 234, 0.05)' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            System Architecture
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              1. Smart Contracts
            </Typography>
            <Typography variant="body2" paragraph>
              Deployed on each supported chain, these contracts handle deposits, verify Merkle proofs,
              and process withdrawals using ECDSA signature verification.
            </Typography>
            <Box sx={{ pl: 2, borderLeft: '3px solid #667eea', ml: 2, mb: 3 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(13, 17, 40, 0.8)', p: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                contract MultiTokenTreasury {'{'}
                <br />  mapping(bytes32 =&gt; bool) usedMerkleRoots;
                <br />  mapping(address =&gt; uint256) balances;
                <br />  function withdraw(MerkleProof, Signature) external;
                <br />{'}'}
              </Typography>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              2. Backend Nodes
            </Typography>
            <Typography variant="body2" paragraph>
              A network of distributed nodes that generate OTS keys, manage Merkle trees,
              and coordinate cross-chain operations using threshold signatures.
            </Typography>

            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              3. Client Interface
            </Typography>
            <Typography variant="body2" paragraph>
              User-facing application that handles wallet connections, key management,
              and transaction submission across different chains.
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Protocol Flow
        </Typography>

        <TableContainer component={Paper} sx={{ my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Step</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
                <TableCell><strong>Privacy Guarantee</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>1</TableCell>
                <TableCell>User deposits tokens to contract</TableCell>
                <TableCell>Public transaction, but not linked to withdrawal</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2</TableCell>
                <TableCell>Backend verifies deposit and issues OTS keys</TableCell>
                <TableCell>Keys are anonymous and unlinkable</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>3</TableCell>
                <TableCell>User stores keys securely</TableCell>
                <TableCell>Local storage only, no tracking</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>4</TableCell>
                <TableCell>User initiates withdrawal with OTS</TableCell>
                <TableCell>New address, no link to deposit</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>5</TableCell>
                <TableCell>Contract verifies and transfers funds</TableCell>
                <TableCell>Complete unlinkability achieved</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    ),

    'ecdsa-ots': (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          ECDSA One-Time Signatures
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          ECDSA (Elliptic Curve Digital Signature Algorithm) one-time signatures are the cryptographic foundation
          of InterNull's privacy mechanism. Each signature can only be used once, preventing any correlation
          between multiple transactions.
        </Typography>

        <Alert severity="info" sx={{ my: 3, bgcolor: 'rgba(102, 126, 234, 0.1)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2">
            Unlike traditional addresses that are reused, OTS keys are consumed after a single use,
            making transaction graph analysis impossible.
          </Typography>
        </Alert>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Mathematical Foundation
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Key Generation
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
            1. Generate random private key: k ∈ [1, n-1]
            <br />2. Compute public key: P = k·G
            <br />3. Create key commitment: H(P || amount || chain)
            <br />4. Add to Merkle tree with index i
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Signature Creation
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
            1. Message hash: h = H(withdraw_address || amount || nonce)
            <br />2. Generate random nonce: r ∈ [1, n-1]
            <br />3. Compute: R = r·G = (x_r, y_r)
            <br />4. Signature: s = r⁻¹(h + k·x_r) mod n
            <br />5. Output: (R, s)
          </Typography>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Security Properties
        </Typography>

        <List>
          <ListItem>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Perfect Forward Secrecy
              </Typography>
              <Typography variant="body2">
                Even if a private key is compromised after use, previous transactions remain secure
              </Typography>
            </Box>
          </ListItem>
          <ListItem>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Quantum Resistance (Partial)
              </Typography>
              <Typography variant="body2">
                Single-use nature provides some protection against future quantum attacks
              </Typography>
            </Box>
          </ListItem>
          <ListItem>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Non-Interactive
              </Typography>
              <Typography variant="body2">
                No communication needed between depositor and withdrawer
              </Typography>
            </Box>
          </ListItem>
        </List>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Implementation Details
        </Typography>

        <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 3, borderRadius: 2, my: 3 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {`// Solidity implementation
function verifyOTSSignature(
    bytes32 messageHash,
    bytes memory signature,
    address expectedSigner
) internal pure returns (bool) {
    bytes32 r;
    bytes32 s;
    uint8 v;

    assembly {
        r := mload(add(signature, 0x20))
        s := mload(add(signature, 0x40))
        v := byte(0, mload(add(signature, 0x60)))
    }

    address signer = ecrecover(messageHash, v, r, s);
    return signer == expectedSigner;
}`}
          </Typography>
        </Box>
      </Box>
    ),

    merkle: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Merkle Tree Verification
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          Merkle trees provide an efficient way to verify that a specific OTS key belongs to a pre-approved set
          without revealing all keys in the set. This is crucial for maintaining privacy while ensuring only
          valid keys can withdraw funds.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Tree Construction
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2" paragraph>
            The backend nodes construct Merkle trees from batches of OTS public keys:
          </Typography>
          <List>
            <ListItem>1. Generate batch of 2^n OTS key pairs</ListItem>
            <ListItem>2. Hash each public key: leaf = H(pubKey || amount || chainId)</ListItem>
            <ListItem>3. Build tree bottom-up: parent = H(left || right)</ListItem>
            <ListItem>4. Store root on-chain via admin multisig</ListItem>
            <ListItem>5. Distribute keys to users with their Merkle proofs</ListItem>
          </List>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Proof Generation
        </Typography>

        <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 3, borderRadius: 2, my: 3 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {`function generateMerkleProof(
    tree: MerkleTree,
    leafIndex: number
): MerkleProof {
    const proof = [];
    let currentIndex = leafIndex;

    for (let i = 0; i < tree.depth; i++) {
        const siblingIndex = currentIndex ^ 1;
        proof.push({
            hash: tree.nodes[i][siblingIndex],
            isLeft: currentIndex % 2 === 1
        });
        currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
}`}
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          On-Chain Verification
        </Typography>

        <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 3, borderRadius: 2, my: 3 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {`function verifyMerkleProof(
    bytes32 leaf,
    bytes32[] memory proof,
    bytes32 root
) public pure returns (bool) {
    bytes32 computedHash = leaf;

    for (uint256 i = 0; i < proof.length; i++) {
        bytes32 proofElement = proof[i];
        if (computedHash <= proofElement) {
            computedHash = keccak256(
                abi.encodePacked(computedHash, proofElement)
            );
        } else {
            computedHash = keccak256(
                abi.encodePacked(proofElement, computedHash)
            );
        }
    }

    return computedHash == root;
}`}
          </Typography>
        </Box>

        <Alert severity="success" sx={{ my: 3, bgcolor: 'rgba(74, 222, 128, 0.1)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2">
            <strong>Gas Efficiency:</strong> Verification requires only O(log n) hashes, making it efficient
            even for trees with millions of leaves.
          </Typography>
        </Alert>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Privacy Properties
        </Typography>

        <TableContainer component={Paper} sx={{ my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Property</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Hiding</TableCell>
                <TableCell>Proof reveals nothing about other keys in the tree</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Binding</TableCell>
                <TableCell>Cannot create valid proof for keys not in tree</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Succinctness</TableCell>
                <TableCell>Proof size is logarithmic in tree size</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Non-Interactive</TableCell>
                <TableCell>No communication needed during verification</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    ),

    threshold: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Threshold Signatures
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          InterNull uses a 3-of-5 threshold signature scheme to ensure no single node can compromise the system.
          This distributed approach provides resilience against node failures and malicious actors.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Distributed Key Generation (DKG)
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(102, 126, 234, 0.05)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Setup Phase
          </Typography>
          <List>
            <ListItem>
              <Typography variant="body2">
                <strong>Step 1:</strong> Each of the 5 nodes generates a random polynomial of degree 2
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>Step 2:</strong> Nodes exchange polynomial evaluations via secure channels
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>Step 3:</strong> Each node computes its share of the master private key
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>Step 4:</strong> Group public key is computed without revealing master private key
              </Typography>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Signature Generation
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, my: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 2, flex: '1 1 300px' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              1. Request Phase
            </Typography>
            <Typography variant="body2">
              Client requests signature from at least 3 nodes for Merkle root submission
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: '1 1 300px' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              2. Partial Signatures
            </Typography>
            <Typography variant="body2">
              Each participating node creates a partial signature using its key share
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: '1 1 300px' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              3. Combination
            </Typography>
            <Typography variant="body2">
              Client combines partial signatures using Lagrange interpolation
            </Typography>
          </Paper>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Security Analysis
        </Typography>

        <TableContainer component={Paper} sx={{ my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Threat Model</strong></TableCell>
                <TableCell><strong>Protection</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Up to 2 malicious nodes</TableCell>
                <TableCell>System remains secure, requires 3 honest nodes</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Node failure/offline</TableCell>
                <TableCell>Can tolerate 2 nodes being offline</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Key compromise</TableCell>
                <TableCell>Individual shares reveal nothing about master key</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Collusion attack</TableCell>
                <TableCell>Need 3+ nodes to collude to compromise</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="warning" sx={{ my: 3, bgcolor: 'rgba(245, 158, 11, 0.1)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2">
            <strong>Important:</strong> Node operators are carefully vetted and use hardware security modules (HSMs)
            to protect key shares. Geographic distribution ensures resilience against regional failures.
          </Typography>
        </Alert>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Implementation
        </Typography>

        <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 3, borderRadius: 2, my: 3 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {`// Node generates partial signature
async function createPartialSignature(
    message: string,
    keyShare: KeyShare,
    nodeId: number
): Promise<PartialSig> {
    const messageHash = keccak256(message);
    const k_i = generateNonce(nodeId);
    const r_i = ecMultiply(G, k_i);
    const s_i = k_i^(-1) * (messageHash + keyShare * r_i.x);

    return {
        nodeId,
        r_i,
        s_i,
        proof: generateZKProof(s_i, keyShare)
    };
}`}
          </Typography>
        </Box>
      </Box>
    ),

    crosschain: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Cross-Chain Mechanism
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          InterNull's cross-chain functionality allows users to deposit on one blockchain and withdraw on another,
          all while maintaining complete privacy. Unlike traditional bridges, our approach doesn't require atomic
          swaps or complex coordination protocols.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Architecture Overview
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Multi-Chain Deployment
          </Typography>
          <Typography variant="body2" paragraph>
            InterNull contracts are deployed independently on each supported chain:
          </Typography>
          <List>
            <ListItem>• Ethereum Mainnet - Base contract with ETH, USDC, USDT, DAI</ListItem>
            <ListItem>• Solana - Anchor-based program supporting SOL, USDC, USDT</ListItem>
            <ListItem>• BNB Chain - Supporting BNB, USDC, USDT, BUSD</ListItem>
            <ListItem>• Polygon - Supporting MATIC, USDC, USDT, DAI</ListItem>
            <ListItem>• Optimism - Supporting ETH, USDC, DAI</ListItem>
            <ListItem>• Base - Supporting ETH, USDC</ListItem>
          </List>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Cross-Chain Flow
        </Typography>

        <Box sx={{ my: 3 }}>
          <Paper sx={{ p: 3, mb: 2, borderLeft: '4px solid #667eea' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              1. Unified Balance Pool
            </Typography>
            <Typography variant="body2">
              All deposits across chains contribute to a unified virtual balance pool managed by backend nodes.
              Users' deposited amounts are tracked globally, not per-chain.
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mb: 2, borderLeft: '4px solid #4ade80' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              2. Chain-Agnostic Keys
            </Typography>
            <Typography variant="body2">
              OTS keys are generated without chain-specific constraints. Users can specify target chains
              during withdrawal, not during key generation.
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mb: 2, borderLeft: '4px solid #f59e0b' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              3. Liquidity Management
            </Typography>
            <Typography variant="body2">
              Backend nodes monitor and rebalance liquidity across chains using threshold-controlled
              treasury wallets, ensuring sufficient funds for withdrawals.
            </Typography>
          </Paper>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Privacy Preservation
        </Typography>

        <Alert severity="success" sx={{ my: 3, bgcolor: 'rgba(74, 222, 128, 0.1)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2">
            Cross-chain transfers through InterNull leave no on-chain trace connecting the source and
            destination transactions. This is superior to traditional bridges which create clear links.
          </Typography>
        </Alert>

        <TableContainer component={Paper} sx={{ my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Traditional Bridge</strong></TableCell>
                <TableCell><strong>InterNull</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Lock on Chain A → Mint on Chain B</TableCell>
                <TableCell>Deposit anywhere → Withdraw anywhere</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Clear on-chain correlation</TableCell>
                <TableCell>No traceable connection</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Same address on both chains</TableCell>
                <TableCell>Different addresses possible</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Immediate execution required</TableCell>
                <TableCell>Time-independent withdrawal</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Multi-Chain Split Example
        </Typography>

        <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 3, borderRadius: 2, my: 3 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {`// User deposits 1000 USDC on Ethereum
deposit(ethereum, USDC, 1000);

// User receives 10 keys of 100 USDC each
keys = requestKeys(10, 100);

// User can withdraw:
// - 300 USDC on Polygon (using 3 keys)
// - 400 USDC on BNB Chain (using 4 keys)
// - 300 USDC on Base (using 3 keys)

// Each withdrawal is unlinkable to the original deposit
// and to each other`}
          </Typography>
        </Box>
      </Box>
    ),

    solana: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Solana Integration
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          InterNull extends its privacy-preserving capabilities to the Solana blockchain through an Anchor-based program
          that maintains feature parity with EVM implementations while leveraging Solana's high-performance architecture.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Architecture Differences
        </Typography>

        <TableContainer component={Paper} sx={{ my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Aspect</strong></TableCell>
                <TableCell><strong>EVM Chains</strong></TableCell>
                <TableCell><strong>Solana</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Account Model</TableCell>
                <TableCell>Account-based state</TableCell>
                <TableCell>Account ownership model with PDAs</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Smart Contract</TableCell>
                <TableCell>Solidity contracts</TableCell>
                <TableCell>Rust-based Anchor programs</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Signature Scheme</TableCell>
                <TableCell>secp256k1 (ECDSA)</TableCell>
                <TableCell>Ed25519 for Solana native, secp256k1 via instruction</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Transaction Model</TableCell>
                <TableCell>Sequential execution</TableCell>
                <TableCell>Parallel execution with account locking</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cost Model</TableCell>
                <TableCell>Gas-based pricing</TableCell>
                <TableCell>Compute units with deterministic costs</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Solana Program Structure
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Core Components
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              1. Treasury State Account
            </Typography>
            <Typography variant="body2" paragraph>
              Program Derived Address (PDA) storing global state including admin authority, pause status,
              and aggregate deposit/withdrawal statistics. Derived using seed "treasury" for deterministic addressing.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              2. Merkle Root Accounts
            </Typography>
            <Typography variant="body2" paragraph>
              Individual PDAs for each Merkle root, indexed sequentially. Each account stores the 32-byte root hash,
              denomination, total key count, and activation status. Derived using seed "merkroot" + root_id.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              3. Nullifier Accounts
            </Typography>
            <Typography variant="body2" paragraph>
              Prevent double-spending by tracking used OTS keys. Each nullifier account is derived from the
              Merkle root ID and key index, creating a unique PDA that marks a key as consumed.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              4. Token Accounts
            </Typography>
            <Typography variant="body2">
              Associated Token Accounts (ATAs) for SPL token support (USDC, USDT). Native SOL uses
              system account transfers, while SPL tokens utilize the Token Program.
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Cryptographic Implementation
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba (102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            secp256k1 Verification on Solana
          </Typography>
          <Typography variant="body2" paragraph>
            Solana natively supports Ed25519 signatures but not secp256k1 (ECDSA). InterNull implements cross-chain
            compatibility through Solana's secp256k1 instruction intrinsic, enabling EVM-compatible signature verification.
          </Typography>
          <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1, mt: 2 }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
              {`// Rust implementation using secp256k1 instruction
use solana_program::secp256k1_recover::secp256k1_recover;

pub fn verify_ecdsa_signature(
    message_hash: &[u8; 32],
    signature: &[u8; 64],
    recovery_id: u8,
    expected_pubkey: &[u8; 64],
) -> Result<()> {
    let recovered = secp256k1_recover(
        message_hash,
        recovery_id,
        signature
    )?;

    require!(
        recovered.0 == *expected_pubkey,
        InternullError::InvalidSignature
    );
    Ok(())
}`}
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Transaction Flow
        </Typography>

        <Box sx={{ my: 3 }}>
          <Paper sx={{ p: 3, mb: 2, borderLeft: '4px solid #667eea' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Deposit Transaction
            </Typography>
            <Typography variant="body2">
              Users transfer SOL or SPL tokens to the treasury state PDA. The program validates the deposit,
              updates the treasury balance, and emits an event for backend nodes to process. Transaction requires
              ~5,000 compute units for native SOL, ~15,000 for SPL tokens.
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mb: 2, borderLeft: '4px solid #4ade80' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Withdrawal Transaction
            </Typography>
            <Typography variant="body2">
              User submits OTS signature, Merkle proof, and recipient address. Program verifies: (1) Merkle proof against
              stored root, (2) ECDSA signature validity, (3) nullifier uniqueness. Upon success, transfers funds and
              creates nullifier account. Requires ~40,000-60,000 compute units depending on Merkle tree depth.
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, borderLeft: '4px solid #f59e0b' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Merkle Root Submission
            </Typography>
            <Typography variant="body2">
              Admin multisig submits new Merkle roots via threshold signature verification. Each root submission
              creates a new PDA with sequential ID, enabling efficient indexing and verification. Supports batch
              submissions for gas optimization.
            </Typography>
          </Paper>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Performance Characteristics
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(102, 126, 234, 0.05)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Advantages
          </Typography>
          <List>
            <ListItem>
              <Typography variant="body2">
                <strong>High Throughput:</strong> Solana's 400ms block time enables near-instant finality for deposits
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>Low Costs:</strong> Average transaction costs of 0.000005 SOL (~$0.0001) for deposits
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>Deterministic Costs:</strong> Compute unit pricing prevents unexpected gas spikes
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>Parallel Execution:</strong> Independent withdrawals process simultaneously
              </Typography>
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Technical Constraints
          </Typography>
          <List>
            <ListItem>
              <Typography variant="body2">
                <strong>Account Size Limits:</strong> Individual accounts limited to 10MB, requiring pagination for large Merkle trees
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>Transaction Size:</strong> Maximum 1232 bytes per transaction constrains Merkle proof depth to ~10 levels
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>Compute Budget:</strong> 200,000 compute unit limit per transaction requires optimization for complex operations
              </Typography>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Cross-Chain Interoperability
        </Typography>

        <Typography variant="body1" paragraph>
          Solana integration maintains cryptographic consistency with EVM chains:
        </Typography>

        <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 3, borderRadius: 2, my: 3 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {`// Key generation on EVM chain
const privKey = generateECDSA PrivateKey();
const pubKey = secp256k1.getPublicKey(privKey);

// Same key can be used for Solana withdrawal
// Backend generates compatible Merkle root
const leaf = keccak256(pubKey, amount, chainId);
const merkleRoot = buildMerkleTree(leaves);

// Root submitted to both EVM and Solana contracts
await evmContract.addMerkleRoot(root);
await solanaProgram.addMerkleRoot(root);`}
          </Typography>
        </Box>

        <Alert severity="success" sx={{ my: 3, bgcolor: 'rgba(74, 222, 128, 0.1)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2">
            <strong>Result:</strong> Users can deposit on Ethereum and withdraw on Solana (or vice versa) using the same
            OTS keys, maintaining privacy guarantees across heterogeneous blockchain architectures.
          </Typography>
        </Alert>
      </Box>
    ),

    contracts: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Smart Contracts
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          InterNull's smart contracts are designed for maximum security, gas efficiency, and upgradeability.
          All contracts are audited and formally verified.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Contract Architecture
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            MultiTokenTreasury.sol
          </Typography>
          <Typography variant="body2" paragraph>
            Main contract handling deposits and withdrawals for multiple tokens:
          </Typography>
          <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre' }}>
              {`contract MultiTokenTreasury {
    mapping(address => mapping(address => uint256)) public balances;
    mapping(bytes32 => bool) public usedMerkleRoots;
    mapping(uint256 => bytes32) public merkleRoots;

    function depositETH() external payable;
    function depositToken(address token, uint256 amount) external;
    function withdraw(WithdrawData calldata data) external;
}`}
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            MerkleVerifier.sol (Library)
          </Typography>
          <Typography variant="body2" paragraph>
            Gas-optimized library for Merkle proof verification:
          </Typography>
          <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre' }}>
              {`library MerkleVerifier {
    function verify(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = hashPair(computedHash, proof[i]);
        }
        return computedHash == root;
    }
}`}
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Security Features
        </Typography>

        <List>
          <ListItem>
            <CheckCircle sx={{ mr: 2, color: '#4ade80' }} fontSize="small" />
            <ListItemText
              primary="Reentrancy Protection"
              secondary="All state changes before external calls"
            />
          </ListItem>
          <ListItem>
            <CheckCircle sx={{ mr: 2, color: '#4ade80' }} fontSize="small" />
            <ListItemText
              primary="Integer Overflow Protection"
              secondary="Using Solidity 0.8+ automatic checks"
            />
          </ListItem>
          <ListItem>
            <CheckCircle sx={{ mr: 2, color: '#4ade80' }} fontSize="small" />
            <ListItemText
              primary="Signature Replay Prevention"
              secondary="Nonces and used signature tracking"
            />
          </ListItem>
          <ListItem>
            <CheckCircle sx={{ mr: 2, color: '#4ade80' }} fontSize="small" />
            <ListItemText
              primary="Access Control"
              secondary="Role-based permissions for admin functions"
            />
          </ListItem>
        </List>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Gas Optimization
        </Typography>

        <TableContainer component={Paper} sx={{ my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Operation</strong></TableCell>
                <TableCell><strong>Gas Cost</strong></TableCell>
                <TableCell><strong>Optimization</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>ETH Deposit</TableCell>
                <TableCell>~45,000</TableCell>
                <TableCell>Direct transfer, minimal storage</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Token Deposit</TableCell>
                <TableCell>~65,000</TableCell>
                <TableCell>Single SSTORE operation</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Withdrawal</TableCell>
                <TableCell>~85,000</TableCell>
                <TableCell>Optimized Merkle verification</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Merkle Root Update</TableCell>
                <TableCell>~25,000</TableCell>
                <TableCell>Batch updates supported</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="info" sx={{ my: 3, bgcolor: 'rgba(102, 126, 234, 0.1)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2">
            All contracts are upgradeable using the UUPS pattern, allowing for bug fixes and feature
            additions without migrating user funds.
          </Typography>
        </Alert>
      </Box>
    ),

    deposit: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Deposit Flow
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          The deposit process is straightforward and maintains user privacy from the start.
          While the deposit transaction is public, it cannot be linked to future withdrawals.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Step-by-Step Process
        </Typography>

        <Box sx={{ my: 3 }}>
          <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid #667eea' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              1. Connect Wallet
            </Typography>
            <Typography variant="body2" paragraph>
              User connects their Web3 wallet (MetaMask, WalletConnect, etc.) to the InterNull interface.
            </Typography>
            <Alert severity="info">
              <Typography variant="body2">
                No KYC or account creation required - just a wallet connection.
              </Typography>
            </Alert>
          </Paper>

          <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid #4ade80' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              2. Select Token and Amount
            </Typography>
            <Typography variant="body2" paragraph>
              Choose from supported tokens and specify the deposit amount. Available tokens vary by chain.
            </Typography>
            <Box sx={{ bgcolor: 'rgba(13, 17, 40, 0.8)', p: 2, borderRadius: 1, mt: 2, border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                EVM chains: ETH, USDC, USDT, DAI (chain-dependent)
                <br />Solana: SOL, USDC, USDT
                <br />Minimum deposit: 0.01 native token or 10 stablecoin
                <br />Maximum deposit: No protocol limit
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid #f59e0b' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              3. Approve and Deposit
            </Typography>
            <Typography variant="body2" paragraph>
              For ERC-20 tokens, first approve the contract to spend tokens, then execute the deposit.
            </Typography>
            <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1, mt: 2 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
                {`// For ETH
await treasury.depositETH({ value: ethers.parseEther("1.0") });

// For ERC-20 tokens
await token.approve(treasuryAddress, amount);
await treasury.depositToken(tokenAddress, amount);`}
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, borderLeft: '4px solid #ec4899' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              4. Receive Deposit Receipt
            </Typography>
            <Typography variant="body2" paragraph>
              After confirmation, user receives a deposit ID and transaction hash. This receipt is used
              to request OTS keys from the backend.
            </Typography>
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Deposit is immediately credited to your virtual balance - no waiting period!
              </Typography>
            </Alert>
          </Paper>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Privacy Considerations
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(102, 126, 234, 0.05)' }}>
          <List>
            <ListItem>
              <Typography variant="body2">
                <strong>✓ Fresh Address:</strong> Consider using a new address for deposits to maximize privacy
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>✓ Amount Variance:</strong> Deposit uncommon amounts (e.g., 1.237 ETH instead of 1 ETH)
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>✓ Time Delay:</strong> Wait before requesting keys to break timing correlations
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>✓ Multiple Deposits:</strong> Split large amounts across multiple deposits
              </Typography>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Backend Verification
        </Typography>

        <Typography variant="body1" paragraph>
          Once deposited, the backend nodes verify the transaction:
        </Typography>

        <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 3, borderRadius: 2, my: 3 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {`async function verifyDeposit(txHash: string, chainId: number) {
    // 1. Fetch transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);

    // 2. Decode deposit event
    const event = treasury.interface.parseLog(receipt.logs[0]);

    // 3. Verify deposit hasn't been processed
    const processed = await db.isProcessed(txHash);
    if (processed) throw new Error("Already processed");

    // 4. Credit user's virtual balance
    await db.creditBalance(event.depositor, event.amount);

    // 5. Mark as processed
    await db.markProcessed(txHash);

    return { success: true, amount: event.amount };
}`}
          </Typography>
        </Box>
      </Box>
    ),

    withdrawal: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Withdrawal Flow
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          The withdrawal process implements InterNull's core privacy mechanism. Using OTS keys, users can
          withdraw funds to any address on any supported chain without revealing their identity.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Key Request Process
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Requesting OTS Keys
          </Typography>
          <Typography variant="body2" paragraph>
            After depositing, users request OTS keys from the backend nodes:
          </Typography>
          <List>
            <ListItem>1. Submit deposit receipt to backend API</ListItem>
            <ListItem>2. Specify desired key denominations (e.g., 10 keys of 0.1 ETH each)</ListItem>
            <ListItem>3. Backend verifies deposit and available balance</ListItem>
            <ListItem>4. Receive encrypted OTS keys with Merkle proofs</ListItem>
            <ListItem>5. Store keys securely (local storage or encrypted backup)</ListItem>
          </List>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Important:</strong> OTS keys are like cash - if lost, funds cannot be recovered.
              Always backup keys securely!
            </Typography>
          </Alert>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Withdrawal Execution
        </Typography>

        <Box sx={{ my: 3 }}>
          <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid #667eea' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              1. Select Withdrawal Chain
            </Typography>
            <Typography variant="body2">
              Choose any supported chain for withdrawal - doesn't need to match deposit chain.
              The protocol handles cross-chain liquidity automatically.
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid #4ade80' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              2. Specify Recipient Address
            </Typography>
            <Typography variant="body2">
              Enter the address where funds should be sent. This can be a completely new address
              with no prior transaction history.
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mb: 3, borderLeft: '4px solid #f59e0b' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              3. Select OTS Keys
            </Typography>
            <Typography variant="body2">
              Choose which keys to use for this withdrawal. You can use multiple keys in a single
              transaction or spread them across multiple withdrawals.
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, borderLeft: '4px solid #ec4899' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              4. Submit Transaction
            </Typography>
            <Typography variant="body2">
              Sign and submit the withdrawal transaction with OTS signature and Merkle proof.
            </Typography>
          </Paper>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          On-Chain Verification
        </Typography>

        <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 3, borderRadius: 2, my: 3 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {`function withdraw(
    uint256 amount,
    address recipient,
    bytes32[] memory merkleProof,
    uint256 merkleIndex,
    bytes memory signature
) external {
    // 1. Verify Merkle proof
    bytes32 leaf = keccak256(abi.encode(amount, merkleIndex));
    require(verifyProof(merkleProof, merkleRoots[merkleIndex], leaf));

    // 2. Verify OTS signature
    bytes32 message = keccak256(abi.encode(recipient, amount, nonce));
    address signer = ecrecover(message, signature);
    require(signer == expectedSigner);

    // 3. Mark key as used
    usedKeys[merkleIndex][leaf] = true;

    // 4. Transfer funds
    payable(recipient).transfer(amount);

    emit Withdrawal(recipient, amount, merkleIndex);
}`}
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Privacy Best Practices
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
          <Paper sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 250 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#667eea', mb: 1 }}>
              Time Delays
            </Typography>
            <Typography variant="body2">
              Wait random periods between deposit and withdrawal to prevent timing analysis
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 250 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#667eea', mb: 1 }}>
              Amount Variation
            </Typography>
            <Typography variant="body2">
              Withdraw different amounts than deposited to break amount correlations
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 250 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#667eea', mb: 1 }}>
              Chain Hopping
            </Typography>
            <Typography variant="body2">
              Use different chains for deposits and withdrawals for maximum privacy
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: '1 1 calc(50% - 8px)', minWidth: 250 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#667eea', mb: 1 }}>
              Fresh Addresses
            </Typography>
            <Typography variant="body2">
              Always withdraw to new addresses with no transaction history
            </Typography>
          </Paper>
        </Box>

        <Alert severity="success" sx={{ my: 3, bgcolor: 'rgba(74, 222, 128, 0.1)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2">
            <strong>Result:</strong> Complete unlinkability between your deposit and withdrawal addresses,
            even when observed by sophisticated blockchain analysis tools.
          </Typography>
        </Alert>
      </Box>
    ),

    security: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Security Model
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          InterNull's security is built on multiple layers of cryptographic primitives and distributed
          trust assumptions, ensuring funds remain safe even under various attack scenarios.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Threat Model
        </Typography>

        <TableContainer component={Paper} sx={{ my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Attack Vector</strong></TableCell>
                <TableCell><strong>Protection Mechanism</strong></TableCell>
                <TableCell><strong>Impact</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Smart Contract Exploit</TableCell>
                <TableCell>Formal verification, audits, bug bounties</TableCell>
                <TableCell>Funds at risk if successful</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Backend Node Compromise</TableCell>
                <TableCell>3-of-5 threshold requirement</TableCell>
                <TableCell>Need 3+ nodes for attack</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Key Interception</TableCell>
                <TableCell>TLS encryption, client-side verification</TableCell>
                <TableCell>Individual keys at risk</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Replay Attacks</TableCell>
                <TableCell>Nonces, used key tracking</TableCell>
                <TableCell>Attack prevented</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Timing Analysis</TableCell>
                <TableCell>User-controlled withdrawal timing</TableCell>
                <TableCell>Privacy reduced</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Amount Correlation</TableCell>
                <TableCell>Flexible denominations, splitting</TableCell>
                <TableCell>Privacy reduced</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Cryptographic Security
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            ECDSA Security
          </Typography>
          <List>
            <ListItem>
              <Typography variant="body2">
                • 256-bit private keys provide 128-bit security level
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                • One-time use prevents key reuse attacks
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                • Signatures verified on-chain, no trust required
              </Typography>
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Merkle Tree Security
          </Typography>
          <List>
            <ListItem>
              <Typography variant="body2">
                • Collision-resistant hash function (Keccak-256)
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                • Second-preimage resistance prevents proof forgery
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                • Binding property ensures key uniqueness
              </Typography>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Operational Security
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, my: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Security sx={{ color: '#667eea', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Node Security
            </Typography>
            <Typography variant="body2">
              • Hardware security modules (HSMs)
              <br />• Geographic distribution
              <br />• Regular key rotation
              <br />• Audit logging
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Lock sx={{ color: '#667eea', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Access Control
            </Typography>
            <Typography variant="body2">
              • Multi-signature admin functions
              <br />• Time-locked upgrades
              <br />• Role-based permissions
              <br />• Emergency pause mechanism
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Shield sx={{ color: '#667eea', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Monitoring
            </Typography>
            <Typography variant="body2">
              • Real-time anomaly detection
              <br />• Balance monitoring
              <br />• Transaction pattern analysis
              <br />• Automated alerts
            </Typography>
          </Paper>
        </Box>
      </Box>
    ),

    usecases: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          Use Cases
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          InterNull enables a wide range of privacy-preserving applications across DeFi,
          payments, and institutional use cases.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          DeFi Privacy
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#667eea' }}>
            Private Yield Farming
          </Typography>
          <Typography variant="body2" paragraph>
            Farm yields without exposing your main wallet address or total portfolio value.
          </Typography>
          <Box sx={{ bgcolor: 'rgba(13, 17, 40, 0.8)', p: 2, borderRadius: 1, border: '1px solid rgba(102, 126, 234, 0.2)' }}>
            <Typography variant="body2">
              <strong>Example:</strong> Deposit USDC through InterNull → Withdraw to fresh address →
              Farm on Aave/Compound → Return profits privately
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#667eea' }}>
            Anonymous DAOs
          </Typography>
          <Typography variant="body2" paragraph>
            Participate in DAO governance without revealing your identity or holdings.
          </Typography>
          <Box sx={{ bgcolor: 'rgba(13, 17, 40, 0.8)', p: 2, borderRadius: 1, border: '1px solid rgba(102, 126, 234, 0.2)' }}>
            <Typography variant="body2">
              <strong>Example:</strong> Receive governance tokens privately → Vote on proposals →
              Maintain pseudonymity while participating
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Payment Solutions
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, my: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#667eea' }}>
              Payroll Privacy
            </Typography>
            <Typography variant="body2">
              Pay employees without revealing company treasury address or other employee salaries
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#667eea' }}>
              B2B Payments
            </Typography>
            <Typography variant="body2">
              Settle invoices privately without exposing business relationships or cash flows
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#667eea' }}>
              Remittances
            </Typography>
            <Typography variant="body2">
              Send money across borders privately without intermediary tracking
            </Typography>
          </Paper>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Institutional Use Cases
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(102, 126, 234, 0.05)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Treasury Management
          </Typography>
          <List>
            <ListItem>
              <Typography variant="body2">
                • Diversify holdings across chains without revealing positions
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                • Rebalance portfolios privately
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                • Execute large trades without market impact
              </Typography>
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(102, 126, 234, 0.05)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Compliance & Privacy
          </Typography>
          <List>
            <ListItem>
              <Typography variant="body2">
                • Meet privacy regulations (GDPR) while using public blockchains
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                • Protect competitive intelligence
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                • Maintain customer privacy for crypto services
              </Typography>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Real-World Examples
        </Typography>

        <TableContainer component={Paper} sx={{ my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Scenario</strong></TableCell>
                <TableCell><strong>Traditional</strong></TableCell>
                <TableCell><strong>With InterNull</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Whale Trading</TableCell>
                <TableCell>Tracked by watchers, front-run</TableCell>
                <TableCell>Trade privately across DEXs</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Salary Payments</TableCell>
                <TableCell>All salaries visible on-chain</TableCell>
                <TableCell>Private, untraceable payments</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cross-chain Arb</TableCell>
                <TableCell>Strategies easily copied</TableCell>
                <TableCell>Hidden arbitrage execution</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>NFT Purchases</TableCell>
                <TableCell>Buyer identity exposed</TableCell>
                <TableCell>Anonymous collecting</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="info" sx={{ my: 3, bgcolor: 'rgba(102, 126, 234, 0.1)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2">
            <strong>Note:</strong> InterNull is designed for legitimate privacy use cases.
            The protocol includes compliance features for regulated entities while preserving
            privacy for individual users.
          </Typography>
        </Alert>
      </Box>
    ),

    references: (
      <Box>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
          References
        </Typography>
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
          Technical standards and resources for InterNull's implementation.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Technical Standards
        </Typography>

        <Paper sx={{ p: 3, my: 3, bgcolor: 'rgba(13, 17, 40, 0.6)', border: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <List>
            <ListItem>
              <Typography variant="body2">
                <strong>EIP-712:</strong> Ethereum typed structured data hashing and signing
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>EIP-1967:</strong> Standard proxy storage slots
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>EIP-2612:</strong> Permit - 712-signed approvals
              </Typography>
            </ListItem>
            <ListItem>
              <Typography variant="body2">
                <strong>NIST SP 800-186:</strong> Elliptic curve standards
              </Typography>
            </ListItem>
          </List>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Open Source Libraries
        </Typography>

        <Box sx={{ bgcolor: '#1e1e1e', color: '#d4d4d4', p: 3, borderRadius: 2, my: 3 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {`Dependencies:
============
@openzeppelin/contracts: 4.9.0
ethers.js: 6.7.0
circomlib: 2.0.5
snarkjs: 0.7.0
noble-curves: 1.2.0
merkletreejs: 0.3.10`}
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Related Projects
        </Typography>

        <TableContainer component={Paper} sx={{ my: 3, bgcolor: 'rgba(13, 17, 40, 0.8)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Project</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Relationship</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Tornado Cash</TableCell>
                <TableCell>ZK-SNARK privacy protocol for Ethereum</TableCell>
                <TableCell>Inspired privacy model</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Aztec Protocol</TableCell>
                <TableCell>Private DeFi on Ethereum</TableCell>
                <TableCell>Complementary approach</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Secret Network</TableCell>
                <TableCell>Privacy-preserving smart contracts</TableCell>
                <TableCell>Different architecture</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Monero</TableCell>
                <TableCell>Privacy-focused cryptocurrency</TableCell>
                <TableCell>Ring signature inspiration</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="h5" gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
          Documentation & Resources
        </Typography>

        <List>
          <ListItem>
            <ListItemButton
              onClick={() => window.open('https://github.com/internull/protocol', '_blank')}
              sx={{ borderRadius: 1, bgcolor: 'rgba(102, 126, 234, 0.05)' }}
            >
              <GitHub sx={{ mr: 2 }} />
              <ListItemText primary="GitHub Repository" secondary="Source code and issues" />
            </ListItemButton>
          </ListItem>
          <ListItem>
            <ListItemButton
              onClick={() => window.open('https://internull.gitbook.io', '_blank')}
              sx={{ borderRadius: 1, bgcolor: 'rgba(102, 126, 234, 0.05)' }}
            >
              <Article sx={{ mr: 2 }} />
              <ListItemText primary="Technical Documentation" secondary="Detailed API and integration guides" />
            </ListItemButton>
          </ListItem>
          <ListItem>
            <ListItemButton
              onClick={() => window.open('https://discord.gg/internull', '_blank')}
              sx={{ borderRadius: 1, bgcolor: 'rgba(102, 126, 234, 0.05)' }}
            >
              <ListItemText primary="Discord Community" secondary="Join our developer community" />
            </ListItemButton>
          </ListItem>
        </List>

        <Alert severity="info" sx={{ my: 3, bgcolor: 'rgba(102, 126, 234, 0.1)', color: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="body2">
            <strong>Citation:</strong> If you use InterNull in your research, please cite:
            <br />
            <code style={{ fontSize: '0.85rem' }}>
              InterNull Team (2024). "InterNull: Cross-Chain Privacy Protocol using ECDSA One-Time Signatures"
            </code>
          </Typography>
        </Alert>
      </Box>
    ),
  };

  useEffect(() => {
    // Update active section based on scroll
    const handleScroll = () => {
      const sections = Object.keys(content);
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 200) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0a0e27',
        background: `
          radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(240, 147, 251, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(79, 172, 254, 0.1) 0%, transparent 50%),
          linear-gradient(180deg, #0a0e27 0%, #151933 100%)
        `,
        color: 'rgba(255, 255, 255, 0.9)'
      }}
    >
      <Header />
      <Box sx={{ display: 'flex', pt: 2 }}>
        {/* Mobile menu button */}
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              position: 'fixed',
              left: 16,
              top: 80,
              zIndex: 1200,
              bgcolor: 'rgba(102, 126, 234, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(102, 126, 234, 0.2)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Sidebar */}
        <Box
          component="nav"
          sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        >
          <Drawer
            variant={isMobile ? 'temporary' : 'permanent'}
            open={isMobile ? mobileOpen : true}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                mt: 8,
                height: 'calc(100% - 64px)',
                bgcolor: '#0d1128',
                borderRight: '1px solid rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Main content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: 0 },
            maxWidth: '900px',
            mx: 'auto',
          }}
        >
          <Container maxWidth="md">
            {Object.entries(content).map(([key, component]) => (
              <Box key={key} id={key} sx={{ mb: 8, pt: 2 }}>
                {component}
              </Box>
            ))}
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default Docs;