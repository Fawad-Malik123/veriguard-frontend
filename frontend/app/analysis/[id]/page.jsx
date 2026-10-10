"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, verdictLabel } from "../../../components/Api";
import { DemoNotice, Workspace } from "../../../components/Workspace";

export default function ReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { if (id) api(`/api/analysis/${encodeURIComponent(id)}`).then(setReport).catch((reason) => setError(reason.message)); }, [id]);
  async function remove() {
    if (!window.confirm("Delete this report and its saved metadata?")) return;
    try { await api(`/api/analysis/${encodeURIComponent(id)}`, { method: "DELETE" }); router.push("/history"); }
    catch (reason) { setError(reason.message); }
  }
  return <Workspace active="/history" title="Verification report" description="Evidence, signals, detector status, and limitations">
    <main className="mx-auto max-w-5xl space-y-5 p-5 md:p-8">{report && <DemoNotice mode={report.analysis_mode} />}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!report ? <p role="status" className="rounded-xl bg-white p-6 text-sm text-slate-500">Loading report…</p> : <article className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-widest text-indigo-700">{report.analysis_mode} · {report.content_type}</p><h2 className="mt-2 text-3xl font-extrabold">{verdictLabel(report.verdict)}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{report.explanation}</p></div><button onClick={remove} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Delete report</button></header>
        <div className="grid gap-3 sm:grid-cols-4"><Stat label="Confidence" value={report.confidence == null ? "Not available" : `${Math.round(report.confidence * 100)}%`} /><Stat label="Risk signal score" value={`${Math.round((report.risk_score || 0) * 100)}%`} /><Stat label="Evidence signals" value={report.evidence_count} /><Stat label="Analyzed" value={new Date(report.created_at).toLocaleString()} /></div>
        <p className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-950">{report.confidence_note} {report.risk_score_note}</p>
        <ReportList title="Detection signals" items={report.signals} empty="No risk-language signals were detected. This does not prove accuracy." render={(item) => <><b>{item.signal.replaceAll("_", " ")}</b><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-900">{item.severity}</span><p className="col-span-full text-sm text-slate-600">{item.description} {item.evidence && `Observed: ${item.evidence}`}</p></>} />
        {(report.ai_generated_likelihood || report.metadata?.extracted_text || report.metadata?.transcript) && <div className="grid gap-3 sm:grid-cols-2">
          {report.ai_generated_likelihood && <Stat label="AI-generated likelihood" value={report.ai_generated_likelihood} />}
          {report.metadata?.extracted_text && <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2"><span className="text-xs text-slate-500">{report.content_type === "video" ? "Text found in video frames" : "Text found in image"}</span><p className="mt-1 whitespace-pre-wrap text-sm">{report.metadata.extracted_text}</p></div>}
          {report.metadata?.transcript && <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2"><span className="text-xs text-slate-500">Speech transcript (automatic, may contain errors)</span><p className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap text-sm">{report.metadata.transcript}</p></div>}
        </div>}
        <ReportList title="Claims checked" items={report.claims} empty="No claims extracted." render={(item) => <>
          <p className="text-sm font-semibold">{item.text}</p><Badge value={item.status} />
          {item.explanation && <p className="col-span-full text-sm text-slate-600">{item.explanation}</p>}
          {item.source_urls?.length > 0 && <div className="col-span-full flex flex-wrap gap-2">{item.source_urls.map((url) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="max-w-full truncate rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:underline">{hostname(url)}</a>)}</div>}
        </>} />
        <ReportList title="Sources" items={report.sources} empty="No sources were extracted or checked." render={(item) => <>
          {item.status === "checked"
            ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-semibold text-indigo-700 hover:underline">{item.title || hostname(item.url)}</a>
            : <p className="break-all text-sm">{item.url}</p>}
          <Badge value={item.status === "checked" ? item.stance : "not checked"} />
          {item.note && <p className="col-span-full text-sm text-slate-600">{item.note}</p>}
        </>} />
        <ReportList title="Analyzer results" items={report.model_results} empty="No analyzer information." render={(item) => <><b>{item.name}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase">{item.status === "demo" ? "Demo/Mock" : item.status}</span><p className="col-span-full text-sm text-slate-600">{item.reason || item.type || "Analyzer completed."}</p></>} />
        <List title="Recommendations" items={report.recommendations} /><List title="Limitations" items={report.limitations} />
        <details><summary className="cursor-pointer text-sm font-bold">Technical metadata</summary><pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(report.metadata || {}, null, 2)}</pre></details>
      </article>}
    </main>
  </Workspace>;
}

const badgeStyles = {
  supported: "bg-emerald-100 text-emerald-800", supports: "bg-emerald-100 text-emerald-800",
  contradicted: "bg-rose-100 text-rose-800", contradicts: "bg-rose-100 text-rose-800",
  disputed: "bg-amber-100 text-amber-900",
};
function Badge({ value }) { return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${badgeStyles[value] || "bg-slate-100 text-slate-700"}`}>{value}</span>; }
function hostname(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } }
function Stat({ label, value }) { return <div className="rounded-xl bg-slate-50 p-4"><span className="text-xs text-slate-500">{label}</span><strong className="mt-1 block break-words text-sm">{value}</strong></div>; }
function ReportList({ title, items, empty, render }) { return <section><h3 className="mb-3 font-bold">{title}</h3>{items?.length ? <div className="grid gap-2">{items.map((item, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200 p-4">{render(item)}</div>)}</div> : <p className="text-sm text-slate-500">{empty}</p>}</section>; }
function List({ title, items }) { return <section><h3 className="mb-2 font-bold">{title}</h3>{items?.length ? <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="text-sm text-slate-500">None listed.</p>}</section>; }
