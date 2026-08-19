# UIAP Trusted Public Keys

This directory contains Ed25519 public keys trusted by this UIAP Edge installation.

Each file is named `<keyId>.pem` and contains a PEM-encoded Ed25519 public key.

## Adding a trusted key

1. Generate a keypair: `npm run sign:keygen -- <keyId>`
2. The public key is automatically placed here
3. The private key goes to `signing-keys/` (gitignored)

## Security

- **Public keys** in this directory are safe to commit to version control
- **Private keys** must NEVER be stored here or anywhere in the repository
- Only modules signed with a key whose public counterpart is in this directory will be accepted for installation
