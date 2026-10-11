"use client";

import { useEffect, useState } from "react";
import { api } from "../../components/Api";
import { PasswordInput } from "../../components/AuthForm";
import { DemoNotice, Workspace } from "../../components/Workspace";

const defaults = {
  theme: "system",
  notifications_enabled: false,
  retain_upload_metadata: true,
};

export default function SettingsPage() {
  const [application, setApplication] = useState(defaults);
  const [verification, setVerification] = useState({
    require_evidence: true,
    human_review_warning3: true,
    store_audit_trail: true,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    api("/api/settings").then((data) => {
      setApplication(data.application || defaults);
      setVerification(data.verification);
    }).catch((error) => setMessage(error.message));
  }, []);

  async function saveApplication(event) {
    event.preventDefault();
    try {
      const result = await api("/api/settings/application", { method: "PATCH", body: JSON.stringify(application) });
      setApplication(result.application);
      setMessage("Application and privacy preferences saved.");
    } catch (error) { setMessage(error.message); }
  }
  async function saveVerification(event) {
    event.preventDefault();
    try {
      const result = await api("/api/settings/verification", { method: "PATCH", body: JSON.stringify(verification) });
      setVerification(result.verification);
      setMessage("Verification preferences saved.");
    } catch (error) { setMessage(error.message); }
  }

  return <Workspace active="/settings" title="Settings" description="Model status, application preferences, and privacy">
    <main className="space-y-5 p-5 md:p-8"><DemoNotice />
      {message && <p role="status" className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">{message}</p>}
      <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={saveApplication} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Application &amp; privacy</h2>
          <label className="block text-sm font-semibold">Theme<select value={application.theme} onChange={(e) => setApplication({ ...application, theme: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 p-3"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
          <Toggle label="In-app notifications" checked={application.notifications_enabled} onChange={(value) => setApplication({ ...application, notifications_enabled: value })} />
          <Toggle label="Retain upload metadata" description="File name, type, size, checksum and extracted metadata are stored with a report. Uploaded file bytes are never retained." checked={application.retain_upload_metadata} onChange={(value) => setApplication({ ...application, retain_upload_metadata: value })} />
          <button className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Save application settings</button>
        </form>
        <form onSubmit={saveVerification} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Verification preferences</h2>
          <Toggle label="Require evidence" checked={verification.require_evidence} onChange={(value) => setVerification({ ...verification, require_evidence: value })} />
          <Toggle label="Require human review for escalations" checked={verification.human_review_warning3} onChange={(value) => setVerification({ ...verification, human_review_warning3: value })} />
          <Toggle label="Store audit trail" checked={verification.store_audit_trail} onChange={(value) => setVerification({ ...verification, store_audit_trail: value })} />
          <button className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Save verification settings</button>
        </form>
        <ChangePassword />
        <section className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm xl:col-span-2">
          <h2 className="font-bold">Browser extension · Feed filter</h2>
          <p className="text-sm leading-6 text-slate-600">Sign in to the extension with this account and it hides posts and videos on YouTube, Instagram, Facebook and X (also Reddit and LinkedIn) that the AI judges fake, plus anything the platform itself labels as AI-made (&quot;AI info&quot;, &quot;Made with AI&quot;, &quot;Altered or synthetic content&quot;).</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white p-4">
              <h3 className="text-sm font-bold">Computer · Chrome or Edge</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
                <li>Download the extension and unzip it.</li>
                <li>Open <code className="rounded bg-slate-100 px-1">chrome://extensions</code> (or <code className="rounded bg-slate-100 px-1">edge://extensions</code>) and turn on <b>Developer mode</b>.</li>
                <li>Click <b>Load unpacked</b> and choose the unzipped <code className="rounded bg-slate-100 px-1">fake-news-detector-extension</code> folder.</li>
                <li>Click the extension icon and sign in with your email/phone and password.</li>
              </ol>
            </div>
            <div className="rounded-xl bg-white p-4">
              <h3 className="text-sm font-bold">Phone · Firefox for Android</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
                <li>Firefox only installs signed add-ons: upload the .zip once at <a className="font-semibold text-indigo-700" href="https://addons.mozilla.org/developers/addon/submit/distribution" target="_blank" rel="noreferrer">addons.mozilla.org</a> as <b>&quot;On your own&quot;</b> (free) and download the signed .xpi.</li>
                <li>In Firefox: Settings → About Firefox → tap the logo 5 times.</li>
                <li>Back in Settings choose <b>Install add-on from file</b> and pick the .xpi.</li>
                <li>Open the add-on, tap <b>Allow on social sites</b>, then sign in.</li>
              </ol>
            </div>
          </div>
          <a href="/fake-news-detector-extension.zip" download className="inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Download extension (.zip)</a>
          <p className="text-xs leading-5 text-slate-500">Works in the browser versions of these sites, not inside the Instagram, YouTube, Facebook or X phone apps (no app allows that). Videos are judged from their title, caption and the platform&apos;s AI labels, not by analysing the frames. If the AI provider is unavailable only platform-labeled AI content is hidden.</p>
        </section>
      </div>
    </main>
  </Workspace>;
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState({ ok: false, text: "" });

  async function submit(event) {
    event.preventDefault();
    if (next !== confirm) { setResult({ ok: false, text: "The new passwords do not match." }); return; }
    setBusy(true); setResult({ ok: false, text: "" });
    try {
      const data = await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password: current, new_password: next }) });
      setCurrent(""); setNext(""); setConfirm("");
      setResult({ ok: true, text: data.message });
    } catch (error) { setResult({ ok: false, text: error.message }); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
    <div><h2 className="font-bold">Change password</h2><p className="mt-1 text-xs leading-5 text-slate-500">At least 8 characters. Other devices and the browser extension are signed out afterwards.</p></div>
    <div className="grid gap-4 md:grid-cols-3">
      <label className="block text-sm font-semibold">Current password<PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></label>
      <label className="block text-sm font-semibold">New password<PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></label>
      <label className="block text-sm font-semibold">Confirm new password<PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></label>
    </div>
    {result.text && <p role="status" className={`rounded-lg p-3 text-sm ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{result.text}</p>}
    <button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Change password"}</button>
  </form>;
}

function Toggle({ label, description, checked, onChange }) {
  return <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-4"><span><b className="text-sm">{label}</b>{description && <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-5 accent-indigo-600" /></label>;
}
