import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

/**
 * Hook to fetch and manage token mappings from the OTS system.
 * Token mappings define how tokens are mapped across different chains.
 *
 * @returns {Object} - Token mappings data and loading state
 * @property {Object} mappings - Token mappings organized by source token and target chain
 * @property {boolean} loading - Loading state
 * @property {string|null} error - Error message if any
 * @property {Function} refetch - Function to manually refetch mappings
 */
const useTokenMappings = () => {
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/token-mappings`);
      const data = await response.json();

      if (data.success) {
        setMappings(data.mappings || {});
      } else {
        setError(data.error || 'Failed to load token mappings');
      }
    } catch (err) {
      console.error('Error fetching token mappings:', err);
      setError('Failed to fetch token mappings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  /**
   * Get the target token for a given source token and target chain
   * @param {string} sourceToken - Source token symbol (e.g., 'ETH')
   * @param {string} targetChain - Target chain identifier (e.g., 'polygon')
   * @returns {string|null} - Target token symbol or null if not found
   */
  const getTargetToken = (sourceToken, targetChain) => {
    if (!mappings[sourceToken]) return null;
    const mapping = mappings[sourceToken][targetChain];
    return mapping ? mapping.target_token : null;
  };

  /**
   * Get all target chains available for a source token
   * @param {string} sourceToken - Source token symbol
   * @returns {Array<string>} - Array of target chain identifiers
   */
  const getAvailableChains = (sourceToken) => {
    if (!mappings[sourceToken]) return [];
    return Object.keys(mappings[sourceToken]);
  };

  /**
   * Check if a token mapping is flexible (tokens can be used interchangeably)
   * @param {string} sourceToken - Source token symbol
   * @param {string} targetChain - Target chain identifier
   * @returns {boolean} - True if flexible, false otherwise
   */
  const isFlexibleMapping = (sourceToken, targetChain) => {
    if (!mappings[sourceToken] || !mappings[sourceToken][targetChain]) {
      return false;
    }
    return mappings[sourceToken][targetChain].is_flexible || false;
  };

  /**
   * Get all available source tokens
   * @returns {Array<string>} - Array of source token symbols
   */
  const getAvailableTokens = () => {
    return Object.keys(mappings);
  };

  return {
    mappings,
    loading,
    error,
    refetch: fetchMappings,
    getTargetToken,
    getAvailableChains,
    isFlexibleMapping,
    getAvailableTokens,
  };
};

export default useTokenMappings;
