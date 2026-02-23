"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Person { id: string; first_seen: string; last_seen: string; attributes?: any; }

export default function ReportsPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/v1/persons?limit=50`).then(r => r.json()).then(d => setPersons(d.persons || [])).catch(() => {}).finally(() => setLoadingPersons(false));
  }, []);

  const generateReport = async () => {
    if (!selectedPerson) return;
    setLoading(true); setError(null); setReport(null);
    try {
      const res = await fetch(`${API}/api/v1/report/${selectedPerson}`);
      if (!res.ok) throw new Error((await res.json()).detail || `ERR_CODE ${res.status}`);
      setReport(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const severityMap: Record<string, { col: string; border: string; bg: string; glow: string }> = {
    low:      { col: "var(--alert-green)",  border: "rgba(0,230,118,0.3)",  bg: "rgba(0,230,118,0.04)",  glow: "none" },
    medium:   { col: "var(--alert-amber)",  border: "rgba(255,179,0,0.3)",  bg: "rgba(255,179,0,0.04)",  glow: "var(--glow-amber)" },
    high:     { col: "var(--alert-red)",    border: "rgba(255,23,68,0.35)", bg: "rgba(255,23,68,0.05)",  glow: "var(--glow-red)" },
    critical: { col: "var(--alert-red)",    border: "rgba(255,23,68,0.5)",  bg: "rgba(255,23,68,0.08)",  glow: "var(--glow-red)" },
  };
  const sv = severityMap[report?.severity] || severityMap.medium;

  return (
    <>
      <div style={{ marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <h1 className="font-display" style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)", margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          INTEL <span style={{ color: "var(--alert-amber)", textShadow: "var(--glow-amber)" }}>DOSSIERS</span>
        </h1>
        <p className="font-mono" style={{ fontSize: "0.65rem", marginTop: "0.35rem", color: "var(--text-dim)", letterSpacing: "0.15em" }}>
          // COMPILE_FLAN-T5_INCIDENT_SUMMARIES — AI_SYNTHESIS
        </p>
      </div>

      {/* Target selector */}
      <div className="holo-panel holo-corners" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="holo-heading" style={{ marginBottom: "1rem" }}>Select Target</div>
        {loadingPersons ? (
          <p className="font-mono holo-cursor" style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>RETRIEVING_ROSTER...</p>
        ) : (
          <>
            <select
              value={selectedPerson}
              onChange={e => setSelectedPerson(e.target.value)}
              className="holo-input"
              style={{ marginBottom: "1rem", cursor: "pointer", fontSize: "0.82rem" }}
            >
              <option value="">-- SELECT TARGET --</option>
              {persons.map(p => (
                <option key={p.id} value={p.id}>
                  ID-{p.id.slice(0, 15).toUpperCase()} | LAST: {new Date(p.last_seen).toISOString().slice(0, 16)}Z
                </option>
              ))}
            </select>
            <button
              onClick={generateReport} disabled={loading || !selectedPerson}
              className="holo-btn"
              style={{ width: "100%", padding: "0.75rem", fontSize: "0.8rem", justifyContent: "center", opacity: loading || !selectedPerson ? 0.5 : 1 }}
            >
              {loading ? <span className="holo-cursor">COMPILING_DOSSIER</span> : "GENERATE_INTELLIGENCE_REPORT"}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="holo-panel" style={{ padding: "0.75rem 1rem", border: "var(--border-alert)", marginBottom: "1rem", color: "var(--alert-red)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          ⚠ {error}
        </div>
      )}

      {report && (
        <div className="holo-panel" style={{ border: `1px solid ${sv.border}`, background: sv.bg }}>
          {/* Header */}
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(0,229,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 className="font-display" style={{ fontSize: "1.2rem", margin: 0, letterSpacing: "0.12em", color: "var(--text-primary)" }}>REPORT_FILE</h2>
              <p className="font-mono" style={{ fontSize: "0.65rem", marginTop: "4px", color: "var(--alert-amber)", letterSpacing: "0.08em" }}>
                # {report.report_id?.slice(0, 20).toUpperCase()}
              </p>
            </div>
            <span className="holo-chip" style={{ color: sv.col, borderColor: sv.border, padding: "4px 12px", fontSize: "0.65rem" }}>
              CLASS: {report.severity?.toUpperCase()}
            </span>
          </div>

          {/* Meta */}
          <div className="font-mono" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(0,229,255,0.06)" }}>
            {[
              { label: "TIMESTAMP", value: report.generated_at ? new Date(report.generated_at).toISOString().slice(0, 19) + "Z" : "—" },
              { label: "LOG_COUNT", value: report.event_count ?? "—" },
              { label: "SENSOR_NODES", value: report.cameras_involved?.join(" / ") || "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: "1rem 1.5rem", borderRight: "1px solid rgba(0,229,255,0.06)" }}>
                <p style={{ fontSize: "0.58rem", color: "var(--text-dim)", margin: "0 0 4px 0", letterSpacing: "0.12em" }}>{label}</p>
                <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(0,229,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
            <div className="holo-heading" style={{ marginBottom: "0.75rem" }}>Executive Summary</div>
            <p className="font-ui" style={{ fontSize: "1rem", lineHeight: 1.7, margin: 0, color: "var(--text-primary)" }}>
              {report.summary || "NO_SUMMARY_DATA_AVAILABLE."}
            </p>
          </div>

          {/* Raw transcript */}
          <div style={{ padding: "1.5rem" }}>
            <div className="holo-heading" style={{ marginBottom: "0.75rem" }}>Raw Transcript</div>
            <pre
              className="font-mono"
              style={{ background: "rgba(0,0,0,0.4)", border: "var(--border-holo)", padding: "1rem", fontSize: "0.75rem", whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: "20rem", overflowY: "auto", margin: 0, color: "var(--text-secondary)" }}
            >
              {report.report_text}
            </pre>
          </div>

          <div style={{ padding: "0.75rem 1.5rem", borderTop: "1px solid rgba(0,229,255,0.06)", display: "flex", justifyContent: "space-between" }} className="font-mono">
            <span style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>MODEL: FLAN-T5-BASE</span>
            {report.latency_ms && <span style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>LATENCY: {report.latency_ms.toFixed(0)}ms</span>}
          </div>
        </div>
      )}
    </>
  );
}
