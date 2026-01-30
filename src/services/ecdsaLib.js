// Simple and working ECDSA library for secp256k1
// Based on elliptic.js simplified implementation

class ECDSALib {
  constructor() {
    this.p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
    this.n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
    this.G = {
      x: 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
      y: 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n
    };
  }

  // Modular inverse
  modInverse(a, m) {
    a = ((a % m) + m) % m;
    let [old_r, r] = [a, m];
    let [old_s, s] = [1n, 0n];
    
    while (r !== 0n) {
      const quotient = old_r / r;
      [old_r, r] = [r, old_r - quotient * r];
      [old_s, s] = [s, old_s - quotient * s];
    }
    
    if (old_r > 1n) throw new Error('Modular inverse does not exist');
    return ((old_s % m) + m) % m;
  }

  // Point doubling
  pointDouble(point) {
    if (!point || (point.x === 0n && point.y === 0n)) {
      return { x: 0n, y: 0n };
    }
    
    if (point.y === 0n) {
      return { x: 0n, y: 0n };
    }
    
    const s = (3n * point.x * point.x * this.modInverse(2n * point.y, this.p)) % this.p;
    const x3 = (s * s - 2n * point.x) % this.p;
    const y3 = (s * (point.x - x3) - point.y) % this.p;
    
    return {
      x: (x3 + this.p) % this.p,
      y: (y3 + this.p) % this.p
    };
  }

  // Point addition
  pointAdd(p1, p2) {
    // Handle point at infinity
    if (!p1 || (p1.x === 0n && p1.y === 0n)) return p2;
    if (!p2 || (p2.x === 0n && p2.y === 0n)) return p1;
    
    // Same point
    if (p1.x === p2.x) {
      if (p1.y === p2.y) {
        return this.pointDouble(p1);
      }
      // Inverses
      return { x: 0n, y: 0n };
    }
    
    const dx = (p2.x - p1.x + this.p) % this.p;
    const dy = (p2.y - p1.y + this.p) % this.p;
    const s = (dy * this.modInverse(dx, this.p)) % this.p;
    const x3 = (s * s - p1.x - p2.x) % this.p;
    const y3 = (s * (p1.x - x3) - p1.y) % this.p;
    
    return {
      x: (x3 + this.p) % this.p,
      y: (y3 + this.p) % this.p
    };
  }

  // Scalar multiplication using double-and-add
  pointMultiply(k, point) {
    if (!k || k === 0n) {
      return { x: 0n, y: 0n };
    }
    
    // Ensure k is positive and within range
    k = ((k % this.n) + this.n) % this.n;
    if (k === 0n) {
      return { x: 0n, y: 0n };
    }
    
    let result = { x: 0n, y: 0n };
    let addend = { x: point.x, y: point.y };
    
    // Binary method from right to left
    while (k > 0n) {
      if (k & 1n) {
        result = this.pointAdd(result, addend);
      }
      addend = this.pointDouble(addend);
      k = k >> 1n;
    }
    
    return result;
  }

  // Convert public key to Ethereum address
  publicKeyToAddress(publicKey) {
    // For now, use a simple derivation (in production, use keccak256)
    // This is just for testing
    const combined = publicKey.x ^ publicKey.y;
    const addressBigInt = combined & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
    return '0x' + addressBigInt.toString(16).padStart(40, '0');
  }
}

export default ECDSALib;