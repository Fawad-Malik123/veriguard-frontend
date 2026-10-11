"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, FileClock, LayoutDashboard, LogOut, Settings, ShieldAlert,
  ShieldCheck, Sparkles,
} from "lucide-react";
import { api, useAiStatus } from "./Api";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze", icon: Sparkles },
  { href: "/history", label: "History", icon: FileClock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Workspace({ active, title, description, children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState("");
  const aiStatus = useAiStatus();

  useEffect(() => {
    api("/api/auth/me")
      .then((result) => setUser(result.user))
      .catch((reason) => setError(reason.message))
      .finally(() => setAuthReady(true));
  }, []);

  async function signOut() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      window.location.assign("/login");
    } catch (reason) {
      setError(reason.message);
    }
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[235px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-slate-200 bg-white p-4 md:fixed md:inset-y-0 md:w-[235px] md:border-b-0 md:border-r">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-2 py-3 font-bold text-slate-900">
          <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white"><ShieldCheck size={22} /></span>
          <span>Fake News <span className="text-indigo-600">Detector</span><small className="block text-xs font-normal text-slate-500">AI content checker</small></span>
        </Link>
        <nav aria-label="Main navigation" className="mt-5 grid grid-cols-2 gap-1 md:block">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active === href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold ${active === href ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <Icon size={17} aria-hidden="true" />{label}
            </Link>
          ))}
        </nav>
        {/* Shown only once the server confirms AI is active; hidden while loading or when it is off. */}
        {aiStatus?.ai_analysis && <div className="mt-5 rounded-xl bg-slate-950 p-4 text-white md:mt-auto">
            <p className="flex items-center gap-2 text-sm font-bold"><Sparkles size={15} className="text-emerald-400" /> AI fact-check active</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">{aiStatus.ai_model} verifies claims with live web search.</p>
        </div>}
      </aside>
      <div className="min-w-0 md:col-start-2 md:ml-0">
        <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:px-8">
          <div><h1 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h1><p className="mt-1 text-xs text-slate-500">{description}</p></div>
          <div className="flex items-center gap-3">
            <Link href="/analyze" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"><Sparkles size={15} /> Analyze</Link>
            {authReady && (user
              ? <button onClick={signOut} aria-label={`Sign out ${user.full_name}`} className="grid size-9 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700"><LogOut size={16} /></button>
              : <Link href="/login" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Sign in</Link>)}
          </div>
        </header>
        {error && <p role="alert" className="mx-5 mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 md:mx-8">{error}</p>}
        {children}
      </div>
    </div>
  );
}

export function StatCard({ label, value, note, icon: Icon = Activity }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between text-sm text-slate-500"><span>{label}</span><Icon size={18} className="text-indigo-600" /></div>
    <strong className="mt-4 block text-3xl font-extrabold text-slate-900">{value ?? 0}</strong>
    <p className="mt-1 text-xs text-slate-500">{note}</p>
  </article>;
}

/** `mode` is a saved report's analysis_mode; without it the banner follows the server's current mode. */
export function DemoNotice({ mode }) {
  const aiStatus = useAiStatus();
  if (mode ? mode === "AI Fact-Check" : aiStatus?.ai_analysis) {
    return <p className="flex gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs leading-5 text-indigo-950"><Sparkles size={17} className="shrink-0" />AI fact-check: text, links, images, audio, and video are checked by Claude against live web sources. Audio and video are transcribed locally and video is reviewed through sampled frames; voice cloning and lip-sync are not detected. Verdicts are AI-assisted judgments; review the cited sources before acting.</p>;
  }
  return <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><ShieldAlert size={17} className="shrink-0" />Demo/Mock Analysis: no calibrated truth model is active. Risk signals are not proof of falsehood, and factual confidence is not estimated.</p>;
}
