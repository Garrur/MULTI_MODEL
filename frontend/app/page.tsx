"use client";
import { useEffect, useState, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Cinematic Intro Boot Sequence ──────────────────────────────────
function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const phases = [
    "INITIALIZING SENTINEL CORE...",
    "LOADING NEURAL SUBSYSTEMS...",
    "CALIBRATING OPTICAL SENSORS...",
    "ESTABLISHING SECURE UPLINK...",
    "SYSTEM ONLINE",
  ];

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + 1.5;
        if (next >= 100) {
          clearInterval(t);
          setTimeout(onComplete, 600);
          return 100;
        }
        setPhase(Math.floor((next / 100) * (phases.length - 1)));
        return next;
      });
    }, 25);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="boot-screen">
      {/* Particle grid lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 20%, var(--void) 80%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", textAlign: "center" }}>
        <div className="boot-logo" style={{ marginBottom: "0.5rem" }}>
          SENTINEL
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.65rem",
            color: "var(--text-secondary)",
            letterSpacing: "0.4em",
            marginBottom: "3rem",
          }}
        >
          MULTIMODAL SURVEILLANCE INTELLIGENCE
        </div>

        <div className="boot-progress-track" style={{ marginBottom: "1rem" }}>
          <div
            className="boot-progress-fill"
            style={{ width: `${progress}%`, transition: "width 0.05s linear" }}
          />
        </div>

        <div className="boot-text holo-cursor">{phases[phase]}</div>
      </div>
    </div>
  );
}

// ── Stat Block ─────────────────────────────────────────────────────
function StatBlock({
  label,
  value,
  sub,
  accent = "cyan",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: "cyan" | "red" | "amber" | "violet";
}) {
  const colors = {
    cyan: "var(--cyan)",
    red: "var(--alert-red)",
    amber: "var(--alert-amber)",
    violet: "var(--violet)",
  };
  const glows = {
    cyan: "var(--glow-cyan)",
    red: "var(--glow-red)",
    amber: "var(--glow-amber)",
    violet: "var(--glow-violet)",
  };

  return (
    <div className="holo-panel holo-corners" style={{ padding: "1.25rem 1.5rem" }}>
      <div
        className="font-mono"
        style={{
          fontSize: "0.58rem",
          color: "var(--text-dim)",
          letterSpacing: "0.2em",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        className="font-display"
        style={{
          fontSize: "2.4rem",
          color: colors[accent],
          textShadow: glows[accent],
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="font-mono"
          style={{
            fontSize: "0.6rem",
            color: "var(--text-dim)",
            marginTop: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Telemetry Bar ──────────────────────────────────────────────────
function TelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        className="font-mono"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.65rem",
          color: "var(--text-secondary)",
          marginBottom: "0.4rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span>{label}</span>
        <span style={{ color: "var(--text-primary)" }}>
          {typeof value === "number" ? value.toFixed(1) : value}
        </span>
      </div>
      <div className="holo-bar-track">
        <div
          className="holo-bar-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, transparent, ${color})`,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

// ── Custom Cursor ──────────────────────────────────────────────────
function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = mx + "px";
        dotRef.current.style.top = my + "px";
      }
    };
    const animateRing = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.left = rx + "px";
        ringRef.current.style.top = ry + "px";
      }
      requestAnimationFrame(animateRing);
    };
    document.addEventListener("mousemove", onMove);
    animateRing();
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          width: 8, height: 8,
          background: "var(--cyan)",
          borderRadius: "50%",
          boxShadow: "0 0 12px var(--cyan), 0 0 30px var(--cyan-glow)",
          pointerEvents: "none",
          zIndex: 99999,
          transform: "translate(-50%, -50%)",
          transition: "none",
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          width: 28, height: 28,
          border: "1px solid var(--cyan-dim)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 99998,
          transform: "translate(-50%, -50%)",
        }}
      />
    </>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────
export default function DashboardPage() {
  const [booting, setBooting] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [persons, setPersons] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (booting) return;
    const fetch_ = async () => {
      try {
        const [h, p, a] = await Promise.all([
          fetch(`${API}/health`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`${API}/api/v1/persons?limit=6`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`${API}/api/v1/anomalies?threshold=0.5`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (h) setHealth(h);
        if (p) setPersons(p.persons || []);
        if (a) setAnomalies(a.anomalous_persons || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetch_();
    const t = setInterval(fetch_, 10000);
    return () => clearInterval(t);
  }, [booting]);

  const modelsLoaded = health?.models_loaded
    ? Object.values(health.models_loaded).filter(Boolean).length
    : 0;
  const totalModels = health?.models_loaded
    ? Object.keys(health.models_loaded).length
    : 0;

  const now = new Date();
  const timeStr = now.toISOString().split("T")[1].slice(0, 8);

  if (booting) {
    return <BootScreen onComplete={() => setBooting(false)} />;
  }

  return (
    <>
      <CustomCursor />

      {/* Alert perimeter when threats exist */}
      {anomalies.length > 0 && <div className="alert-perimeter" />}

      {/* ── Header ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid rgba(0,229,255,0.08)",
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(1.4rem, 3vw, 2.2rem)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-primary)",
            }}
          >
            GLOBAL{" "}
            <span style={{ color: "var(--cyan)", textShadow: "var(--glow-cyan)" }}>
              COMMAND
            </span>
          </h1>
          <p
            className="font-mono"
            style={{
              fontSize: "0.65rem",
              marginTop: "0.35rem",
              color: "var(--text-dim)",
              letterSpacing: "0.15em",
            }}
          >
            // SENTINEL MULTIMODAL INTELLIGENCE — OVERVIEW
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {/* Live clock */}
          <div
            className="font-mono"
            style={{
              fontSize: "0.7rem",
              color: "var(--text-secondary)",
              letterSpacing: "0.12em",
              textAlign: "right",
            }}
          >
            <div style={{ color: "var(--text-dim)", fontSize: "0.55rem" }}>UTC // LIVE</div>
            <div style={{ color: "var(--cyan)", textShadow: "var(--glow-cyan)", fontSize: "1rem" }}>
              {timeStr}
            </div>
          </div>

          {/* Connection status */}
          <div
            className="holo-panel"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.8rem" }}
          >
            <div
              className={`status-dot ${health?.status === "healthy" ? "status-dot-active" : "status-dot-offline"}`}
            />
            <span
              className="font-mono"
              style={{
                fontSize: "0.65rem",
                color: health?.status === "healthy" ? "var(--cyan)" : "var(--text-dim)",
                letterSpacing: "0.1em",
              }}
            >
              {health?.status === "healthy" ? "UPLINK_OK" : "SEARCHING…"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stat Grid ────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatBlock
          label="Targets Tracked"
          value={persons.length.toString().padStart(3, "0")}
          sub="Active identities"
        />
        <StatBlock
          label="Neural Models"
          value={loading ? "—" : `${modelsLoaded}/${totalModels}`}
          sub="Subsystems online"
          accent="violet"
        />
        <StatBlock
          label="Threat Alerts"
          value={anomalies.length.toString().padStart(2, "0")}
          sub="Anomalies detected"
          accent={anomalies.length > 0 ? "red" : "cyan"}
        />
        <StatBlock
          label="Compute Node"
          value={health?.device?.toUpperCase() || "—"}
          sub={health?.gpu?.name || "Processing unit"}
          accent="amber"
        />
      </div>

      {/* ── Telemetry + Subsystems ────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Telemetry */}
        <div className="holo-panel holo-corners" style={{ padding: "1.5rem" }}>
          <div className="holo-heading" style={{ marginBottom: "1.25rem" }}>
            System Telemetry
          </div>
          <TelBar label="CPU_LOAD" value={health?.cpu_percent || 0} max={100} color="var(--alert-amber)" />
          <TelBar label="MEM_ALLOC (MB)" value={health?.memory_mb || 0} max={8000} color="var(--cyan)" />
          {health?.gpu && (
            <TelBar
              label="VRAM_ALLOC (MB)"
              value={health.gpu.memory_allocated_mb || 0}
              max={8000}
              color="var(--alert-red)"
            />
          )}
          {!health && (
            <p className="font-mono holo-cursor" style={{ fontSize: "0.75rem", color: "var(--alert-red)", marginTop: "1rem" }}>
              ERR_CONNECTION_REFUSED
            </p>
          )}
        </div>

        {/* Subsystem status */}
        <div className="holo-panel holo-corners" style={{ padding: "1.5rem" }}>
          <div className="holo-heading" style={{ marginBottom: "1.25rem" }}>
            Subsystem Status
          </div>
          {health?.models_loaded ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.65rem",
              }}
            >
              {Object.entries(health.models_loaded).map(([name, loaded]) => (
                <div
                  key={name}
                  className="font-mono"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.68rem",
                    color: loaded ? "var(--text-primary)" : "var(--text-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  <div
                    className={`status-dot ${loaded ? "status-dot-active" : "status-dot-offline"}`}
                  />
                  {name.replace(/_/g, " ")}
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono holo-cursor" style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              AWAITING_DATA…
            </p>
          )}
        </div>
      </div>

      {/* ── Recent Identities ─────────────────────────────── */}
      <div className="holo-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="holo-heading" style={{ marginBottom: "1.25rem" }}>
          Recent Identities
        </div>
        {loading ? (
          <p className="font-mono holo-cursor" style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            QUERYING_DB…
          </p>
        ) : persons.length === 0 ? (
          <p className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            NO_RECORDS_FOUND
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {persons.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.9rem 1rem",
                  background: "rgba(0,229,255,0.02)",
                  border: "var(--border-holo)",
                  borderRadius: "3px",
                  transition: "border-color 0.3s, background 0.3s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,255,0.3)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(0,229,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,255,0.12)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(0,229,255,0.02)";
                }}
              >
                {/* Avatar */}
                <div
                  className="font-display"
                  style={{
                    width: 36, height: 36,
                    background: "rgba(0,229,255,0.06)",
                    border: "1px solid var(--cyan-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    color: "var(--cyan)",
                    flexShrink: 0,
                    borderRadius: "2px",
                  }}
                >
                  {p.id.slice(0, 2).toUpperCase()}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    className="font-mono"
                    style={{
                      color: "var(--cyan)",
                      fontSize: "0.8rem",
                      margin: 0,
                      letterSpacing: "0.06em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ID-{p.id.slice(0, 12).toUpperCase()}
                  </p>
                  <p
                    className="font-mono"
                    style={{ fontSize: "0.6rem", color: "var(--text-dim)", marginTop: "3px" }}
                  >
                    FIRST_SEEN: {new Date(p.first_seen).toISOString().slice(0, 16)}Z
                  </p>
                </div>
                {/* Attributes */}
                <div className="font-mono" style={{ fontSize: "0.65rem", textAlign: "right", flexShrink: 0 }}>
                  {p.attributes?.gender && (
                    <div style={{ color: "var(--text-primary)", textTransform: "uppercase" }}>
                      {p.attributes.gender}
                    </div>
                  )}
                  {p.attributes?.color && (
                    <div style={{ color: "var(--text-dim)", textTransform: "uppercase", marginTop: "2px" }}>
                      {p.attributes.color}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Critical Alerts ───────────────────────────────── */}
      {anomalies.length > 0 && (
        <div
          className="holo-panel holo-panel-alert"
          style={{ padding: "1.5rem" }}
        >
          <div
            className="holo-heading"
            style={{
              marginBottom: "1.25rem",
              color: "var(--alert-red)",
            }}
          >
            ⚠ Critical Alerts Active
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {anomalies.slice(0, 6).map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem 1.25rem",
                  background: "rgba(255,23,68,0.04)",
                  border: "1px solid rgba(255,23,68,0.25)",
                  borderRadius: "3px",
                }}
              >
                <div>
                  <p
                    className="font-mono"
                    style={{
                      fontSize: "0.78rem",
                      margin: 0,
                      color: "var(--alert-red)",
                      textShadow: "0 0 10px rgba(255,23,68,0.5)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    TARGET-{a.person_id?.slice(0, 12).toUpperCase()}
                  </p>
                  <p
                    className="font-mono"
                    style={{ fontSize: "0.65rem", margin: "4px 0 0 0", color: "var(--text-secondary)", textTransform: "uppercase" }}
                  >
                    {a.verdict} — {a.unique_cameras} CAMS
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    className="font-display"
                    style={{
                      fontSize: "1.6rem",
                      fontWeight: 700,
                      margin: 0,
                      lineHeight: 1,
                      color: "var(--alert-red)",
                      textShadow: "var(--glow-red)",
                    }}
                  >
                    {(a.anomaly_score * 100).toFixed(0)}%
                  </p>
                  <p className="font-mono" style={{ fontSize: "0.55rem", margin: "2px 0 0 0", color: "var(--text-dim)" }}>
                    THREAT SCORE
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
