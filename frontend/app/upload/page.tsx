"use client";
import { useRef, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PersonSlim {
  track_id: number;
  bbox: number[];
  score: number;
  is_new: boolean;
  attributes: { gender?: string; color?: string; age_group?: string };
  reid_sim: number | null;
}
interface FrameEvent {
  type: "frame";
  frame_id: number;
  raw_frame: number;
  timestamp_sec: number;
  person_count: number;
  persons: PersonSlim[];
  latency_ms: number;
  progress: number;
}
interface MetaEvent {
  type: "meta";
  total_sampled: number;
  fps_native: number;
  total_frames_raw: number;
}
interface SummaryEvent {
  type: "summary";
  total_frames_processed: number;
  unique_person_count: number;
  peak_person_count: number;
  duration_sec: number;
  video_duration_sec: number;
}

type State = "idle" | "uploading" | "analyzing" | "done" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSec(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cameraId, setCameraId] = useState("VIDEO-UPLOAD");
  const [frameInterval, setFrameInterval] = useState(5);
  const [runAttribs, setRunAttribs] = useState(true);
  const [runReid, setRunReid] = useState(true);

  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0);
  const [meta, setMeta] = useState<MetaEvent | null>(null);
  const [frames, setFrames] = useState<FrameEvent[]>([]);
  const [summary, setSummary] = useState<SummaryEvent | null>(null);
  const [errMsg, setErrMsg] = useState("");

  // Timeline & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) setFile(f);
  }, []);

  // ── Analyze ──────────────────────────────────────────────────────────────────
  const analyze = async () => {
    if (!file) return;
    setState("uploading"); setProgress(0); setFrames([]); setSummary(null); setErrMsg("");

    const fd = new FormData();
    fd.append("video", file);
    fd.append("camera_id", cameraId);
    fd.append("frame_interval", String(frameInterval));
    fd.append("run_attributes", String(runAttribs));
    fd.append("run_reid", String(runReid));

    try {
      const res = await fetch(`${API}/api/v1/analyze-video`, { method: "POST", body: fd });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      setState("analyzing");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "meta")    setMeta(ev as MetaEvent);
            if (ev.type === "frame") {
              const fe = ev as FrameEvent;
              setProgress(fe.progress);
              setFrames(prev => [...prev, fe]); // Accumulate all frames for timeline
              setTimeout(() => {
                if (state !== "done" && logRef.current) {
                  logRef.current.scrollTop = logRef.current.scrollHeight;
                }
              }, 0);
            }
            if (ev.type === "summary") {
              setSummary(ev as SummaryEvent);
              setState("done");
              setProgress(100);
              if (file) setVideoUrl(URL.createObjectURL(file));
            }
            if (ev.type === "error")   { setErrMsg(ev.message); setState("error"); }
          } catch { /* ignore malformed */ }
        }
      }
      if (state === "analyzing") setState("done");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  };

  const reset = () => {
    setFile(null); setState("idle"); setProgress(0); setMeta(null);
    setFrames([]); setSummary(null); setErrMsg(""); setSearchQuery("");
    if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(null); }
  };

  // ── Timeline logic ──────────────────────────────────────────────────────────
  const matchedFrames = frames.filter(f => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return f.persons.some(p => {
      if (`trk-${p.track_id}`.includes(q)) return true;
      const attrs = p.attributes || {};
      if (attrs.gender?.toLowerCase().includes(q)) return true;
      if (attrs.color?.toLowerCase().includes(q)) return true;
      if (attrs.age_group?.toLowerCase().includes(q)) return true;
      return false;
    });
  });

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };
  const seekTo = (sec: number) => {
    if (videoRef.current) videoRef.current.currentTime = sec;
  };

  // Sync log scroll with video
  const logEntriesToRender = state === "done" ? frames : [...frames].slice(0, 200).reverse();
  if (state === "done" && videoRef.current && logRef.current) {
    const activeIdx = frames.findIndex(f => f.timestamp_sec >= currentTime);
    if (activeIdx >= 0) {
      const el = logRef.current.children[activeIdx] as HTMLElement;
      if (el) {
        logRef.current.scrollTo({ top: el.offsetTop - logRef.current.offsetTop - 50, behavior: "smooth" });
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "clamp(1.4rem,3vw,2.2rem)", margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            VIDEO <span style={{ color: "var(--cyan)", textShadow: "var(--glow-cyan)" }}>ANALYSIS</span>
          </h1>
          <p className="font-mono" style={{ fontSize: "0.65rem", marginTop: "0.35rem", color: "var(--text-dim)", letterSpacing: "0.15em" }}>
            // UPLOAD_FOOTAGE — FRAME_EXTRACTION — AI_INFERENCE
          </p>
        </div>
        {(state === "done" || state === "error") && (
          <button onClick={reset} className="holo-btn">NEW_ANALYSIS</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1rem", alignItems: "start" }}>

        {/* ── LEFT: controls ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Drop zone OR Video Player */}
          {state === "done" && videoUrl ? (
            <div className="holo-panel holo-corners" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000" }}>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  onTimeUpdate={handleTimeUpdate}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>

              {/* Forensic Timeline Scrubber */}
              <div>
                <input
                  type="text"
                  placeholder="FORENSIC SEARCH (e.g. 'TRK-2', 'red', 'female')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="holo-input"
                  style={{ width: "100%", fontSize: "0.8rem", marginBottom: "0.75rem", padding: "0.6rem 1rem", border: "1px solid var(--cyan)", background: "rgba(0,229,255,0.05)" }}
                />
                
                <div style={{ position: "relative", height: 24, background: "rgba(255,255,255,0.05)", borderRadius: 2, cursor: searchQuery ? "pointer" : "default" }}>
                  {/* Markers */}
                  {summary && meta && matchedFrames.map((f, i) => {
                    const pct = (f.timestamp_sec / summary.video_duration_sec) * 100;
                    return (
                      <div
                        key={i}
                        onClick={() => seekTo(f.timestamp_sec)}
                        style={{
                          position: "absolute",
                          left: `${pct}%`,
                          top: 0,
                          width: 2,
                          height: "100%",
                          background: "var(--alert-red)",
                          boxShadow: "0 0 8px var(--alert-red)",
                          cursor: "pointer",
                          zIndex: 10,
                        }}
                        title={`Match at ${fmtSec(f.timestamp_sec)}`}
                      />
                    );
                  })}
                  {/* Playhead */}
                  {summary && (
                    <div style={{
                      position: "absolute",
                      left: `${(currentTime / summary.video_duration_sec) * 100}%`,
                      top: -4, bottom: -4, width: 2,
                      background: "var(--cyan)",
                      boxShadow: "var(--glow-cyan)",
                      zIndex: 20,
                      pointerEvents: "none",
                      transition: "left 0.1s linear"
                    }} />
                  )}
                  {(!searchQuery || matchedFrames.length === 0) && (
                    <div className="font-mono" style={{ position: "absolute", width: "100%", textAlign: "center", top: 5, fontSize: "0.55rem", color: "var(--text-dim)", pointerEvents: "none" }}>
                      {searchQuery ? "NO_MATCHES_FOUND" : "ENTER_QUERY_TO_REVEAL_TIMELINE_MARKERS"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="holo-panel holo-corners"
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              style={{
                padding: "2rem 1.5rem",
                textAlign: "center",
                cursor: file ? "default" : "pointer",
                border: dragging ? "1px solid var(--cyan)" : file ? "1px solid rgba(0,238,255,0.35)" : "1px dashed rgba(0,238,255,0.25)",
                boxShadow: dragging ? "var(--glow-cyan)" : undefined,
                transition: "all 0.3s",
                minHeight: 160,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem",
              }}
            >
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />

              {file ? (
                <>
                  <div style={{ width: 40, height: 40, border: "1px solid var(--cyan)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "var(--cyan)", fontSize: "1.2rem" }}>▶</span>
                  </div>
                  <div>
                    <div className="font-mono" style={{ color: "var(--text-primary)", fontSize: "0.8rem", wordBreak: "break-all" }}>{file.name}</div>
                    <div className="font-mono" style={{ color: "var(--text-dim)", fontSize: "0.62rem", marginTop: "0.25rem" }}>
                      {(file.size / 1e6).toFixed(1)} MB
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); }} className="holo-btn holo-btn-danger" style={{ fontSize: "0.6rem", padding: "0.3rem 0.9rem" }}>REMOVE</button>
                </>
              ) : (
                <>
                  <div style={{ opacity: dragging ? 1 : 0.4, transition: "opacity 0.3s", fontSize: "2rem", color: "var(--cyan)" }}>⬆</div>
                  <div className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>
                    DRAG_VIDEO_HERE<br />
                    <span style={{ fontSize: "0.6rem", opacity: 0.6 }}>.mp4 .avi .mov .mkv</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Config panel */}
          <div className="holo-panel" style={{ padding: "1rem" }}>
            <div className="holo-heading" style={{ marginBottom: "0.9rem" }}>Analysis Config</div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {/* Camera ID */}
              <div>
                <label className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.1em", display: "block", marginBottom: "0.4rem" }}>SOURCE_ID</label>
                <input className="holo-input" value={cameraId} onChange={e => setCameraId(e.target.value)} style={{ fontSize: "0.8rem" }} />
              </div>

              {/* Frame interval */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <label className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>FRAME_INTERVAL</label>
                  <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--cyan)" }}>every {frameInterval}f</span>
                </div>
                <input type="range" min={1} max={30} value={frameInterval} onChange={e => setFrameInterval(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--cyan)", cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="font-mono" style={{ fontSize: "0.55rem", color: "var(--text-dim)" }}>DENSE (1)</span>
                  <span className="font-mono" style={{ fontSize: "0.55rem", color: "var(--text-dim)" }}>SPARSE (30)</span>
                </div>
              </div>

              {/* Toggles */}
              {[
                { label: "ATTRIBUTE_RECOGNITION", val: runAttribs, set: setRunAttribs },
                { label: "CROSS_CAMERA_REID",     val: runReid,    set: setRunReid },
              ].map(({ label, val, set }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="font-mono" style={{ fontSize: "0.62rem", color: "var(--text-dim)", letterSpacing: "0.08em" }}>{label}</span>
                  <div
                    onClick={() => set(!val)}
                    style={{
                      width: 36, height: 18, borderRadius: 9, cursor: "pointer",
                      background: val ? "rgba(0,238,255,0.25)" : "rgba(255,255,255,0.06)",
                      border: val ? "1px solid var(--cyan)" : "1px solid rgba(255,255,255,0.1)",
                      position: "relative", transition: "all 0.3s",
                      boxShadow: val ? "0 0 10px rgba(0,238,255,0.2)" : "none",
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 2, left: val ? 18 : 2,
                      width: 12, height: 12, borderRadius: "50%",
                      background: val ? "var(--cyan)" : "rgba(255,255,255,0.3)",
                      transition: "all 0.3s",
                      boxShadow: val ? "var(--glow-cyan)" : "none",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analyze button */}
          <button
            onClick={analyze}
            disabled={!file || state === "uploading" || state === "analyzing"}
            className="holo-btn"
            style={{
              width: "100%", padding: "0.85rem", fontSize: "0.85rem",
              letterSpacing: "0.18em",
              opacity: (!file || state === "uploading" || state === "analyzing") ? 0.4 : 1,
              cursor: (!file || state === "uploading" || state === "analyzing") ? "not-allowed" : "pointer",
            }}
          >
            {state === "uploading" ? "UPLOADING..." : state === "analyzing" ? "ANALYZING..." : "INITIALIZE_ANALYSIS"}
          </button>

          {/* Error */}
          {state === "error" && (
            <div className="holo-panel" style={{ padding: "0.75rem 1rem", border: "var(--border-alert)", color: "var(--alert-red)", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
              ⚠ {errMsg}
            </div>
          )}
        </div>

        {/* ── RIGHT: results ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Progress */}
          {(state === "uploading" || state === "analyzing" || state === "done") && (
            <div className="holo-panel" style={{ padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
                  {state === "uploading" ? "UPLOADING_PAYLOAD..." : state === "analyzing" ? `PROCESSING_FRAMES — ${progress.toFixed(1)}%` : "ANALYSIS_COMPLETE ✓"}
                </div>
                {meta && (
                  <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>
                    {meta.total_sampled} frames · {meta.fps_native.toFixed(0)} fps · {fmtSec(meta.total_frames_raw / meta.fps_native)}
                  </div>
                )}
              </div>
              <div className="holo-bar-track" style={{ height: 3 }}>
                <div className="holo-bar-fill" style={{ width: `${state === "uploading" ? 5 : progress}%` }} />
              </div>
            </div>
          )}

          {/* Summary card */}
          {summary && (
            <div className="holo-panel holo-corners" style={{ padding: "1.25rem" }}>
              <div className="holo-heading" style={{ marginBottom: "1rem" }}>Analysis Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" }}>
                {[
                  { label: "FRAMES_PROCESSED", val: summary.total_frames_processed, color: "var(--cyan)" },
                  { label: "UNIQUE_PERSONS",    val: summary.unique_person_count,    color: "var(--alert-amber)" },
                  { label: "PEAK_COUNT",         val: summary.peak_person_count,      color: summary.peak_person_count > 3 ? "var(--alert-red)" : "var(--cyan)" },
                  { label: "VIDEO_DURATION",     val: fmtSec(summary.video_duration_sec),  color: "var(--text-secondary)" },
                  { label: "ANALYSIS_TIME",      val: `${summary.duration_sec}s`,           color: "var(--text-secondary)" },
                  { label: "STATUS",             val: "COMPLETE", color: "var(--alert-green)" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 2, padding: "0.75rem" }}>
                    <div className="font-mono" style={{ fontSize: "0.55rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>{label}</div>
                    <div className="font-display" style={{ fontSize: "1.3rem", color, textShadow: `0 0 12px ${color}` }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frame log */}
          {frames.length > 0 && (
            <div className="holo-panel" style={{ padding: "1rem" }}>
              <div className="holo-heading" style={{ marginBottom: "0.75rem" }}>Frame Log</div>
              <div ref={logRef} style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.35rem", position: "relative" }}>
                {logEntriesToRender.map((f, i) => {
                  const isActive = state === "done" && Math.abs(f.timestamp_sec - currentTime) < 0.5;
                  const isMatch = state === "done" && !!searchQuery && matchedFrames.includes(f);
                  
                  return (
                    <div key={`${f.frame_id}-${i}`} style={{
                      display: "grid", gridTemplateColumns: "60px 60px 40px 1fr",
                      gap: "0.5rem", alignItems: "center",
                      padding: "0.4rem 0.6rem",
                      background: isActive ? "rgba(0,229,255,0.15)" : isMatch ? "rgba(255,0,0,0.1)" : i === 0 && state !== "done" ? "rgba(0,229,255,0.04)" : "transparent",
                      borderBottom: "1px solid rgba(0,229,255,0.05)",
                      borderLeft: isActive ? "2px solid var(--cyan)" : isMatch ? "2px solid var(--alert-red)" : "2px solid transparent",
                      animation: i === 0 && state !== "done" ? "float-up 0.3s ease both" : "none",
                      transition: "all 0.2s"
                    }}>
                      <span className="font-mono" style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>F#{f.frame_id}</span>
                      <span className="font-mono" style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>{fmtSec(f.timestamp_sec)}</span>
                      <span className="font-mono" style={{ fontSize: "0.7rem", color: f.person_count > 0 ? "var(--cyan)" : "var(--text-dim)", fontWeight: 700 }}>×{f.person_count}</span>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {f.persons.map(p => {
                          const col = p.reid_sim && p.reid_sim > 0.85 ? "var(--alert-red)" : p.is_new ? "var(--alert-amber)" : "var(--cyan)";
                          return (
                            <span key={p.track_id} className="holo-chip" style={{ color: col, borderColor: col, fontSize: "0.52rem" }}>
                              TRK-{p.track_id}
                              {p.attributes?.gender ? ` ${p.attributes.gender}` : ""}
                              {p.reid_sim ? ` ${(p.reid_sim * 100).toFixed(0)}%` : ""}
                            </span>
                          );
                        })}
                        <span className="font-mono" style={{ fontSize: "0.55rem", color: "var(--text-dim)", alignSelf: "center" }}>{f.latency_ms}ms</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Idle placeholder */}
          {state === "idle" && (
            <div className="holo-panel" style={{ padding: "3rem 2rem", textAlign: "center", opacity: 0.4 }}>
              <div className="font-mono" style={{ fontSize: "0.8rem", color: "var(--text-dim)", letterSpacing: "0.12em" }}>
                AWAITING_VIDEO_PAYLOAD<span className="holo-cursor" />
              </div>
              <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: "0.75rem", lineHeight: 2 }}>
                Upload a video to run the full AI pipeline:<br />
                Detection → Tracking → ReID → Attributes
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
