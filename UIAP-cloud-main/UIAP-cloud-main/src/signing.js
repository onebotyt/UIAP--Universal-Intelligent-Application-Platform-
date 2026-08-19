const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Ensure we have a persistent keypair for the cloud
const keysDir = path.join(__dirname, '../../cloud-keys');
const privateKeyPath = path.join(keysDir, 'cloud_private.pem');
const publicKeyPath = path.join(keysDir, 'cloud_public.pem');

let privateKey = null;
let publicKey = null;

function loadOrGenerateKeys() {
  if (privateKey && publicKey) return;

  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    privateKey = crypto.createPrivateKey(fs.readFileSync(privateKeyPath));
    publicKey = crypto.createPublicKey(fs.readFileSync(publicKeyPath));
  } else {
    // Generate new Ed25519 keypair
    const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('ed25519');
    
    privateKey = priv;
    publicKey = pub;

    fs.writeFileSync(
      privateKeyPath,
      privateKey.export({ type: 'pkcs8', format: 'pem' })
    );
    fs.writeFileSync(
      publicKeyPath,
      publicKey.export({ type: 'spki', format: 'pem' })
    );
    
    console.log('[signing] Generated new Ed25519 keypair for cloud');
  }
}

/**
 * Hashes and signs a buffer using Ed25519.
 * @param {Buffer} buffer The package data to sign
 * @returns {{ hash: string, signature: string }}
 */
function signPackage(buffer) {
  loadOrGenerateKeys();
  
  // 1. Calculate SHA-256 hash of the package
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  
  // 2. Sign the hash (not the full buffer) using Ed25519
  // We sign the hash hex string to match what the edge verifies
  const signature = crypto.sign(null, Buffer.from(hash, 'utf8'), privateKey).toString('base64');
  
  return { hash, signature };
}

/**
 * Gets the current public key in PEM format (for edge installations to trust)
 */
function getPublicKeyPem() {
  loadOrGenerateKeys();
  return publicKey.export({ type: 'spki', format: 'pem' });
}

module.exports = {
  signPackage,
  getPublicKeyPem
};
