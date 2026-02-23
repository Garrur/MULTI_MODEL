"use client";
import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/live-feed";

interface Detection {
  track_id: number; bbox: number[]; score: number; assigned_person_id: string;
  is_new_person: boolean;
  attributes?: { gender?: string; color?: string; age_group?: string };
  reid_matches?: { similarity: number }[];
}
interface FrameResult {
  camera_id: string; frame_id: number; person_count: number; persons: Detection[];
  fps: number; latency: { total_ms: number; detection_ms: number; tracking_ms: number };
}

export default function LivePage() {
  const [connected, setConnected] = useState(false);
  const [result, setResult] = useState<FrameResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState("CAM-ALPHA");
  const [frameCount, setFrameCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true); setError(null);
        intervalRef.current = setInterval(() => captureAndSend(ws), 200);
      };
      ws.onmessage = (e) => {
        const d = JSON.parse(e.data);
        setResult(d); setFrameCount((c) => c + 1); drawDetections(d);
      };
      ws.onerror = () => setError("CONNECTION_FAILED — Is backend active?");
      ws.onclose = () => { setConnected(false); cleanup(); };
    } catch { setError("ERR_CAMERA_ACCESS_DENIED"); }
  };

  const captureAndSend = (ws: WebSocket) => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || ws.readyState !== WebSocket.OPEN) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    ctx.drawImage(v, 0, 0);
    ctx.fillStyle = "rgba(0,10,20,0.1)"; ctx.fillRect(0, 0, c.width, c.height);
    ws.send(JSON.stringify({ camera_id: cameraId, image_b64: c.toDataURL("image/jpeg", 0.7).split(",")[1], run_attributes: true, run_reid: true }));
  };

  const drawDetections = (data: FrameResult) => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const v = videoRef.current;
    if (v) ctx.drawImage(v, 0, 0, c.width, c.height);

    // Cinematic color grade
    ctx.fillStyle = "rgba(0,15,30,0.18)"; ctx.fillRect(0, 0, c.width, c.height);

    for (const p of data.persons) {
      const [x1, y1, x2, y2] = p.bbox;
      const isAlert = !p.is_new_person && (p.reid_matches?.[0]?.similarity || 0) > 0.85;
      const cyan = "#00E5FF", red = "#FF1744", amber = "#FFB300";
      const col = isAlert ? red : p.is_new_person ? amber : cyan;

      // Outer faint box
      ctx.strokeStyle = col.replace(")", ", 0.2)").replace("rgb", "rgba");
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.setLineDash([]);

      // Corner brackets
      const len = 14;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + len); ctx.lineTo(x1, y1); ctx.lineTo(x1 + len, y1);
      ctx.moveTo(x2 - len, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + len);
      ctx.moveTo(x1, y2 - len); ctx.lineTo(x1, y2); ctx.lineTo(x1 + len, y2);
      ctx.moveTo(x2 - len, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - len);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = col;
      ctx.fillRect(x1, y1 - 16, 130, 16);
      ctx.fillStyle = "#000";
      ctx.font = "bold 10px 'Share Tech Mono', monospace";
      ctx.fillText(`TRK-${p.track_id}  ${(p.score * 100).toFixed(0)}%  ${isAlert ? "MATCH" : p.is_new_person ? "NEW" : "TRACK"}`, x1 + 3, y1 - 4);
    }
  };

  const cleanup = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current = null;
  };
  const disconnect = () => { wsRef.current?.close(); cleanup(); setConnected(false); setResult(null); };
  useEffect(() => () => cleanup(), []);

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)", margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            VISUAL <span style={{ color: "var(--cyan)", textShadow: "var(--glow-cyan)" }}>FEED</span>
          </h1>
          <p className="font-mono" style={{ fontSize: "0.65rem", marginTop: "0.35rem", color: "var(--text-dim)", letterSpacing: "0.15em" }}>
            // OPTICAL_SENSOR_ARRAY — REALTIME INFERENCE
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            type="text" value={cameraId} onChange={(e) => setCameraId(e.target.value)}
            className="holo-input" placeholder="SOURCE_ID"
            style={{ width: 130, fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
          />
          {!connected ? (
            <button onClick={connect} className="holo-btn">INITIALIZE_LINK</button>
          ) : (
            <button onClick={disconnect} className="holo-btn holo-btn-danger">SEVER_CONNECTION</button>
          )}
        </div>
      </div>

      {error && (
        <div className="holo-panel" style={{ padding: "0.75rem 1rem", border: "var(--border-alert)", marginBottom: "1rem", color: "var(--alert-red)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "1rem" }}>
        {/* Main viewport */}
        <div className="holo-panel holo-corners">
          {/* HUD bar */}
          <div
            className="font-mono"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 1rem", borderBottom: "var(--border-holo)", background: "rgba(0,229,255,0.02)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div className={`status-dot ${connected ? "status-dot-active" : "status-dot-offline"}`} />
              <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
                {cameraId} // RAW_FEED
              </span>
            </div>
            {result && (
              <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.65rem" }}>
                <span><span style={{ color: "var(--text-dim)" }}>FPS: </span><span style={{ color: "var(--alert-amber)" }}>{result.fps}</span></span>
                <span><span style={{ color: "var(--text-dim)" }}>LAT: </span><span style={{ color: "var(--cyan)" }}>{result.latency.total_ms.toFixed(0)}ms</span></span>
                <span><span style={{ color: "var(--text-dim)" }}>TGT: </span><span style={{ color: "var(--text-primary)" }}>{result.person_count}</span></span>
                <span><span style={{ color: "var(--text-dim)" }}>FRMS: </span><span style={{ color: "var(--text-primary)" }}>{frameCount}</span></span>
              </div>
            )}
          </div>

          {/* Camera viewport */}
          <div className="cam-frame" style={{ aspectRatio: "16/9" }}>
            <video ref={videoRef} autoPlay muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0 }} />
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "contrast(1.08) brightness(0.92) saturate(0.85)" }} />

            {/* Scanning line */}
            <div className="cam-scan-line" />

            {/* Corner overlays */}
            <div className="cam-corner cam-corner-tl" />
            <div className="cam-corner cam-corner-tr" />
            <div className="cam-corner cam-corner-bl" />
            <div className="cam-corner cam-corner-br" />

            {/* Center crosshair */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 30, height: 30, border: "1px solid rgba(0,229,255,0.15)", borderRadius: "50%", pointerEvents: "none" }} />

            {!connected && (
              <div className="font-mono holo-cursor" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>
                AWAITING_SIGNAL_INPUT
              </div>
            )}
          </div>
        </div>

        {/* Target roster */}
        <div className="holo-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column" }}>
          <div className="holo-heading" style={{ marginBottom: "1rem" }}>Target Roster</div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {!result || result.persons.length === 0 ? (
              <p className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                NO_TARGETS_IN_FRAME
              </p>
            ) : result.persons.map((p) => {
              const isAlert = (p.reid_matches?.[0]?.similarity || 0) > 0.85 && !p.is_new_person;
              const borderCol = isAlert ? "rgba(255,23,68,0.35)" : p.is_new_person ? "rgba(255,179,0,0.3)" : "var(--cyan-dim)";
              const accentCol = isAlert ? "var(--alert-red)" : p.is_new_person ? "var(--alert-amber)" : "var(--cyan)";
              return (
                <div key={p.track_id} style={{ border: `1px solid ${borderCol}`, background: "rgba(0,229,255,0.015)", padding: "0.65rem 0.75rem", borderRadius: "2px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span className="font-mono" style={{ fontSize: "0.75rem", color: accentCol, letterSpacing: "0.04em" }}>TRK-{p.track_id}</span>
                    <span className="holo-chip" style={{ color: accentCol, borderColor: accentCol, fontSize: "0.55rem" }}>
                      {isAlert ? "MATCH" : p.is_new_person ? "NEW" : "TRACK"}
                    </span>
                  </div>
                  <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-dim)", lineHeight: 1.7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>CONF:</span><span style={{ color: "var(--text-primary)" }}>{(p.score * 100).toFixed(1)}%</span></div>
                    {p.attributes?.gender && <div style={{ display: "flex", justifyContent: "space-between" }}><span>CLASS:</span><span style={{ color: "var(--text-primary)", textTransform: "uppercase" }}>{p.attributes.gender}</span></div>}
                    {p.reid_matches?.[0] && <div style={{ display: "flex", justifyContent: "space-between" }}><span>REID:</span><span style={{ color: "var(--alert-amber)" }}>{(p.reid_matches[0].similarity * 100).toFixed(1)}%</span></div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Latency stats */}
          {result && (
            <div style={{ borderTop: "var(--border-holo)", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
              <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--text-dim)", lineHeight: 1.8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>DETECT:</span><span style={{ color: "var(--cyan)" }}>{result.latency.detection_ms.toFixed(0)}ms</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>TRACK:</span><span style={{ color: "var(--cyan)" }}>{result.latency.tracking_ms.toFixed(0)}ms</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>TOTAL:</span><span style={{ color: "var(--alert-amber)" }}>{result.latency.total_ms.toFixed(0)}ms</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
