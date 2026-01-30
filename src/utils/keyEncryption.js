import CryptoJS from 'crypto-js';

class KeyEncryptionService {
  static encryptKeys(keysData, password) {
    try {
      const dataString = JSON.stringify(keysData);
      
      const salt = CryptoJS.lib.WordArray.random(128/8);
      const iv = CryptoJS.lib.WordArray.random(128/8);
      
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: 10000,
        hasher: CryptoJS.algo.SHA256
      });
      
      const encrypted = CryptoJS.AES.encrypt(dataString, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      const encryptedData = {
        version: 1,
        salt: salt.toString(CryptoJS.enc.Base64),
        iv: iv.toString(CryptoJS.enc.Base64),
        ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        algorithm: 'AES-256-CBC',
        iterations: 10000
      };
      
      return JSON.stringify(encryptedData);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt keys');
    }
  }

  static decryptKeys(encryptedData, password) {
    try {
      const data = JSON.parse(encryptedData);
      
      if (data.version !== 1) {
        throw new Error('Unsupported encryption version');
      }
      
      const salt = CryptoJS.enc.Base64.parse(data.salt);
      const iv = CryptoJS.enc.Base64.parse(data.iv);
      const ciphertext = CryptoJS.enc.Base64.parse(data.ciphertext);
      
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: data.iterations || 10000,
        hasher: CryptoJS.algo.SHA256
      });
      
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: ciphertext
      });
      
      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Invalid password or corrupted data');
      }
      
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt keys: ' + error.message);
    }
  }

  static createKeyFileName(depositId) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    return `treasury-keys-${depositId}-${timestamp}.enc`;
  }

  static downloadEncryptedKeys(encryptedData, filename) {
    const blob = new Blob([encryptedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async readEncryptedFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

export default KeyEncryptionService;