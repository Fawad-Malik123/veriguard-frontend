"use client";

import { useState } from "react";
import Link from "next/link";
import { api, useAiStatus, verdictLabel } from "../../components/Api";
import { DemoNotice, Workspace } from "../../components/Workspace";

const allowed = {
  image: new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]),
  audio: new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg", "audio/webm", "audio/aac"]),
  video: new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]),
};

export default function AnalyzePage() {
  const [type, setType] = useState("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const aiStatus = useAiStatus();
  const aiType = aiStatus?.ai_analysis && ["text", "link", "image"].includes(type);

  function changeType(next) { setType(next); setReport(null); setMessage(""); }
  function chooseFile(next) {
    if (!next) { setFile(null); return; }
    if (!allowed[type].has(next.type)) { setFile(null); setMessage(`Unsupported ${type} format.`); return; }
    if (next.size > 10 * 1024 * 1024) { setFile(null); setMessage("Choose a file no larger than 10 MB."); return; }
    setFile(next); setMessage("");
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setMessage(""); setReport(null);
    try {
      let result;
      if (type === "text") result = await api("/api/analyze/text", { method: "POST", body: JSON.stringify({ text }) });
      else if (type === "link") result = await api("/api/analysis/link", { method: "POST", body: JSON.stringify({ url }) });
      else {
        if (!file) throw new Error(`Choose a ${type} file first.`);
        const form = new FormData(); form.set("file", file);
        result = await api(`/api/analyze/${type}`, { method: "POST", body: form });
      }
      setReport(result);
    } catch (reason) { setMessage(reason.message); }
    finally { setBusy(false); }
  }

  function clear() { setText(""); setUrl(""); setFile(null); setReport(null); setMessage(""); }

  return <Workspace active="/analyze" title="Analyze content" description="Submit text, links, or media for verification">
    <main className="mx-auto max-w-4xl space-y-5 p-5 md:p-8">
      <DemoNotice />
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div role="tablist" aria-label="Content type" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {["text", "image", "audio", "video", "link"].map((name) => <button type="button" role="tab" aria-selected={type === name} key={name} onClick={() => changeType(name)} className={`rounded-lg px-3 py-2.5 text-sm font-bold capitalize ${type === name ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{name}</button>)}
        </div>
        {type === "text" && <label className="block space-y-2 text-sm font-bold">Text to review<textarea required maxLength={20000} rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a claim, article, or post for a preliminary review." className="w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>}
        {type === "link" && <label className="block space-y-2 text-sm font-bold">Public URL<input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.org/article" className="w-full rounded-xl border border-slate-300 p-3 font-normal" /><span className="block text-xs font-normal text-slate-500">{aiStatus?.ai_analysis ? "The page is fetched and its claims checked against other sources." : "URLs are saved for your report but are not fetched or checked."}</span></label>}
        {["image", "audio", "video"].includes(type) && <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center"><span className="font-bold text-slate-800">{file ? file.name : `Choose ${type} file`}</span><span className="text-xs text-slate-500">Maximum 10 MB · file bytes are processed in memory and not retained</span><input className="sr-only" type="file" accept={type === "image" ? "image/png,image/jpeg,image/webp,image/gif" : `${type}/*`} onChange={(e) => chooseFile(e.target.files?.[0])} /></label>}
        {message && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
        {busy && <div role="status" className="flex items-center gap-3 text-sm text-indigo-700"><span className="size-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-700" />{aiType ? "Claude is reading the content and searching the web for evidence. This usually takes 30–120 seconds…" : "Analyzing available signals…"}</div>}
        <div className="flex justify-end gap-3"><button type="button" onClick={clear} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Clear</button><button disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">Analyze</button></div>
      </form>
      {report && <section aria-live="polite" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">{report.analysis_mode}</p><h2 className="mt-2 text-2xl font-extrabold">{verdictLabel(report.verdict)}</h2><p className="mt-2 text-sm text-slate-600">{report.explanation}</p></div><Link href={`/analysis/${report.analysis_id}`} className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">Open full report</Link></div>
        <div className="grid gap-3 sm:grid-cols-3"><Score label="Confidence" value={report.confidence == null ? "Not available" : `${Math.round(report.confidence * 100)}%`} /><Score label="Risk signal score" value={`${Math.round(report.risk_score * 100)}%`} /><Score label="Evidence signals" value={report.evidence_count} /></div>
        <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">{report.confidence_note} {report.risk_score_note}</p>
      </section>}
    </main>
  </Workspace>;
}

function Score({ label, value }) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><strong className="mt-1 block text-lg">{value}</strong></div>; }
