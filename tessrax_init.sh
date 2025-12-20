#!/bin/bash
echo "Initializing Tessrax Protocol Node..."

# 1. Create the Immutable Structure
mkdir -p tessrax/{sysdna,kernels,residue,federation}

# 2. Plant the Genesis Law (RentGuard)
cat <<EOF > tessrax/sysdna/RentGuard_v1.json
{
  "identity": "RentGuard Enforcement Agent",
  "jurisdiction": "US-SD",
  "invariants": [
    "IF (late_days > 3) THEN status = LATE",
    "IF (status == LATE) AND (no_notice) THEN action = EMIT_NOTICE"
  ]
}
EOF

# 3. Plant the ValuGuard Witness (Dormant)
cat <<EOF > tessrax/sysdna/ValuGuard_v1.json
{
  "identity": "ValuGuard Asset Witness",
  "status": "DORMANT",
  "invariants": [
    "IF (volatility > threshold) AND (liquidity == 0) THEN flag = ILLUSORY_LIQUIDITY"
  ]
}
EOF

# 4. Initialize the Residue Log
echo "TESSRAX_EPOCH_0_START" > tessrax/residue/0000_genesis.log

echo "✅ System Instantiated."
echo "   - Protocol Root: tessrax/"
echo "   - Active Kernel: RentGuard"
echo "   - Dormant Kernel: ValuGuard"
