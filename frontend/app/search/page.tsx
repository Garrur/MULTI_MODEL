"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SearchResult {
  text: string; score: number; event_id?: string; person_id?: string;
  camera_id?: string; timestamp?: string; activity_type?: string;
}

const EXAMPLES = [
  "person in red jacket near entrance",
  "suspicious loitering behavior",
  "running individual — exit corridor",
  "female subject, blue backpack",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [displayQuery, setDisplayQuery] = useState("");

  const search = async (q?: string) => {
    const sq = q || query;
    if (!sq.trim()) return;
    setLoading(true); setError(null); setSearched(true); setDisplayQuery(sq);
    try {
      const res = await fetch(`${API}/api/v1/search?q=${encodeURIComponent(sq)}&top_k=10`);
      if (!res.ok) throw new Error(`ERR_CODE: ${res.status}`);
      setResults((await res.json()).results || []);
    } catch (e: any) { setError(e.message); setResults([]); }
    finally { setLoading(false); }
  };

  const scoreColor = (s: number) =>
    s > 0.85 ? "var(--alert-red)" : s > 0.65 ? "var(--alert-amber)" : "var(--cyan)";

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <h1 className="font-display" style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)", margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          SEMANTIC <span style={{ color: "var(--cyan)", textShadow: "var(--glow-cyan)" }}>SEARCH</span>
        </h1>
        <p className="font-mono" style={{ fontSize: "0.65rem", marginTop: "0.35rem", color: "var(--text-dim)", letterSpacing: "0.15em" }}>
          // NLP_DATABASE_QUERY_INTERFACE — VECTOR_RETRIEVAL
        </p>
      </div>

      {/* Search console */}
      <div className="holo-panel holo-corners" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
        {/* Prompt prefix */}
        <div
          className="font-mono"
          style={{ fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.2em", marginBottom: "0.5rem" }}
        >
          ▶ SEMANTIC QUERY INTERFACE
        </div>

        {/* Input row */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "stretch" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span
              className="font-mono"
              style={{
                position: "absolute",
                left: "1rem", top: "50%", transform: "translateY(-50%)",
                color: "var(--cyan)", fontSize: "0.9rem",
                pointerEvents: "none",
                textShadow: "var(--glow-cyan)",
              }}
            >
              &gt;_
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="ENTER NATURAL LANGUAGE QUERY..."
              className="holo-input"
              style={{ paddingLeft: "2.5rem", fontSize: "0.95rem" }}
            />
          </div>
          <button
            onClick={() => search()}
            disabled={loading}
            className="holo-btn"
            style={{
              padding: "0 2rem",
              fontSize: "0.75rem",
              opacity: loading ? 0.6 : 1,
              background: loading ? "transparent" : "rgba(0,229,255,0.08)",
            }}
          >
            {loading ? (
              <span className="holo-cursor">SCANNING</span>
            ) : "EXECUTE"}
          </button>
        </div>

        {/* Example chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
          <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-dim)", alignSelf: "center" }}>
            EXAMPLES:
          </span>
          {EXAMPLES.map((q) => (
            <button
              key={q}
              onClick={() => { setQuery(q); search(q); }}
              className="holo-chip"
              style={{
                background: "transparent",
                border: "1px solid var(--cyan-dim)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.62rem",
                padding: "3px 10px",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cyan)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--cyan)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cyan-dim)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="holo-panel" style={{ padding: "0.75rem 1rem", border: "var(--border-alert)", marginBottom: "1rem", color: "var(--alert-red)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          ⚠ {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <div>
          <div
            className="holo-heading"
            style={{ marginBottom: "1rem" }}
          >
            Query Results [{results.length}] — &quot;{displayQuery}&quot;
          </div>

          {results.length === 0 ? (
            <div
              className="holo-panel"
              style={{
                padding: "4rem",
                textAlign: "center",
                borderStyle: "dashed",
                borderColor: "var(--cyan-dim)",
              }}
            >
              <p className="font-mono holo-cursor" style={{ fontSize: "0.9rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>
                ZERO_RESULTS_IN_DATABANKS
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {results.map((r, i) => (
                <div
                  key={i}
                  className="holo-panel"
                  style={{
                    padding: "1.25rem",
                    display: "flex",
                    gap: "1.5rem",
                    alignItems: "center",
                    transition: "border-color 0.3s, box-shadow 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,255,0.3)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 20px rgba(0,229,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,255,0.12)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--panel-glow)";
                  }}
                >
                  {/* Score meter */}
                  <div style={{ width: 72, textAlign: "center", borderRight: "var(--border-holo)", paddingRight: "1.5rem", flexShrink: 0 }}>
                    <div
                      className="font-display"
                      style={{ fontSize: "1.5rem", color: scoreColor(r.score), textShadow: `0 0 12px ${scoreColor(r.score)}`, lineHeight: 1, fontWeight: 700 }}
                    >
                      {(r.score * 100).toFixed(0)}
                      <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>%</span>
                    </div>
                    <div className="font-mono" style={{ fontSize: "0.55rem", color: "var(--text-dim)", marginTop: "4px", letterSpacing: "0.1em" }}>
                      MATCH
                    </div>
                  </div>

                  {/* Result content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-ui" style={{ fontSize: "1rem", color: "var(--text-primary)", margin: "0 0 0.75rem 0", lineHeight: 1.6 }}>
                      &ldquo;{r.text}&rdquo;
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                      {r.camera_id && (
                        <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--text-dim)" }}>SRC: </span>{r.camera_id}
                        </span>
                      )}
                      {r.activity_type && (
                        <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--text-dim)" }}>TYPE: </span>{r.activity_type}
                        </span>
                      )}
                      {r.timestamp && (
                        <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--text-dim)" }}>TIME: </span>{new Date(r.timestamp).toISOString().slice(0, 16)}Z
                        </span>
                      )}
                      {r.person_id && (
                        <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--alert-amber)" }}>
                          <span style={{ color: "var(--text-dim)" }}>TGT: </span>{r.person_id.slice(0, 12).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match rank */}
                  <div
                    className="font-display"
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-dim)",
                      letterSpacing: "0.15em",
                      flexShrink: 0,
                    }}
                  >
                    #{String(i + 1).padStart(2, "0")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
