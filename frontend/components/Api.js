import { useEffect, useState } from "react";

let statusPromise;

/** Returns { ai_analysis, ai_model } from /api/health, or null while loading. */
export function useAiStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    statusPromise ||= fetch("/api/health").then((r) => r.json()).catch(() => ({ ai_analysis: false }));
    statusPromise.then(setStatus);
  }, []);
  return status;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// 502/503/504 usually mean the backend (a free Render instance) is still waking up.
const GATEWAY_ERRORS = new Set([502, 503, 504]);

export async function api(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  // Only retry GETs automatically; retrying a POST could create duplicate analyses/accounts.
  const maxAttempts = method === "GET" ? 6 : 1;
  let response;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await fetch(path, {
        credentials: "same-origin",
        ...options,
        headers: {
          ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          ...options.headers,
        },
      });
    } catch {
      throw new Error("Cannot reach the Fake News Detector API. Check your connection and try again.");
    }
    if (!GATEWAY_ERRORS.has(response.status) || attempt === maxAttempts) break;
    await sleep(5000);
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
