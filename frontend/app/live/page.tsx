"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Types ---
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

// --- Camera Node Component ---
function CameraNode({ 
  cameraId, 
}: { 
  cameraId: string, 
}) {
  const [source, setSource] = useState("");
  const [active, setActive] = useState(false);

  // Check on mount if streams are active (for persistence across navigation)
  useEffect(() => {
    fetch(`${API}/api/v1/streams/`)
      .then(res => res.json())
      .then(data => {
        if (data.streams?.includes(cameraId)) setActive(true);
      }).catch(e => console.error(e));
  }, [cameraId]);

  const connect = async () => {
    if (!source.trim()) return;
    try {
      await fetch(`${API}/api/v1/streams/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_id: cameraId, source })
      });
      setActive(true);
    } catch (e) { console.error(e); }
  };

  const disconnect = async () => {
    try {
      await fetch(`${API}/api/v1/streams/${cameraId}`, { method: "DELETE" });
      setActive(false);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="holo-panel holo-corners" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Node Header */}
      <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.8rem", borderBottom: "var(--border-holo)", background: "rgba(0,229,255,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className={`status-dot ${active ? "status-dot-active" : "status-dot-offline"}`} />
          <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
            {cameraId} // M-JPEG_FEED
          </span>
        </div>
        {active ? (
          <button onClick={disconnect} style={{ background: "none", border: "none", color: "var(--alert-red)", fontSize: "0.55rem", cursor: "pointer", letterSpacing: "0.1em" }} className="holo-cursor">DISCONNECT</button>
        ) : null}
      </div>

      {/* Node Body */}
      <div className="cam-frame" style={{ flex: 1, position: "relative", minHeight: "200px" }}>
        {active ? (
          <img 
            src={`${API}/api/v1/streams/feed/${cameraId}?t=${Date.now()}`} 
            alt={`Stream ${cameraId}`} 
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.08) brightness(0.92) saturate(0.85)" }} 
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem", gap: "1rem" }}>
            <div className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>AWAITING_SIGNAL_INPUT</div>
            <input 
              type="text" 
              placeholder="Source (e.g. '0' or 'rtsp://..')" 
              value={source} 
              onChange={(e) => setSource(e.target.value)}
              className="holo-input" 
              style={{ width: "80%", fontSize: "0.7rem", padding: "0.4rem" }} 
            />
            <button onClick={connect} className="holo-btn" style={{ fontSize: "0.65rem", padding: "0.4rem 1rem" }}>INITIALIZE_LINK</button>
          </div>
        )}

        {/* Scanning line & Corners */}
        <div className="cam-scan-line" />
        <div className="cam-corner cam-corner-tl" />
        <div className="cam-corner cam-corner-tr" />
        <div className="cam-corner cam-corner-bl" />
        <div className="cam-corner cam-corner-br" />
      </div>
    </div>
  );
}

export default function LivePage() {
  const [results, setResults] = useState<Record<string, FrameResult>>({});
  
  // Keep results refreshed via polling
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch(`${API}/api/v1/streams/results`);
        if (res.ok) setResults(await res.json());
      } catch (e) { }
    };
    const t = setInterval(fetchResults, 1000);
    return () => clearInterval(t);
  }, []);

  // Combine persons from all active cameras for the roster
  const allPersons = Object.values(results).flatMap(r => r.persons || []);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)", margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            VISUAL <span style={{ color: "var(--cyan)", textShadow: "var(--glow-cyan)" }}>MATRIX</span>
          </h1>
          <p className="font-mono" style={{ fontSize: "0.65rem", marginTop: "0.35rem", color: "var(--text-dim)", letterSpacing: "0.15em" }}>
            // TACTICAL_GRID_VIEW — MULTI_STREAM_SYNC
          </p>
        </div>
        <div>
          <Link href="/live/local" className="holo-btn" style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", borderColor: "var(--cyan-dim)", color: "var(--cyan)" }}>
            LAUNCH_LOCAL_WEBCAM_UPLINK
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "1rem", height: "calc(100vh - 180px)" }}>
        
        {/* Camera Grid (2x2) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "1rem" }}>
          <CameraNode cameraId="CAM-ALPHA" />
          <CameraNode cameraId="CAM-BETA" />
          <CameraNode cameraId="CAM-GAMMA" />
          <CameraNode cameraId="CAM-DELTA" />
        </div>

        {/* Target Roster Sidebar */}
        <div className="holo-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="holo-heading" style={{ marginBottom: "1rem" }}>Global Roster</div>
          <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "1rem", borderBottom: "var(--border-holo)", paddingBottom: "0.5rem" }}>
            TRACKING {allPersons.length} ACTIVE TARGETS
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {allPersons.length === 0 ? (
               <p className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>NO_TARGETS</p>
            ) : allPersons.map((p, i) => {
              const isAlert = (p.reid_matches?.[0]?.similarity || 0) > 0.85 && !p.is_new_person;
              const borderCol = isAlert ? "rgba(255,23,68,0.35)" : p.is_new_person ? "rgba(255,179,0,0.3)" : "var(--cyan-dim)";
              const accentCol = isAlert ? "var(--alert-red)" : p.is_new_person ? "var(--alert-amber)" : "var(--cyan)";
              
              return (
                <div key={`${p.track_id}-${i}`} style={{ border: `1px solid ${borderCol}`, background: "rgba(0,229,255,0.015)", padding: "0.5rem", borderRadius: "2px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span className="font-mono" style={{ fontSize: "0.65rem", color: accentCol }}>TRK-{p.track_id}</span>
                    <span className="holo-chip" style={{ color: accentCol, borderColor: accentCol, fontSize: "0.5rem" }}>
                      {isAlert ? "MATCH" : p.is_new_person ? "NEW" : "TRACK"}
                    </span>
                  </div>
                  <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>CONF:</span><span style={{color: "var(--text-primary)"}}>{(p.score * 100).toFixed(0)}%</span></div>
                    {p.attributes?.gender && <div style={{ display: "flex", justifyContent: "space-between" }}><span>CLASS:</span><span style={{color: "var(--text-primary)"}}>{p.attributes.gender}</span></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
      </div>
    </>
  );
}
