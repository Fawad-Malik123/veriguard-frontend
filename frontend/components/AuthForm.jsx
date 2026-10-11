"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { api } from "./Api";

const details = {
  login: { title: "Welcome back", button: "Sign in" },
  register: { title: "Create your account", button: "Create account" },
  forgot: { title: "Reset your password", button: "Request reset" },
};

export function PasswordInput({ value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return <span className="relative mt-1 block">
    <input required minLength={8} type={visible ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} className="w-full rounded-lg border border-slate-300 p-3 pr-12 font-normal" />
    <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"} title={visible ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 hover:text-slate-800">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
  </span>;
}

export function AuthForm({ mode }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [identity, setIdentity] = useState("");
  const [fullName, setFullName] = useState("");

  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode === "forgot" && resetToken) {
        await api("/api/auth/password-reset/confirm", {
          method: "POST", body: JSON.stringify({ token: resetToken, new_password: password }),
        });
        setMessage("Password updated. You can now sign in.");
        setResetToken("");
      } else if (mode === "forgot") {
        const result = await api("/api/auth/password-reset/request", {
          method: "POST", body: JSON.stringify({ identity }),
        });
        if (result.development_only_reset_token) setResetToken(result.development_only_reset_token);
        setMessage(result.message);
      } else {
        const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
        const body = mode === "login"
          ? { identity, password }
          : { full_name: fullName, identity, password };
        await api(endpoint, { method: "POST", body: JSON.stringify(body) });
        window.location.assign("/");
      }
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return <main className="grid min-h-screen place-items-center bg-slate-100 p-5">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
      <Link href="/" className="mb-7 flex items-center gap-3 font-extrabold text-slate-900"><span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white"><ShieldCheck /></span>Fake News Detector</Link>
      <h1 className="text-2xl font-extrabold">{details[mode].title}</h1>
      <p className="mt-2 text-sm text-slate-500">Sign in with an email address or phone number.</p>
      {mode === "forgot" && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Reset emails and SMS are not set up on this site yet. If you are still signed in somewhere, change your password in <b>Settings → Change password</b>. Otherwise ask the site owner to reset it.</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "register" && <label className="block text-sm font-semibold">Full name<input required maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>}
        <label className="block text-sm font-semibold">Email or phone number<input required value={identity} onChange={(e) => setIdentity(e.target.value)} autoComplete="username" className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>
        {mode !== "forgot" && <label className="block text-sm font-semibold">Password<PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}
        {mode === "forgot" && resetToken && <><label className="block text-sm font-semibold">Development reset token<input value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label><label className="block text-sm font-semibold">New password<PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label></>}
        <button disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Please wait…" : details[mode].button}</button>
      </form>
      {message && <p role="status" className="mt-4 break-words rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">{message}</p>}
      <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-indigo-700">
        {mode !== "login" && <Link href="/login">Sign in</Link>}
        {mode !== "register" && <Link href="/create-account">Create account</Link>}
        {mode !== "forgot" && <Link href="/forgot-password">Forgot password?</Link>}
      </div>
    </section>
  </main>;
}
