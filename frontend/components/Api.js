import { useEffect, useState } from "react";

let statusPromise;

/** Returns { ai_analysis, ai_model, ai_provider } from /api/health, or null while loading. */
export function useAiStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    statusPromise ||= api("/api/health").catch(() => {
      statusPromise = null; // don't cache a failure while the backend is still waking up
      return { ai_analysis: false };
    });
    statusPromise.then(setStatus);
  }, []);
  return status;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// 502/503/504 usually mean the backend (a free Render instance) is asleep or still waking up.
const GATEWAY_ERRORS = new Set([502, 503, 504]);
const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_VERIGUARD_API_ORIGIN || "").replace(/\/+$/, "");
let lastWake = 0;

/**
 * Render only wakes a sleeping free instance for requests sent to its own URL; requests relayed
 * through the Next.js /api proxy get a 502 instead. So the browser pings the backend directly
 * (no-cors: the response is opaque and no cookies are sent) as soon as the app loads.
 */
export function wakeBackend() {
  if (typeof window === "undefined" || !/^https:\/\//.test(BACKEND_ORIGIN)) return;
  const now = Date.now();
  if (now - lastWake < 15_000) return;
  lastWake = now;
  fetch(`${BACKEND_ORIGIN}/api/health`, { mode: "no-cors", cache: "no-store", credentials: "omit" }).catch(() => {});
}
wakeBackend();

async function waitUntilAwake(deadline) {
  while (Date.now() < deadline) {
    wakeBackend();
    try {
      const health = await fetch("/api/health", { cache: "no-store" });
      if (health.ok) return true;
    } catch { /* keep waiting */ }
    await sleep(4000);
  }
  return false;
}

export async function api(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const request = () => fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  let response;
  try {
    response = await request();
    if (GATEWAY_ERRORS.has(response.status)) {
      // A sleeping backend never received the request, so it is safe to send it again once awake.
      // (504 on a POST may mean the server is still working on it: never resend those.)
      const resend = method === "GET" || response.status !== 504;
      if (resend && await waitUntilAwake(Date.now() + 90_000)) response = await request();
    }
  } catch {
    throw new Error("Cannot reach the Fake News Detector API. Check your connection and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    let message = Array.isArray(detail) ? detail.map((issue) => issue.msg).join(" ") : detail;
    if (!message && GATEWAY_ERRORS.has(response.status)) {
      message = "The analysis server is starting up or unavailable. Wait about a minute and try again.";
    }
    const error = new Error(message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export function verdictLabel(verdict) {
  return ({ likely_real: "Likely Real", likely_fake: "Likely Fake", uncertain: "Uncertain" })[verdict] || "Uncertain";
}
