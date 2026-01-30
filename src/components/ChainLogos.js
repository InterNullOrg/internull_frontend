import React from 'react';

// Chain logo components using stored PNG files
export const EthereumLogo = ({ size = 24 }) => (
  <img
    src="/logos/ethereum.png"
    alt="Ethereum"
    width={size}
    height={size}
    style={{ borderRadius: '50%', objectFit: 'contain' }}
  />
);

export const BNBLogo = ({ size = 24 }) => (
  <img
    src="/logos/bnb.png"
    alt="BNB Chain"
    width={size}
    height={size}
    style={{ borderRadius: '50%', objectFit: 'contain' }}
  />
);

export const OptimismLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#FF0420"/>
    <path d="M11.5 19.5C11.5 21.433 13.067 23 15 23H19C20.933 23 22.5 21.433 22.5 19.5C22.5 17.567 20.933 16 19 16H13C11.067 16 9.5 14.433 9.5 12.5C9.5 10.567 11.067 9 13 9H17C18.933 9 20.5 10.567 20.5 12.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const PolygonLogo = ({ size = 24 }) => (
  <img
    src="/logos/polygon.png"
    alt="Polygon"
    width={size}
    height={size}
    style={{ borderRadius: '50%', objectFit: 'contain' }}
  />
);

export const BaseLogo = ({ size = 24 }) => (
  <img
    src="/logos/base.png"
    alt="Base"
    width={size}
    height={size}
    style={{ borderRadius: '50%', objectFit: 'contain' }}
  />
);

export const SolanaLogo = ({ size = 24 }) => (
  <img
    src="/logos/solana.png"
    alt="Solana"
    width={size}
    height={size}
    style={{ borderRadius: '50%', objectFit: 'contain' }}
  />
);

export const HyperliquidLogo = ({ size = 24 }) => (
  <img
    src="/logos/hyperliquid.png"
    alt="Hyperliquid"
    width={size}
    height={size}
    style={{ borderRadius: '50%', objectFit: 'contain' }}
  />
);

// Helper function to get logo component by chain name
export const getChainLogo = (chainName, size = 24) => {
  const chain = chainName.toLowerCase();

  switch(chain) {
    case 'ethereum':
      return <EthereumLogo size={size} />;
    case 'solana':
      return <SolanaLogo size={size} />;
    case 'bnb':
    case 'bnb chain':
    case 'binance':
      return <BNBLogo size={size} />;
    case 'optimism':
      return <OptimismLogo size={size} />;
    case 'polygon':
      return <PolygonLogo size={size} />;
    case 'base':
      return <BaseLogo size={size} />;
    case 'hyperliquid':
      return <HyperliquidLogo size={size} />;
    default:
      return null;
  }
};

// Chain configuration with colors and names
export const chainConfig = {
  ethereum: { name: 'Ethereum', color: '#627EEA', logo: EthereumLogo },
  solana: { name: 'Solana', color: '#14F195', logo: SolanaLogo },
  bnb: { name: 'BNB Chain', color: '#F3BA2F', logo: BNBLogo },
  optimism: { name: 'Optimism', color: '#FF0420', logo: OptimismLogo },
  polygon: { name: 'Polygon', color: '#8247E5', logo: PolygonLogo },
  base: { name: 'Base', color: '#0052FF', logo: BaseLogo },
  hyperliquid: { name: 'Hyperliquid', color: '#00D9FF', logo: HyperliquidLogo }
};