"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AnalysisSession {
  id: string;
  timestamp: string;
  video_filename: string;
  thumbnail_path: string | null;
  duration_sec: number;
  frames_processed: number;
  unique_persons: number;
  peak_count: number;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/v1/sessions`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load sessions");
        return res.json();
      })
      .then(data => {
        setSessions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Error loading mission logs. Check backend connection.");
        setLoading(false);
      });
  }, []);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    });
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "clamp(1.4rem,3vw,2.2rem)", margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            MISSION <span style={{ color: "var(--cyan)", textShadow: "var(--glow-cyan)" }}>ARCHIVE</span>
          </h1>
          <p className="font-mono" style={{ fontSize: "0.65rem", marginTop: "0.35rem", color: "var(--text-dim)", letterSpacing: "0.15em" }}>
            // HISTORICAL_ANALYSIS_LOGS — DATABASE_PERSISTENCE
          </p>
        </div>
        <div className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>
          TOTAL_RECORDS: <span style={{ color: "var(--cyan)" }}>{sessions.length}</span>
        </div>
      </div>

      {loading && (
        <div className="holo-panel" style={{ padding: "4rem", textAlign: "center", opacity: 0.6 }}>
          <div className="font-mono" style={{ fontSize: "0.85rem", color: "var(--cyan)", letterSpacing: "0.2em" }}>
            ACCESSING_DATABANKS...
          </div>
        </div>
      )}

      {error && (
        <div className="holo-panel" style={{ padding: "2rem", border: "var(--border-alert)", color: "var(--alert-red)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", textAlign: "center" }}>
          ⚠ {error}
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="holo-panel" style={{ padding: "4rem", textAlign: "center", opacity: 0.4 }}>
          <div className="font-mono" style={{ fontSize: "0.8rem", color: "var(--text-dim)", letterSpacing: "0.12em" }}>
            NO_ARCHIVED_SESSIONS_FOUND
          </div>
          <div className="font-mono" style={{ fontSize: "0.65rem", marginTop: "0.75rem" }}>
            Process a new video payload to generate history logs.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {sessions.map(session => (
          <div key={session.id} className="holo-panel holo-corners" style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", transition: "all 0.3s", cursor: "pointer" }}
               onMouseEnter={(e) => e.currentTarget.style.boxShadow = "var(--glow-cyan)"}
               onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}>
            
            {/* Thumbnail */}
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "rgba(0,0,0,0.5)", borderRadius: "2px", overflow: "hidden", border: "1px solid rgba(0,229,255,0.1)" }}>
              {session.thumbnail_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={`${API}${session.thumbnail_path}`} 
                  alt={session.video_filename} 
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85, filter: "contrast(1.1) brightness(0.9)" }}
                  onError={(e) => { e.currentTarget.src = ""; e.currentTarget.style.background = "repeating-linear-gradient(45deg, #111 0, #111 2px, #000 2px, #000 4px)"; }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed rgba(255,0,0,0.3)", color: "var(--alert-red)", fontSize: "0.7rem" }} className="font-mono">
                  [NO_SIGNAL]
                </div>
              )}
              
              {/* Overlay Tags */}
              <div style={{ position: "absolute", top: "0.5rem", left: "0.5rem", display: "flex", gap: "0.3rem" }}>
                <span className="holo-chip" style={{ fontSize: "0.55rem", background: "rgba(0,0,0,0.7)" }}>UID-{session.id.split('-')[0]}</span>
              </div>
              <div style={{ position: "absolute", bottom: "0.5rem", right: "0.5rem", background: "rgba(0,0,0,0.8)", padding: "0.15rem 0.4rem", borderRadius: "2px", border: "1px solid var(--cyan)" }}>
                <span className="font-mono" style={{ fontSize: "0.55rem", color: "var(--cyan)" }}>{formatSec(session.duration_sec)}</span>
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: "0 0.5rem 0.5rem 0.5rem" }}>
              <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-primary)", marginBottom: "0.2rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {session.video_filename}
              </div>
              <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
                ENGAGEMENT: {formatDate(session.timestamp)}
              </div>

              {/* Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div style={{ background: "rgba(0,229,255,0.03)", padding: "0.4rem", border: "1px solid rgba(0,229,255,0.08)", borderRadius: "2px" }}>
                  <div className="font-mono" style={{ fontSize: "0.5rem", color: "var(--text-dim)", marginBottom: "0.1rem" }}>FRAMES</div>
                  <div className="font-display" style={{ fontSize: "0.9rem", color: "var(--cyan)" }}>{session.frames_processed}</div>
                </div>
                <div style={{ background: "rgba(255,170,0,0.03)", padding: "0.4rem", border: "1px solid rgba(255,170,0,0.08)", borderRadius: "2px" }}>
                  <div className="font-mono" style={{ fontSize: "0.5rem", color: "var(--text-dim)", marginBottom: "0.1rem" }}>PERSONS</div>
                  <div className="font-display" style={{ fontSize: "0.9rem", color: "var(--alert-amber)" }}>{session.unique_persons}</div>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </>
  );
}
