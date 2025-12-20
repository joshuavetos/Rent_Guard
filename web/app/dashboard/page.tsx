"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, FileJson, Loader2, Upload, Zap } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

type Artifact = {
  artifact_id: string;
  tenant_id: string;
  status: string;
  decision: string;
  action: string;
  explanation: string;
  timestamp: string;
  thresholds?: Record<string, unknown>;
  [key: string]: any;
};

export default function AppPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [packetLoading, setPacketLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedArtifacts, setExpandedArtifacts] = useState<Record<string, boolean>>({});

  const parsedJson = useMemo(() => {
    try {
      return jsonInput ? JSON.parse(jsonInput) : null;
    } catch (err) {
      return null;
    }
  }, [jsonInput]);

  const evaluateJson = useCallback(async () => {
    if (!parsedJson) {
      setError("Provide valid JSON before evaluating.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedJson)
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || "Evaluation failed");
      }
      const payload = await res.json();
      setArtifacts((current) => [payload, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [parsedJson]);

  const evaluateCsv = useCallback(async () => {
    if (!csvFile) {
      setError("Choose a CSV file first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const text = await csvFile.text();
      const [headerLine, ...rows] = text.trim().split(/\r?\n/);
      if (!headerLine || !rows.length) throw new Error("CSV contained no rows");
      const headers = headerLine.split(",").map((h) => h.trim());
      const values = rows[0].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      if (!row["tenant_id"] || !row["due_date"] || !row["balance"]) {
        throw new Error("CSV must include tenant_id,due_date,balance");
      }
      const ledger = {
        tenant_id: row["tenant_id"],
        due_date: row["due_date"],
        balance: Number(row["balance"]),
        no_notice_sent: row["no_notice_sent"] ? row["no_notice_sent"].toLowerCase() !== "false" : true
      };
      const res = await fetch(`${API_BASE}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ledger)
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || "CSV evaluation failed");
      }
      const payload = await res.json();
      setArtifacts((current) => [payload, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [csvFile]);

  const downloadPacket = useCallback(async () => {
    if (!artifacts.length) {
      setError("Generate artifacts before downloading a packet.");
      return;
    }
    setPacketLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/judge-packet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: artifacts[0]?.tenant_id,
          artifacts
        })
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || "Unable to generate Judge Packet");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${artifacts[0]?.tenant_id || "judge_packet"}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPacketLoading(false);
    }
  }, [artifacts]);

  const runSampleCase = useCallback(async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    setError(null);
    try {
      const demoPayload = {
        tenant_id: "RG-DEMO-001",
        due_date: "2024-05-01",
        balance: 120.75,
        no_notice_sent: true
      };

      const res = await fetch(`${API_BASE}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoPayload)
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || "Sample evaluation failed");
      }

      const payload = await res.json();
      setArtifacts((current) => [payload, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDemoLoading(false);
    }
  }, [demoLoading]);

  const downloadArtifact = useCallback((artifact: Artifact) => {
    const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `artifact_${artifact.action || artifact.artifact_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const toggleDetails = useCallback((artifactId: string) => {
    setExpandedArtifacts((prev) => ({
      ...prev,
      [artifactId]: !prev[artifactId]
    }));
  }, []);

  return (
    <main className="space-y-8">
      <section className="bg-white rounded-3xl p-8 border border-slate-100 card">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="badge badge-soft">Live Demo</p>
            <h1 className="text-3xl font-semibold mt-2">Run evaluations without touching disk.</h1>
            <p className="text-slate-600 mt-1">Upload CSV or paste JSON to stream artifacts directly from the engine.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={runSampleCase}
              className="inline-flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-semibold border border-blue-100 disabled:opacity-50"
              disabled={demoLoading}
            >
              {demoLoading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
              Run Sample Case
            </button>
            <button
              onClick={downloadPacket}
              className="inline-flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-semibold disabled:opacity-50"
              disabled={!artifacts.length || packetLoading}
            >
              {packetLoading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              Download Judge Packet
            </button>
          </div>
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 p-4 rounded-xl mb-6">{error}</div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileJson size={20} /> JSON Record
              </h2>
              <button
                onClick={evaluateJson}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-50"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />} Evaluate
              </button>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
              placeholder='{"tenant_id": "T-100", "due_date": "2024-05-01", "balance": 120.75, "no_notice_sent": true}'
            />
            <p className="text-sm text-slate-500">Supply the same fields used by the engine. Dates must be ISO formatted.</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Upload size={20} /> CSV Portfolio
            </h2>
            <label
              htmlFor="csv-upload"
              className="border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-500"
            >
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <p className="font-semibold">Drag and drop or choose a CSV</p>
              <p className="text-sm text-slate-500">Headers: tenant_id, due_date, balance[, no_notice_sent]</p>
              {csvFile && <p className="mt-2 text-sm text-slate-700">Selected: {csvFile.name}</p>}
            </label>
            <button
              onClick={evaluateCsv}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />} Evaluate Portfolio
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="badge badge-soft">Results</div>
          <p className="text-slate-600">Artifacts stream directly from the engine—no disk reads.</p>
        </div>
        {artifacts.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-500">
            Artifacts will appear here after you run an evaluation.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artifacts.map((artifact) => {
              const detailId = `artifact-details-${artifact.artifact_id}`;
              const thresholds =
                artifact.thresholds && typeof artifact.thresholds === "object"
                  ? Object.entries(artifact.thresholds)
                  : [];

              return (
                <article key={artifact.artifact_id} className="bg-white border border-slate-100 rounded-2xl p-5 card space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-500">{artifact.action || "—"}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleDetails(artifact.artifact_id)}
                        aria-expanded={!!expandedArtifacts[artifact.artifact_id]}
                        aria-controls={detailId}
                        tabIndex={0}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1"
                        type="button"
                      >
                        {expandedArtifacts[artifact.artifact_id] ? "Hide details" : "View details"}
                      </button>
                      <button
                        onClick={() => downloadArtifact(artifact)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1"
                        type="button"
                      >
                        <Download size={14} />
                        Download JSON
                      </button>
                      <span className="badge badge-soft">{artifact.status}</span>
                    </div>
                  </div>
                  <div className="text-lg font-semibold">Tenant {artifact.tenant_id}</div>
                  <p className="text-sm text-slate-600">{artifact.explanation || "—"}</p>
                  {expandedArtifacts[artifact.artifact_id] && (
                    <div id={detailId} className="border-t border-slate-100 pt-3 space-y-2 text-sm text-slate-700">
                    <div className="flex justify-between">
                        <span className="font-semibold">Decision</span>
                        <span>{artifact.decision || "—"}</span>
                      </div>
                      <div>
                        <span className="font-semibold block">Explanation</span>
                        <p className="text-slate-600">{artifact.explanation || "—"}</p>
                      </div>
                      <div>
                        <span className="font-semibold block">Thresholds</span>
                        {thresholds.length ? (
                          <ul className="mt-1 space-y-1 text-slate-600">
                            {thresholds.map(([key, value]) => (
                              <li key={key} className="flex justify-between gap-2">
                                <span className="font-semibold text-slate-700">{key}</span>
                                <span>{String(value)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-600">—</p>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Timestamp</span>
                        <span>{artifact.timestamp ? new Date(artifact.timestamp).toLocaleString() : "—"}</span>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
