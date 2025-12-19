import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, ShieldCheck, Zap } from "lucide-react";

const steps = [
  {
    title: "Ingest",
    description: "Upload CSV or send JSON. RentGuard normalizes dates, history, and portfolio context instantly.",
    icon: Zap
  },
  {
    title: "Evaluate",
    description: "Rules fire deterministically with no hidden knobs. Every refusal or approval is documented.",
    icon: ShieldCheck
  },
  {
    title: "Emit",
    description: "Artifacts are generated in-memory and streamed directly to the API and dashboard.",
    icon: FileText
  }
];

const pricing = [
  { name: "Pilot", price: "$499/mo", features: ["Up to 5,000 tenants", "Email support", "In-memory artifacts"] },
  { name: "Growth", price: "$1,499/mo", features: ["Up to 50,000 tenants", "Priority support", "Compliance exports"] },
  { name: "Enterprise", price: "Talk to us", features: ["Custom SLAs", "SOC2 alignment", "Dedicated onboarding"] }
];

export default function LandingPage() {
  return (
    <main className="space-y-16">
      <section className="hero-gradient text-white rounded-3xl p-12 shadow-2xl">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <p className="badge badge-soft w-fit">Automated Rent Enforcement Consistency</p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Automated Rent Enforcement Consistency.
            </h1>
            <p className="text-lg text-slate-200 max-w-2xl">
              RentGuard applies defined rules the same way every time, emits immutable artifacts, and produces
              judge-ready packets without touching the file system.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-5 py-3 rounded-full shadow-lg hover:translate-y-[-1px] transition"
              >
                Run Demo <ArrowRight size={18} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 border border-slate-200 px-5 py-3 rounded-full text-white hover:bg-white/10"
              >
                See how it works
              </a>
            </div>
            <div className="flex items-center gap-3 text-slate-200">
              <ShieldCheck size={24} />
              <span>Permanent audit trail • Override doctrine enforced • No silent state</span>
            </div>
          </div>
          <div className="gradient-border p-1 rounded-[1.3rem]">
            <div className="bg-white/95 text-slate-900 rounded-[1.2rem] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-500">Judge Packet Preview</div>
                <div className="badge badge-soft">In-memory</div>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-500" size={18} />
                  <div>
                    <p className="font-semibold text-slate-800">System Overview</p>
                    <p>Enforcement logic, thresholds, and overrides documented in a single bundle.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-500" size={18} />
                  <div>
                    <p className="font-semibold text-slate-800">Tenant History</p>
                    <p>Objective payment history with portfolio context.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-500" size={18} />
                  <div>
                    <p className="font-semibold text-slate-800">Force Override</p>
                    <p>Recorded with actor, reason, and timestamp when humans override policy.</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-xs uppercase text-slate-500 mb-2">Live data flow</p>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Input ➜ Evaluate ➜ Emit ➜ Packet</span>
                  <span className="text-emerald-600">Serverless safe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="space-y-6">
        <div>
          <p className="badge badge-soft">How It Works</p>
          <h2 className="text-3xl font-semibold mt-2">Deterministic, explainable, and court-ready.</h2>
          <p className="text-slate-600 max-w-3xl mt-2">
            RentGuard consumes portfolio context, applies rules without deviation, and emits artifacts that can be
            streamed directly to your API clients and Judge Packets—all without saving to disk.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map(({ title, description, icon: Icon }) => (
            <div key={title} className="card bg-white rounded-2xl p-6 space-y-3 border border-slate-100">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Icon size={22} />
              </div>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="text-slate-600 text-sm">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <p className="badge badge-soft">Force Override Doctrine</p>
          <h2 className="text-3xl font-semibold">Humans can override. The record is permanent.</h2>
          <p className="text-slate-600">
            When a human chooses to override RentGuard, the system does not erase the refusal. It creates a Force
            Override artifact documenting actor, reason, and the original refusal. That liability transfer ships in
            every Judge Packet.
          </p>
          <ul className="space-y-2 text-slate-700">
            <li className="flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={18} />
              Immutable override log
            </li>
            <li className="flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={18} />
              Deterministic thresholds
            </li>
            <li className="flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={18} />
              Audit-ready exports
            </li>
          </ul>
        </div>
        <div className="card bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
          <h3 className="text-xl font-semibold">Judge Packet Delivery</h3>
          <p className="text-slate-600 text-sm">Artifacts are zipped in-memory and streamed to the client—no file system access required.</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="font-semibold">System Overview</p>
              <p className="text-slate-600">Policy, thresholds, overrides.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="font-semibold">Tenant History</p>
              <p className="text-slate-600">Dates, counts, delay windows.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="font-semibold">Refusal Artifacts</p>
              <p className="text-slate-600">Proof of consistent enforcement.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="font-semibold">Overrides</p>
              <p className="text-slate-600">Actor, reason, timestamp.</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-900 font-semibold"
          >
            Run Demo <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="badge badge-soft">Pricing</p>
            <h2 className="text-3xl font-semibold mt-2">Straightforward plans.</h2>
          </div>
          <p className="text-slate-600 max-w-xl">
            Every plan includes deterministic rule execution, artifact generation in memory, and judge-ready packets
            streamed on demand.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {pricing.map((plan) => (
            <div key={plan.name} className="card bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <span className="badge badge-strong">{plan.price}</span>
              </div>
              <ul className="space-y-2 text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-500" size={18} />
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800">
                Choose plan
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
