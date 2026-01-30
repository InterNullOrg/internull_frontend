// Polyfills for browser compatibility with Node.js modules
import { Buffer } from 'buffer';

// Make Buffer available globally for Solana web3.js and other libraries
window.Buffer = Buffer;

export default Buffer;
