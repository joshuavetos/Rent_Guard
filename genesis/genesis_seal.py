import argparse
import hashlib
import hmac
import json
import sys
from pathlib import Path


def canonicalize(data) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    try:
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(8192), b""):
                digest.update(chunk)
    except FileNotFoundError as exc:
        raise SystemExit(f"Protocol file not found: {path}") from exc
    return digest.hexdigest()


def read_signing_key(key_arg: str, key_file: Path):
    if key_arg:
        return key_arg.encode("utf-8")
    if key_file:
        try:
            return key_file.read_text(encoding="utf-8").strip().encode("utf-8")
        except FileNotFoundError as exc:
            raise SystemExit(f"Signing key file not found: {key_file}") from exc
    raise SystemExit("Signing key required via --signing-key or --signing-key-file")


def compute_signature(key: bytes, payload: dict) -> str:
    canonical = canonicalize(payload).encode("utf-8")
    return hmac.new(key, canonical, hashlib.sha256).hexdigest()


def compute_genesis_hash(genesis_block: dict) -> str:
    canonical = canonicalize(genesis_block).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def write_json(path: Path, data: dict):
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, sort_keys=True, ensure_ascii=False)
        handle.write("\n")


def write_text(path: Path, value: str):
    with path.open("w", encoding="utf-8") as handle:
        handle.write(f"{value}\n")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Genesis seal tool")
    parser.add_argument(
        "--protocol",
        type=Path,
        default=Path("protocol/TESSRAX_PROTOCOL_V1.md"),
        help="Path to immutable protocol specification",
    )
    parser.add_argument(
        "--kernel-hash",
        action="append",
        required=True,
        help="Kernel hash to bind into the genesis payload (can be repeated)",
    )
    parser.add_argument(
        "--signing-key",
        type=str,
        help="Signing key material provided directly (will not be stored)",
    )
    parser.add_argument(
        "--signing-key-file",
        type=Path,
        help="Path to file containing signing key material",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("artifacts/genesis"),
        help="Directory for genesis_block.json and GENESIS_HASH.txt",
    )
    args = parser.parse_args(argv)

    protocol_hash = hash_file(args.protocol)
    kernel_hashes = sorted(set(args.kernel_hash))
    signing_key = read_signing_key(args.signing_key, args.signing_key_file)

    payload = {
        "protocol_hash": protocol_hash,
        "kernel_hashes": kernel_hashes,
    }

    signature = compute_signature(signing_key, payload)
    genesis_block = {
        "payload": payload,
        "signature": signature,
    }
    genesis_hash = compute_genesis_hash(genesis_block)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_json(args.output_dir / "genesis_block.json", genesis_block)
    write_text(args.output_dir / "GENESIS_HASH.txt", genesis_hash)

    print(f"protocol_hash={protocol_hash}")
    print(f"genesis_hash={genesis_hash}")


if __name__ == "__main__":
    main()
