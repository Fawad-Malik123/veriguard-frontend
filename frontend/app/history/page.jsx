"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, verdictLabel } from "../../components/Api";
import { DemoNotice, Workspace } from "../../components/Workspace";

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  useEffect(() => { api("/api/history?limit=100").then((data) => setItems(data.items)).catch((error) => setMessage(error.message)); }, []);
  return <Workspace active="/history" title="Analysis history" description="Saved reports for your account">
    <main className="space-y-5 p-5 md:p-8"><DemoNotice />
      {message && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-bold">All analyses</h2><p className="mt-1 text-xs text-slate-500">Files themselves are never retained.</p></div>
        {!items.length ? <p className="p-8 text-center text-sm text-slate-500">No reports yet, or sign in to see your saved history.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Date", "Type", "Verdict", "Confidence", "Risk", "Report"].map((header) => <th key={header} className="p-3">{header}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="whitespace-nowrap p-3">{new Date(item.created_at).toLocaleString()}</td><td className="p-3 capitalize">{item.content_type}</td><td className="p-3">{verdictLabel(item.verdict)}</td><td className="p-3">{item.confidence == null ? "Not available" : `${Math.round(item.confidence * 100)}%`}</td><td className="p-3">{Math.round((item.risk_score || 0) * 100)}%</td><td className="p-3"><Link className="font-bold text-indigo-700" href={`/analysis/${item.id}`}>Open</Link></td></tr>)}</tbody></table></div>}
      </section>
    </main>
  </Workspace>;
}
