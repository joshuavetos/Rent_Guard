# Genesis Seal Tooling

Creates a deterministic genesis payload by hashing the immutable protocol specification and binding supplied kernel hashes.

## Usage

```
python genesis_seal.py --protocol protocol/TESSRAX_PROTOCOL_V1.md \
  --kernel-hash $(cat kernel_hash.txt) \
  --signing-key-file path/to/signing.key \
  --output-dir artifacts/genesis
```

- Requires at least one `--kernel-hash`.
- Signing key must be provided externally via `--signing-key` or `--signing-key-file` (no key generation occurs).
- Outputs `genesis_block.json` and `GENESIS_HASH.txt` in the chosen directory.
- No network access, no timestamps, deterministic ordering.
