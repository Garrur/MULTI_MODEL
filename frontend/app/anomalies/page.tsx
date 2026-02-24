"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Anomaly {
  person_id: string; anomaly_score: number; verdict: string;
  unique_cameras: number; total_observations: number; avg_dwell_seconds: number;
  flags: { rapid_movement: boolean; loitering: boolean; fast_dwell: boolean };
  route: { camera_id: string; timestamp: number }[];
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [threshold, setThreshold] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [animTick, setAnimTick] = useState(0);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/anomalies?threshold=${threshold}`);
      if (res.ok) setAnomalies((await res.json()).anomalous_persons || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnomalies(); }, [threshold]);

  // Heartbeat for animation tick
  useEffect(() => {
    const t = setInterval(() => setAnimTick((x) => x + 1), 1500);
    return () => clearInterval(t);
  }, []);

  const threatLevel = (s: number) => {
    if (s > 0.85) return { label: "CRITICAL", col: "var(--alert-red)", bg: "rgba(255,23,68,0.06)", border: "rgba(255,23,68,0.35)", glow: "var(--glow-red)" };
    if (s > 0.65) return { label: "HIGH", col: "var(--alert-amber)", bg: "rgba(255,179,0,0.05)", border: "rgba(255,179,0,0.3)", glow: "var(--glow-amber)" };
    if (s > 0.45) return { label: "MODERATE", col: "#FFEB3B", bg: "rgba(255,235,59,0.03)", border: "rgba(255,235,59,0.2)", glow: "none" };
    return { label: "LOW", col: "var(--alert-green)", bg: "rgba(0,230,118,0.03)", border: "rgba(0,230,118,0.2)", glow: "none" };
  };

  const criticalCount = anomalies.filter((a) => a.anomaly_score > 0.85).length;

  return (
    <>
      {/* Alert perimeter for critical threats */}
      {criticalCount > 0 && <div className="alert-perimeter" />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)", margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            THREAT <span style={{ color: "var(--alert-red)", textShadow: "var(--glow-red)" }}>DETECTION</span>
          </h1>
          <p className="font-mono" style={{ fontSize: "0.65rem", marginTop: "0.35rem", color: "var(--text-dim)", letterSpacing: "0.15em" }}>
            // GNN_ABNORMAL_ROUTE_PATTERN_ANALYSIS — AUTONOMOUS
          </p>
        </div>
        <button
          onClick={fetchAnomalies}
          disabled={loading}
          className="holo-btn"
          style={{ borderColor: loading ? "var(--text-dim)" : "var(--alert-amber)", color: loading ? "var(--text-dim)" : "var(--alert-amber)" }}
        >
          {loading ? <span className="holo-cursor">SCANNING</span> : "MANUAL_SCAN"}
        </button>
      </div>

      {/* Control strip */}
      <div className="holo-panel holo-corners" style={{ padding: "1.25rem 1.75rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
          <div>
            <label className="font-mono" style={{ display: "block", fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.15em", marginBottom: "0.65rem" }}>
              SENSITIVITY_THRESHOLD :{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: "bold" }}>[{threshold.toFixed(2)}]</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="range" min="0" max="1" step="0.05" value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--cyan)", height: 2, cursor: "pointer" }}
              />
            </div>
            <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", marginTop: "0.4rem", color: "var(--text-dim)" }}>
              <span>0.0 // ALL</span>
              <span>0.5 // SUSPICIOUS</span>
              <span>1.0 // CRITICAL</span>
            </div>
          </div>

          {/* Threat counters */}
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <div style={{ textAlign: "center", borderLeft: "var(--border-holo)", paddingLeft: "1.5rem" }}>
              <div
                className="font-display"
                style={{
                  fontSize: "2.8rem", lineHeight: 1, color: "var(--alert-red)",
                  textShadow: criticalCount > 0 ? "var(--glow-red)" : "none",
                  transition: "text-shadow 0.5s",
                }}
              >
                {criticalCount}
              </div>
              <div className="font-mono" style={{ fontSize: "0.55rem", color: "var(--text-dim)", letterSpacing: "0.12em", marginTop: "4px" }}>
                CRITICAL
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="font-display" style={{ fontSize: "2.8rem", lineHeight: 1, color: "var(--cyan)", textShadow: "var(--glow-cyan)" }}>
                {anomalies.length}
              </div>
              <div className="font-mono" style={{ fontSize: "0.55rem", color: "var(--text-dim)", letterSpacing: "0.12em", marginTop: "4px" }}>
                TOTAL
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anomaly cards */}
      {anomalies.length === 0 ? (
        <div className="holo-panel" style={{ padding: "5rem", textAlign: "center", borderColor: "var(--cyan-dim)", borderStyle: "dashed" }}>
          <p className="font-mono holo-cursor" style={{ fontSize: "1rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>
            SYSTEM_SECURE — NO_THREATS_DETECTED
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "1rem" }}>
          {anomalies.map((a, i) => {
            const threat = threatLevel(a.anomaly_score);
            const isCritical = a.anomaly_score > 0.85;
            return (
              <div
                key={i}
                className={`holo-panel${isCritical ? " holo-panel-alert" : ""}`}
                style={{
                  border: `1px solid ${threat.border}`,
                  background: threat.bg,
                  overflow: "hidden",
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    padding: "1rem 1.25rem",
                    borderBottom: "1px solid rgba(0,229,255,0.06)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "2px", border: `1px solid ${threat.border}`,
                      overflow: "hidden", background: "rgba(0,229,255,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <img 
                        src={`${API}/static/thumbnails/${a.person_id}.jpg`} 
                        alt="Target" 
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        onError={(e) => { e.currentTarget.style.display = "none"; }} 
                      />
                    </div>
                    <div>
                      <div
                        className="font-mono"
                        style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "4px" }}
                      >
                        TARGET_ID
                      </div>
                      <div
                        className="font-mono"
                        style={{ fontSize: "0.82rem", color: threat.col, textShadow: threat.glow, letterSpacing: "0.06em" }}
                      >
                        {a.person_id?.slice(0, 16).toUpperCase()}...
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                    <span
                      className="holo-chip"
                      style={{ color: threat.col, borderColor: threat.border, fontSize: "0.6rem" }}
                    >
                      {threat.label}
                    </span>
                    <span
                      className="font-display"
                      style={{ fontSize: "1.8rem", color: threat.col, textShadow: threat.glow, lineHeight: 1, fontWeight: 700 }}
                    >
                      {(a.anomaly_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div style={{ padding: "1.25rem" }}>
                  {/* Stats grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "0.75rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {[
                      { label: "SRC_NODES", value: a.unique_cameras },
                      { label: "OBSERVATIONS", value: a.total_observations },
                      { label: "AVG_DWELL", value: `${a.avg_dwell_seconds?.toFixed(0)}S` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ borderLeft: `2px solid ${threat.border}`, paddingLeft: "0.6rem" }}>
                        <div className="font-mono" style={{ fontSize: "0.55rem", color: "var(--text-dim)", marginBottom: "3px", letterSpacing: "0.08em" }}>{label}</div>
                        <div className="font-display" style={{ fontSize: "1.2rem", color: "var(--text-primary)", fontWeight: 700 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Flags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
                    {a.flags?.rapid_movement && (
                      <span className="holo-chip" style={{ color: "var(--alert-red)", borderColor: "rgba(255,23,68,0.4)", background: "rgba(255,23,68,0.07)" }}>
                        RAPID_MOVEMENT
                      </span>
                    )}
                    {a.flags?.loitering && (
                      <span className="holo-chip" style={{ color: "var(--alert-amber)", borderColor: "rgba(255,179,0,0.4)", background: "rgba(255,179,0,0.07)" }}>
                        LOITERING
                      </span>
                    )}
                    {a.flags?.fast_dwell && (
                      <span className="holo-chip" style={{ color: "var(--violet)", borderColor: "rgba(139,92,246,0.4)", background: "rgba(139,92,246,0.07)" }}>
                        FAST_DWELL
                      </span>
                    )}
                  </div>

                  {/* Route */}
                  {a.route && a.route.length > 0 && (
                    <div>
                      <div className="font-mono" style={{ fontSize: "0.58rem", color: "var(--text-dim)", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
                        TRACKING_ROUTE
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.3rem" }}>
                        {a.route.map((r, ri) => (
                          <span key={ri} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: "0.7rem",
                                padding: "2px 8px",
                                background: "rgba(0,229,255,0.06)",
                                border: "var(--border-holo)",
                                color: "var(--cyan)",
                                borderRadius: "2px",
                              }}
                            >
                              {r.camera_id}
                            </span>
                            {ri < a.route.length - 1 && (
                              <span style={{ color: threat.col, fontSize: "0.7rem", opacity: 0.6 }}>→</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
