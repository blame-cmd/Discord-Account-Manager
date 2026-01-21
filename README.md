# ` 👾 `︲ Discord Account Manager
An Electron-based desktop client for managing Discord accounts with encrypted local storage using ChaCha20‑Poly1305 for tokens and session data.
​
---

# `🔨`︲ Features 
Multi-account switching: Swap between accounts without re-authing every time; sessions are pulled straight from the encrypted vault.
​

Local-only vault: No remote API, no sync, no external DB; everything stays on your filesystem as a single encrypted blob.
​

ChaCha20‑Poly1305 AEAD: Authenticated encryption with a 256‑bit key and 96‑bit nonce for each write, providing confidentiality and integrity in one pass.
​

Master password gate: A single master secret unlocks the vault; the raw password is never stored or written to disk.
​
---

# `🛠️`︲ Prerequisites
Node.js ≥ 18.0.0 for modern crypto APIs and ChaCha20‑Poly1305 support.​

Electron (any recent LTS-compatible version) for the desktop shell.
​
---

# `❗`︲Encryption Specs
The app treats Discord tokens and related secrets as a single encrypted payload instead of rows in a database.

Key derivation: The master password is stretched with Argon2id into a 32‑byte key (256‑bit) suitable for symmetric encryption.
​

Cipher mode: All sensitive data is sealed using ChaCha20‑Poly1305 AEAD; the Poly1305 tag is verified on every read before any decryption is trusted.
​

In‑memory handling: Decrypted tokens live only in RAM for the lifetime of the process and are never written back to disk in plaintext form.
​

> [!IMPORTANT]
> - ⚠️ **This is a personal tool for account management and experimentation, not an official Discord product. Automating or manipulating user accounts can violate Discord’s Terms of Service; use it at your own risk and only against accounts you own.**
