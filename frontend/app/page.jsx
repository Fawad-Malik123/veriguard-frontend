"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileClock, Image, Music2, ShieldAlert, Video } from "lucide-react";
import { api, verdictLabel } from "../components/Api";
import { DemoNotice, StatCard, Workspace } from "../components/Workspace";

export default function DashboardPage() {
  const [summary, setSummary] = useState({});
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/api/dashboard/summary"), api("/api/dashboard/recent?limit=8")])
      .then(([data, history]) => { setSummary(data); setRecent(history.items); })
      .catch((reason) => { if (reason.status !== 401) setError(reason.message); });
  }, []);

  return <Workspace active="/" title="Dashboard" description="Evidence-aware content review at a glance">
    <main className="space-y-6 p-5 md:p-8">
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <DemoNotice />
      <section aria-label="Analysis totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total analyses" value={summary.total_analyzed} note="Saved reports" />
        <StatCard label="Text" value={summary.text_analyses} note="Text submissions" />
        <StatCard label="Images" value={summary.image_analyses} note="Image submissions" icon={Image} />
        <StatCard label="Audio / video" value={(summary.audio_analyses || 0) + (summary.video_analyses || 0)} note={`${summary.audio_analyses || 0} audio · ${summary.video_analyses || 0} video`} icon={Music2} />
        <StatCard label="Likely fake" value={summary.likely_fake} note="Needs corroborating evidence" icon={ShieldAlert} />
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Recent analyses</h2><p className="mt-1 text-xs text-slate-500">Open a report to inspect signals and limitations.</p></div><Link className="text-sm font-bold text-indigo-700" href="/history">View history →</Link></div>
        {!recent.length ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Sign in and submit content to build your analysis history.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-3">Content</th><th className="p-3">Type</th><th className="p-3">Verdict</th><th className="p-3">Risk score</th><th className="p-3">Report</th></tr></thead><tbody>{recent.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="max-w-72 truncate p-3">{item.file_name || item.content_preview || item.content_type}</td><td className="p-3 capitalize">{item.content_type}</td><td className="p-3">{verdictLabel(item.verdict)}</td><td className="p-3">{Math.round((item.risk_score || 0) * 100)}%</td><td className="p-3"><Link href={`/analysis/${item.id}`} className="font-bold text-indigo-700">Open</Link></td></tr>)}</tbody></table></div>}
      </section>
      <p className="flex items-center gap-2 text-xs text-slate-500"><FileClock size={15} />Human review and reliable-source checks are needed before sharing a conclusion. <Video size={15} /></p>
    </main>
  </Workspace>;
}
