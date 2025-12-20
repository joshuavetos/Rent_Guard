"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Activity,
  ClipboardList,
  Download,
  FileArchive,
  FileJson,
  Loader2,
  LogIn,
  LogOut,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Upload,
  Zap
} from "lucide-react";

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

type OverrideRequest = {
  id: string;
  tenant_id: string;
  reason: string;
  requested_by: string;
  status: "Pending" | "Approved" | "Rejected";
  submitted_at: string;
};

type AccessLog = {
  id: string;
  actor: string;
  action: string;
  scope: string;
  timestamp: string;
};

type TrendPoint = {
  period: string;
  enforcementRate: number;
  enforced: number;
  total: number;
};

const DEFAULT_OVERRIDES: OverrideRequest[] = [
  {
    id: "OVR-1048",
    tenant_id: "RG-2043",
    reason: "Pause automated notice while repayment plan is reviewed",
    requested_by: "compliance.lead@rentguard.com",
    status: "Pending",
    submitted_at: "2024-06-15T14:10:00Z"
  },
  {
    id: "OVR-1049",
    tenant_id: "RG-1188",
    reason: "Human override to prevent duplicate packet",
    requested_by: "ops.manager@rentguard.com",
    status: "Approved",
    submitted_at: "2024-06-14T09:42:00Z"
  },
  {
    id: "OVR-1050",
    tenant_id: "RG-3201",
    reason: "Escalate to counsel before filing",
    requested_by: "legal.review@rentguard.com",
    status: "Pending",
    submitted_at: "2024-06-13T17:55:00Z"
  }
];

const DEFAULT_ACCESS_LOGS: AccessLog[] = [
  {
    id: "LOG-901",
    actor: "alice@rentguard.com",
    action: "Downloaded judge packet",
    scope: "Tenant RG-2043",
    timestamp: "2024-06-15T15:25:00Z"
  },
  {
    id: "LOG-902",
    actor: "bob@rentguard.com",
    action: "Approved override",
    scope: "Tenant RG-1188",
    timestamp: "2024-06-15T11:05:00Z"
  },
  {
    id: "LOG-903",
    actor: "carol@rentguard.com",
    action: "Viewed artifact history",
    scope: "Portfolio east-coast",
    timestamp: "2024-06-14T20:15:00Z"
  }
];

const DEFAULT_TRENDS: TrendPoint[] = [
  { period: "Mar 2024", enforcementRate: 18.5, enforced: 37, total: 200 },
  { period: "Apr 2024", enforcementRate: 21.2, enforced: 45, total: 212 },
  { period: "May 2024", enforcementRate: 19.0, enforced: 41, total: 216 },
  { period: "Jun 2024", enforcementRate: 22.5, enforced: 50, total: 222 }
];

export default function AppPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [packetLoading, setPacketLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedArtifacts, setExpandedArtifacts] = useState<Record<string, boolean>>({});
  const [selectedOverrideId, setSelectedOverrideId] = useState<string>(DEFAULT_OVERRIDES[0]?.id || "");

  const parsedJson = useMemo(() => {
    try {
      return jsonInput ? JSON.parse(jsonInput) : null;
    } catch (err) {
      return null;
    }
  }, [jsonInput]);

  const overrideQueue = useMemo(() => DEFAULT_OVERRIDES, []);
  const accessLogs = useMemo(() => DEFAULT_ACCESS_LOGS, []);

  const activeOverride = useMemo(
    () => overrideQueue.find((item) => item.id === selectedOverrideId) || overrideQueue[0],
    [overrideQueue, selectedOverrideId]
  );

  const enforcementTrends: TrendPoint[] = useMemo(() => {
    if (!artifacts.length) return DEFAULT_TRENDS;

    const monthly = new Map<string, { total: number; enforced: number }>();

    artifacts.forEach((artifact) => {
      const timestamp = artifact.timestamp ? new Date(artifact.timestamp) : new Date();
      if (Number.isNaN(timestamp.getTime())) return;
      const key = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}`;
      const current = monthly.get(key) || { total: 0, enforced: 0 };
      const status = (artifact.status || "").toUpperCase();
      const hasEnforcement = (status && status !== "CLEAR") || Boolean(artifact.action);

      current.total += 1;
      if (hasEnforcement) current.enforced += 1;
      monthly.set(key, current);
    });

    const ordered = Array.from(monthly.entries()).sort(([a], [b]) => (a > b ? 1 : -1));

    return ordered.map(([key, bucket]) => {
      const [year, month] = key.split("-");
      const monthLabel = new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "short" });
      const rate = bucket.total ? Math.round((bucket.enforced / bucket.total) * 1000) / 10 : 0;
      return {
        period: `${monthLabel} ${year}`,
        enforcementRate: rate,
        enforced: bucket.enforced,
        total: bucket.total
      };
    });
  }, [artifacts]);

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

  const downloadPacketForTenant = useCallback(
    async (tenantId?: string, packetArtifacts?: Artifact[]) => {
      if (!packetArtifacts?.length && !artifacts.length) {
        setError("Generate artifacts before downloading a packet.");
        return;
      }

      const artifactsForPacket = packetArtifacts?.length ? packetArtifacts : artifacts;
      const resolvedTenant = tenantId || artifactsForPacket[0]?.tenant_id;

      if (!resolvedTenant) {
        setError("Tenant id is required to build a packet.");
        return;
      }

      setPacketLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/judge-packet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: resolvedTenant, artifacts: artifactsForPacket })
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.detail || "Unable to generate Judge Packet");
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${resolvedTenant || "judge_packet"}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setPacketLoading(false);
      }
    },
    [artifacts]
  );

  const downloadPacket = useCallback(() => downloadPacketForTenant(), [downloadPacketForTenant]);

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

      <section className="grid xl:grid-cols-[2fr,1fr] gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="badge badge-soft inline-flex items-center gap-2">
                <ShieldCheck size={16} /> Admin Review
              </p>
              <h2 className="text-2xl font-semibold mt-2">Overrides & Packets</h2>
              <p className="text-slate-600 text-sm">Review human overrides, then assemble packets with a single click.</p>
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Compliance Console</span>
          </div>

          <div className="grid lg:grid-cols-[1.6fr,1fr] gap-4 items-start">
            <div className="space-y-2">
              {overrideQueue.map((item) => {
                const isActive = activeOverride?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedOverrideId(item.id)}
                    className={`w-full text-left border rounded-xl p-4 transition ${
                      isActive ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{item.tenant_id}</div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          item.status === "Approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "Pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className={`text-sm mt-1 ${isActive ? "text-slate-100" : "text-slate-600"}`}>{item.reason}</div>
                    <div className={`text-xs mt-2 ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                      Requested by {item.requested_by} on {new Date(item.submitted_at).toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <FileArchive size={18} /> Packet actions
              </div>
              <div className="text-sm text-slate-600 leading-relaxed">
                {activeOverride ? (
                  <>
                    <div className="font-semibold text-slate-800">Tenant {activeOverride.tenant_id}</div>
                    <p className="mt-1">{activeOverride.reason}</p>
                    <p className="text-xs text-slate-500">Status: {activeOverride.status} • Requested by {activeOverride.requested_by}</p>
                  </>
                ) : (
                  <p>No override selected.</p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  onClick={() => downloadPacketForTenant(activeOverride?.tenant_id, artifacts.filter((a) => a.tenant_id === activeOverride?.tenant_id))}
                  disabled={packetLoading || !artifacts.length}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {packetLoading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                  Build packet
                </button>
                <button
                  onClick={() => setExpandedArtifacts({})}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold"
                >
                  <ClipboardList size={16} /> Reset detail toggles
                </button>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Activity size={14} /> Packet actions use the currently loaded artifacts for the selected tenant.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <TrendingUp size={18} /> Portfolio Trends
            </div>
            <span className="text-xs text-slate-500">% tenants triggering enforcement</span>
          </div>
          <div className="space-y-3">
            {enforcementTrends.map((point) => (
              <div key={point.period} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                  <span>{point.period}</span>
                  <span className="flex items-center gap-1">
                    {point.enforcementRate >= 20 ? <TrendingUp size={14} className="text-amber-600" /> : <TrendingDown size={14} className="text-emerald-600" />}
                    {point.enforcementRate}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-white border border-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${Math.min(100, point.enforcementRate)}%` }}
                    aria-label={`Enforcement rate ${point.enforcementRate}% for ${point.period}`}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {point.enforced} of {point.total} tenants triggered enforcement signals.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[2fr,1fr] gap-6 items-start">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 card space-y-4">
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
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <LogIn size={18} /> Access Logs
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <LogOut size={14} /> User actions
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {accessLogs.map((log) => (
              <div key={log.id} className="border border-slate-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{log.action}</div>
                  <div className="text-slate-600 text-xs">{log.actor}</div>
                  <div className="text-slate-500 text-xs">{log.scope}</div>
                </div>
                <div className="text-xs text-slate-500 flex flex-col items-end">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{log.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
