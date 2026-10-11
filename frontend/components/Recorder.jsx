"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, RotateCcw, Square, Video } from "lucide-react";

const MAX_BYTES = 10 * 1024 * 1024;
const LIMITS = { audio: { seconds: 300, label: "5 minutes" }, video: { seconds: 60, label: "60 seconds" } };

function pickMime(kind) {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  const options = kind === "video"
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

// Build a File whose name and MIME type match what the server accepts (no ";codecs=" suffix).
function toFile(kind, chunks, mime) {
  const base = (mime || (kind === "video" ? "video/webm" : "audio/webm")).split(";")[0];
  const ext = base.includes("mp4") ? (kind === "video" ? "mp4" : "m4a") : base.includes("ogg") ? "ogg" : "webm";
  return new File(chunks, `recording.${ext}`, { type: base });
}

function clock(total) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function permissionMessage(error, kind) {
  const device = kind === "video" ? "camera and microphone" : "microphone";
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") return `Permission to use the ${device} was blocked. Allow it from the lock icon in the address bar, then try again.`;
  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") return `No ${device} was found on this device.`;
  if (error?.name === "NotReadableError") return `The ${device} is being used by another app. Close it and try again.`;
  return `Could not start the ${device}. ${error?.message || ""}`.trim();
}

/** Record audio (microphone) or video (camera + microphone) in the browser and hand back a File. */
export function Recorder({ kind, onFile, onError }) {
  const [status, setStatus] = useState("idle"); // idle | recording | done
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [size, setSize] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const bytesRef = useRef(0);
  const timerRef = useRef(null);
  const liveRef = useRef(null);
  const urlRef = useRef("");
  const limit = LIMITS[kind];

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    clearInterval(timerRef.current);
  }

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") { recorder.onstop = null; try { recorder.stop(); } catch {} }
    releaseStream();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  useEffect(() => {
    if (status === "recording" && kind === "video" && liveRef.current && streamRef.current) {
      liveRef.current.srcObject = streamRef.current;
    }
  }, [status, kind]);

  async function start() {
    onError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("This browser cannot record from the " + (kind === "video" ? "camera" : "microphone") + ". Use the latest Chrome, Edge, Firefox or Safari, or upload a file instead.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(kind === "video" ? { video: { facingMode: "user" }, audio: true } : { audio: true });
    } catch (error) { onError(permissionMessage(error, kind)); return; }

    const mimeType = pickMime(kind);
    const options = { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000, ...(kind === "video" ? { videoBitsPerSecond: 800000 } : {}) };
    let recorder;
    try { recorder = new MediaRecorder(stream, options); } catch { recorder = new MediaRecorder(stream); }

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    bytesRef.current = 0;
    recorder.ondataavailable = (event) => {
      if (!event.data?.size) return;
      chunksRef.current.push(event.data);
      bytesRef.current += event.data.size;
      if (bytesRef.current > MAX_BYTES * 0.92 && recorder.state === "recording") recorder.stop();
    };
    recorder.onerror = () => { onError("Recording failed. Please try again."); releaseStream(); setStatus("idle"); };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType;
      releaseStream();
      const file = toFile(kind, chunksRef.current, type);
      if (!file.size) { onError("Nothing was recorded. Please try again."); setStatus("idle"); return; }
      if (file.size > MAX_BYTES) { onError("The recording is larger than 10 MB. Record a shorter clip."); setStatus("idle"); return; }
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      setPreviewUrl(url); setSize(file.size); setStatus("done");
      onFile(file);
    };

    setSeconds(0); setStatus("recording");
    recorder.start(1000);
    timerRef.current = setInterval(() => {
      setSeconds((value) => {
        if (value + 1 >= limit.seconds && recorder.state === "recording") recorder.stop();
        return value + 1;
      });
    }, 1000);
  }

  function stop() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }

  function retake() {
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = ""; }
    setPreviewUrl(""); setSize(0); setSeconds(0); setStatus("idle");
    onFile(null);
  }

  const Icon = kind === "video" ? Video : Mic;
  const noun = kind === "video" ? "video" : "audio";

  return <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
    {status === "idle" && <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={start} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"><Icon size={16} /> Record {noun}</button>
      <span className="text-xs text-slate-500">{kind === "video" ? "Uses your camera and microphone." : "Uses your microphone."} Up to {limit.label}. The recording stays on this device until you press Analyze.</span>
    </div>}
    {status === "recording" && <div className="space-y-3">
      {kind === "video" && <video ref={liveRef} autoPlay muted playsInline className="aspect-video w-full max-w-md rounded-xl bg-black" />}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm font-bold text-rose-600"><span className="size-2.5 animate-pulse rounded-full bg-rose-600" /> Recording {clock(seconds)} <span className="font-normal text-slate-500">/ {clock(limit.seconds)}</span></span>
        <button type="button" onClick={stop} className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"><Square size={14} /> Stop</button>
      </div>
    </div>}
    {status === "done" && <div className="space-y-3">
      {kind === "video"
        ? <video src={previewUrl} controls playsInline className="aspect-video w-full max-w-md rounded-xl bg-black" />
        : <audio src={previewUrl} controls className="w-full max-w-md" />}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-600">Recorded {clock(seconds)} · {(size / 1024 / 1024).toFixed(1)} MB. Press Analyze to check it.</span>
        <button type="button" onClick={retake} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"><RotateCcw size={14} /> Record again</button>
      </div>
    </div>}
  </div>;
}

const LANGUAGES = [["en-IN", "English (India)"], ["hi-IN", "हिन्दी (Hindi)"], ["en-US", "English (US)"], ["en-GB", "English (UK)"]];

/** Voice typing for the text box using the browser's built-in speech recognition. */
export function DictationButton({ onAppend, onError }) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState("en-IN");
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => { try { recognitionRef.current?.abort(); } catch {} };
  }, []);

  function start() {
    onError("");
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let spoken = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) spoken += event.results[i][0].transcript + " ";
      }
      if (spoken.trim()) onAppend(spoken.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") onError("Microphone permission was blocked. Allow it from the lock icon in the address bar, then try again.");
      else if (event.error === "audio-capture") onError("No microphone was found on this device.");
      else if (event.error === "network") onError("Voice typing needs an internet connection.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); } catch { setListening(false); }
  }

  function stop() { try { recognitionRef.current?.stop(); } catch {} setListening(false); }

  if (!supported) return <p className="text-xs text-slate-500">Voice typing is not available in this browser. Use Chrome, Edge or Safari, or record an audio clip in the Audio tab.</p>;

  return <div className="flex flex-wrap items-center gap-3">
    {listening
      ? <button type="button" onClick={stop} className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"><Square size={14} /> Stop voice typing</button>
      : <button type="button" onClick={start} className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100"><Mic size={16} /> Speak instead of typing</button>}
    <label className="flex items-center gap-2 text-xs text-slate-600">Language
      <select value={lang} disabled={listening} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
        {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
    </label>
    {listening && <span className="flex items-center gap-2 text-xs font-bold text-rose-600"><span className="size-2 animate-pulse rounded-full bg-rose-600" /> Listening… your words are added to the box</span>}
  </div>;
}
