import argparse
import hashlib
import json
import sys
from pathlib import Path


def canonicalize(data) -> str:
    """Canonical JSON string with sorted keys and compact separators."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def load_sysdna(path: Path):
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise SystemExit(f"SysDNA file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"SysDNA file is not valid JSON: {path}") from exc


def validate_sysdna(sysdna):
    required_fields = ["id", "version", "status"]
    for field in required_fields:
        if field not in sysdna:
            raise SystemExit(f"Missing required SysDNA field: {field}")


def build_kernel(sysdna):
    return {
        "kernel_id": sysdna["id"],
        "kernel_version": sysdna["version"],
        "status": sysdna.get("status"),
        "jurisdiction": sysdna.get("jurisdiction"),
        "rules": sysdna.get("rules", []),
        "source_sysdna": sysdna,
    }


def compute_hash(data) -> str:
    canonical = canonicalize(data).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def write_json(path: Path, data):
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, sort_keys=True, ensure_ascii=False)
        handle.write("\n")


def write_hash(path: Path, value: str):
    with path.open("w", encoding="utf-8") as handle:
        handle.write(f"{value}\n")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Deterministic SysDNA kernel compiler")
    parser.add_argument("--sysdna", required=True, type=Path, help="Path to SysDNA JSON input")
    parser.add_argument("--kernel-output", required=True, type=Path, help="Where to write kernel JSON")
    parser.add_argument("--hash-output", required=True, type=Path, help="Where to write kernel hash text")
    args = parser.parse_args(argv)

    sysdna = load_sysdna(args.sysdna)
    validate_sysdna(sysdna)
    kernel = build_kernel(sysdna)
    kernel_hash = compute_hash(kernel)

    write_json(args.kernel_output, kernel)
    write_hash(args.hash_output, kernel_hash)

    print(f"kernel_hash={kernel_hash}")


if __name__ == "__main__":
    main()
