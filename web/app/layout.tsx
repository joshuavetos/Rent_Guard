import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentGuard | Automated Rent Enforcement Consistency",
  description: "Automated rent enforcement guardrails with audit-ready artifacts."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-10">{children}</div>
      </body>
    </html>
  );
}
