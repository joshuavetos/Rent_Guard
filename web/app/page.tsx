"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, FileSignature, Send, UploadCloud } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
const MAX_SIGNATURE_BYTES = 200_000;

const stripDataUrl = (value: string) => value.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

const estimateSignatureBytes = (value: string) => {
  const normalized = stripDataUrl(value || "");
  return Math.floor((normalized.length * 3) / 4);
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(new Error("Failed to read signature file."));
    reader.readAsDataURL(file);
  });

type DeliveryResponse = {
  message?: string;
  error?: string;
  pdf?: string;
  steps?: string[];
};

export default function SignatureCapture() {
  const [project, setProject] = useState("");
  const [signDate, setSignDate] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<DeliveryResponse | null>(null);
  const [steps, setSteps] = useState<string[]>([]);

  const signatureBytes = useMemo(() => estimateSignatureBytes(signatureData), [signatureData]);

  const submit = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    if (!API_BASE) {
      setLoading(false);
      setError("API base is not configured. Set NEXT_PUBLIC_API_BASE.");
      return;
    }

    if (!project.trim() || !workerName.trim() || !signatureData) {
      setLoading(false);
      setError("Project, worker name, and signature are required.");
      return;
    }

    if (signatureBytes > MAX_SIGNATURE_BYTES) {
      setLoading(false);
      setError("Signature exceeds maximum allowed size.");
      return;
    }

    const payload = {
      project: project.trim(),
      signDate: signDate || undefined,
      workers: [{ name: workerName.trim(), signature: signatureData }],
    };

    try {
      const res = await fetch(`${API_BASE}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as DeliveryResponse;
      setSteps(body.steps || []);
      if (!res.ok) {
        setError(body.error || "Failed to capture signatures.");
        return;
      }
      setResponse(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected failure.");
    } finally {
      setLoading(false);
    }
  }, [project, workerName, signatureData, signDate, signatureBytes]);

  const onFileChange = useCallback(async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setSignatureData(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read signature file.");
    }
  }, []);

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Daily Sign-in</p>
        <h1 className="text-3xl font-semibold">Capture Signatures</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Collect worker signatures for the project site. Data is sent to the backend API to create a PDF record.
        </p>
      </header>

      {error && (
        <div className="border border-amber-400 bg-amber-50 text-amber-800 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="mt-0.5" size={18} />
          <div className="space-y-1">
            <div className="font-semibold text-sm">Submission Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      <section className="grid lg:grid-cols-[1.5fr,1fr] gap-6 items-start">
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <FileSignature size={18} />
            Sign-in Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Project</span>
              <input
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-slate-900"
                placeholder="Site A"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Sign Date (optional)</span>
              <input
                type="date"
                value={signDate}
                onChange={(e) => setSignDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-slate-900"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-slate-600">Worker Name</span>
              <input
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-slate-900"
                placeholder="Jane Worker"
              />
            </label>
          </div>

          <label className="border border-dashed border-slate-400 rounded-xl p-5 bg-slate-50 flex items-center justify-between cursor-pointer hover:border-slate-600">
            <div className="flex items-center gap-3">
              <UploadCloud size={22} className="text-slate-700" />
              <div>
                <div className="font-semibold text-slate-800">Upload signature</div>
                <div className="text-sm text-slate-600">
                  PNG uploads are converted to base64. Maximum size: {MAX_SIGNATURE_BYTES.toLocaleString()} bytes.
                </div>
              </div>
            </div>
            <input
              type="file"
              accept="image/png"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileChange(file);
              }}
            />
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Drag or Click</span>
          </label>

          {signatureData && (
            <div className="text-xs text-slate-600">
              Estimated size: {signatureBytes.toLocaleString()} bytes
              {signatureBytes > MAX_SIGNATURE_BYTES && <span className="text-red-600 ml-1">(too large)</span>}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            <Send size={16} />
            {loading ? "Submitting…" : "Submit to Backend"}
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Submission Response</div>
            <div className="text-xs text-slate-500 uppercase tracking-[0.2em]">Backend</div>
          </div>
          {response ? (
            <div className="space-y-2 text-sm text-slate-700">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs uppercase text-slate-500 mb-1">Message</div>
                <div className="font-semibold">{response.message || "Success"}</div>
              </div>
              {response.pdf && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs uppercase text-slate-500 mb-1">PDF</div>
                  <div className="font-mono text-xs break-all">{response.pdf}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-600">Awaiting submission.</div>
          )}

          <div className="p-3 rounded-lg bg-slate-900 text-white text-sm min-h-[96px]">
            <div className="text-xs uppercase text-slate-300 mb-1">Steps</div>
            {steps.length ? (
              <ol className="list-decimal list-inside space-y-1 text-slate-100">
                {steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : (
              <div className="text-slate-200">No recorded steps yet.</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
