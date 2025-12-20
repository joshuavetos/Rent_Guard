# Kernel Compiler

Deterministic compiler that converts SysDNA JSON into a canonical kernel representation and kernel hash.

## Usage

```
python compiler.py --sysdna path/to/sysdna.json --kernel-output kernel.json --hash-output kernel_hash.txt
```

- Input: SysDNA JSON (declarative law)
- Output: kernel JSON plus a `kernel_hash` derived from the canonicalized kernel content
- Deterministic: no timestamps, no randomness, no network access
- Hash: `SHA-256` over the canonicalized kernel JSON (sorted keys, compact separators)
