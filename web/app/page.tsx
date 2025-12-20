"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, FileJson, UploadCloud } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

type Artifact = {
  artifact_id: string;
  tenant_id: string;
  status: string;
  decision: string;
  action: string;
  explanation?: string;
  balance?: string;
  notice_date?: string;
  days_past_due?: number;
  timestamp?: string;
  [key: string]: unknown;
};

type Ledger = {
  tenant_id: string;
  due_date: string;
  balance: number | string;
  no_notice_sent?: boolean;
  current_date?: string;
  human_block?: boolean;
  human_override?: boolean;
  override_reason?: string;
};

const REQUIRED_HEADERS = ["tenant_id", "due_date", "balance"] as const;

export default function RentGuardShadowRun() {
  const [ledgerText, setLedgerText] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [packetLoading, setPacketLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentArtifact = artifacts[0];

  const statusTone = useMemo(() => {
    if (!currentArtifact) return { label: "UNSET", color: "text-slate-400 border-slate-300 bg-slate-50" };
    if (currentArtifact.status === "LATE") return { label: "LATE", color: "text-red-700 border-red-300 bg-red-50" };
    if (currentArtifact.status === "CLEAR") return { label: "CLEAR", color: "text-emerald-700 border-emerald-300 bg-emerald-50" };
    return { label: currentArtifact.status, color: "text-slate-800 border-slate-300 bg-slate-50" };
  }, [currentArtifact]);

  const parseCsv = (text: string): Ledger => {
    const [headerLine, ...rows] = text.trim().split(/\r?\n/);
    const headers = headerLine.split(",").map((h) => h.trim());
    const firstRow = rows[0];
    if (!firstRow) throw new Error("CSV contained no rows.");
    const values = firstRow.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });

    REQUIRED_HEADERS.forEach((key) => {
      if (!(key in row)) throw new Error(`Missing column: ${key}`);
    });

    return {
      tenant_id: row["tenant_id"],
      due_date: row["due_date"],
      balance: row["balance"],
      no_notice_sent: row["no_notice_sent"] ? row["no_notice_sent"].toLowerCase() !== "false" : true,
    };
  };

  const parseJsonText = (text: string): Ledger => {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      if (!parsed.length) throw new Error("JSON array is empty.");
      return parsed[0] as Ledger;
    }
    return parsed as Ledger;
  };

  const evaluateLedger = useCallback(
    async (ledger: Ledger) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ledger),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(`Compliance Error: ${detail?.detail || "Evaluation failed."}`);
        }
        const payload = await res.json();
        setArtifacts((prev) => [payload, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Compliance Error: Unknown fault.");
      } finally {
        setLoading(false);
      }
    },
    [setArtifacts]
  );

  const handleLedgerSubmit = useCallback(() => {
    if (!ledgerText.trim()) {
      setError("Compliance Error: Provide JSON ledger content.");
      return;
    }
    try {
      const ledger = parseJsonText(ledgerText);
      evaluateLedger(ledger);
    } catch (err) {
      setError(err instanceof Error ? `Compliance Error: ${err.message}` : "Compliance Error: Invalid JSON.");
    }
  }, [ledgerText, evaluateLedger]);

  const handleFile = useCallback(
    async (file: File) => {
      const content = await file.text();
      try {
        if (file.name.toLowerCase().endsWith(".csv")) {
          const ledger = parseCsv(content);
          setLedgerText(JSON.stringify(ledger, null, 2));
          await evaluateLedger(ledger);
        } else {
          const ledger = parseJsonText(content);
          setLedgerText(JSON.stringify(ledger, null, 2));
          await evaluateLedger(ledger);
        }
      } catch (err) {
        setError(err instanceof Error ? `Compliance Error: ${err.message}` : "Compliance Error: Parse failure.");
      }
    },
    [evaluateLedger]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const downloadPacket = useCallback(async () => {
    if (!artifacts.length) {
      setError("Compliance Error: No artifacts available.");
      return;
    }
    setPacketLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/judge-packet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: artifacts[0]?.tenant_id, artifacts }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(`Compliance Error: ${detail?.detail || "Judge packet failed."}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${artifacts[0]?.tenant_id || "judge_packet"}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compliance Error: Unknown fault.");
    } finally {
      setPacketLoading(false);
    }
  }, [artifacts]);

  const runLateDemo = useCallback(() => {
    const today = new Date();
    const lateDate = new Date(today);
    lateDate.setDate(today.getDate() - 4);
    const demoLedger: Ledger = {
      tenant_id: "SHADOW-DEMO",
      due_date: lateDate.toISOString().slice(0, 10),
      balance: 125.5,
      no_notice_sent: true,
    };
    setLedgerText(JSON.stringify(demoLedger, null, 2));
    evaluateLedger(demoLedger);
  }, [evaluateLedger]);

  return (
    <main className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">RentGuard Shadow Run</p>
          <h1 className="text-3xl font-semibold mt-1">Governance Compliance Execution</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Drag a ledger (JSON or CSV). The system evaluates deterministically. No friendliness. Output mirrors policy.
          </p>
        </div>
        <button
          onClick={runLateDemo}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
        >
          Run 4-Day Late Demo
        </button>
      </header>

      {error && (
        <div className="border border-amber-400 bg-amber-50 text-amber-800 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="mt-0.5" size={18} />
          <div className="space-y-1">
            <div className="font-semibold text-sm">Compliance Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      <section className="grid lg:grid-cols-[2fr,1fr] gap-6 items-start">
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <FileJson size={18} /> Ledger Input
              </div>
              <button
                onClick={handleLedgerSubmit}
                disabled={loading}
                className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {loading ? "Evaluating…" : "Evaluate"}
              </button>
            </div>
            <textarea
              value={ledgerText}
              onChange={(e) => setLedgerText(e.target.value)}
              className="mt-3 w-full h-56 p-3 rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white"
              placeholder='{"tenant_id": "T-01", "due_date": "2024-01-05", "balance": 1200.45, "no_notice_sent": true}'
            />
            <div className="text-xs text-slate-500 mt-2">Required: tenant_id, due_date, balance.</div>
          </div>

          <label
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border border-dashed border-slate-400 rounded-xl p-5 bg-slate-50 flex items-center justify-between cursor-pointer hover:border-slate-600"
            htmlFor="ledger-upload"
          >
            <div className="flex items-center gap-3">
              <UploadCloud size={22} className="text-slate-700" />
              <div>
                <div className="font-semibold text-slate-800">Drop JSON or CSV</div>
                <div className="text-sm text-slate-600">First row used for CSV. No tolerance for malformed inputs.</div>
              </div>
            </div>
            <input
              id="ledger-upload"
              type="file"
              accept=".json,.csv,application/json,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Drag or Click</span>
          </label>
        </div>

        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className={`text-4xl font-semibold tracking-tight font-mono ${statusTone.color}`}>
              {statusTone.label}
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs uppercase text-slate-500 mb-1">Action</div>
              <div className="font-semibold">{currentArtifact?.action || "NONE"}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs uppercase text-slate-500 mb-1">Decision</div>
              <div className="font-semibold">{currentArtifact?.decision || "—"}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs uppercase text-slate-500 mb-1">Balance</div>
              <div className="font-semibold font-mono">{currentArtifact?.balance || "0.00"}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs uppercase text-slate-500 mb-1">Days Past Due</div>
              <div className="font-semibold font-mono">{currentArtifact?.days_past_due ?? "—"}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs uppercase text-slate-500 mb-1">Notice Date</div>
              <div className="font-semibold font-mono">{currentArtifact?.notice_date || "—"}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs uppercase text-slate-500 mb-1">Artifact ID</div>
              <div className="font-semibold text-xs break-all">{currentArtifact?.artifact_id || "—"}</div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 text-white text-sm min-h-[96px]">
            <div className="text-xs uppercase text-slate-300 mb-1">Explanation</div>
            <div className="leading-relaxed">{currentArtifact?.explanation || "Awaiting evaluation."}</div>
          </div>
          <button
            onClick={downloadPacket}
            disabled={!artifacts.length || packetLoading}
            className="w-full py-3 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-50"
          >
            {packetLoading ? "Building Judge Packet…" : "Get Judge Packet"}
          </button>
        </div>
      </section>

      {artifacts.length > 1 && (
        <section className="border border-slate-200 rounded-xl p-4 bg-white">
          <div className="text-sm font-semibold text-slate-700 mb-3">Recent Artifacts</div>
          <div className="space-y-2 text-sm">
            {artifacts.map((artifact) => (
              <div
                key={artifact.artifact_id}
                className="grid grid-cols-[1fr,1fr,1fr,auto] gap-3 items-center border border-slate-100 rounded-lg p-3"
              >
                <div className="font-semibold">{artifact.tenant_id}</div>
                <div className="font-mono text-xs">{artifact.status}</div>
                <div className="text-slate-600">{artifact.action}</div>
                <div className="text-xs text-slate-500">{artifact.timestamp ? new Date(artifact.timestamp).toLocaleString() : "—"}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
