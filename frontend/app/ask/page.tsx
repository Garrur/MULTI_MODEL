"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [personId, setPersonId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API}/api/v1/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, person_id: personId || undefined, camera_id: cameraId || undefined }),
      });
      if (!res.ok) throw new Error(`ERR_CODE: ${res.status}`);
      setResult(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const examples = ["Which camera last detected this person?", "What activity was detected most recently?", "Was any anomaly detected?"];

  return (
    <div style={{ maxWidth: 850, animation: "slide-in 0.5s ease-out" }}>
      <div style={{ marginBottom: "2.5rem" }}>
         <h1 className="font-display" style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>NLP <span className="text-amber glow-amber">Interrogation</span></h1>
         <p className="font-mono text-ghost" style={{ fontSize: "0.85rem", marginTop: "0.25rem", letterSpacing: "0.05em" }}>// ROBERTA-BASED EVENT LOG QUERYING</p>
      </div>

      <div className="c-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <label className="font-mono text-dim" style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: 8 }}>QUERY_INPUT</label>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3} placeholder="> ENTER DIRECTIVE..."
          className="c-input"
          style={{ width: "100%", fontSize: "1rem", padding: "1rem", resize: "none", marginBottom: "1.5rem" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          <div>
            <label className="font-mono text-dim" style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: 8 }}>OPT_TARGET_UUID [FILTER]</label>
            <input type="text" value={personId} onChange={e => setPersonId(e.target.value)} placeholder="XYZ..." className="c-input" style={{ width: "100%", padding: "0.75rem 1rem" }} />
          </div>
          <div>
            <label className="font-mono text-dim" style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: 8 }}>OPT_SOURCE_CAM [FILTER]</label>
            <input type="text" value={cameraId} onChange={e => setCameraId(e.target.value)} placeholder="CAM-01..." className="c-input" style={{ width: "100%", padding: "0.75rem 1rem" }} />
          </div>
        </div>

        <button onClick={ask} disabled={loading || !question.trim()}
          className="font-display"
          style={{ width: "100%", padding: "1rem", background: "var(--amber)", color: "var(--black)", border: "none", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.1em", cursor: loading ? "not-allowed" : "pointer", opacity: loading || !question.trim() ? 0.6 : 1, transition: "0.2s" }}>
          {loading ? "PROCESSING_NEURAL_NODES..." : "INITIATE_INTERROGATION"}
        </button>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.5rem" }}>
          <span className="font-mono text-dim" style={{ fontSize: "0.75rem", alignSelf: "center", marginRight: "0.5rem" }}>PRE_LOADED:</span>
           {examples.map(q => (
             <button key={q} onClick={() => setQuestion(q)}
               className="font-mono text-ghost"
               style={{ padding: "4px 8px", background: "transparent", border: "1px dashed var(--dim)", fontSize: "0.7rem", cursor: "pointer", transition: "0.2s" }}
               onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "var(--chalk)"; (e.target as HTMLButtonElement).style.color = "var(--chalk)"; }}
               onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "var(--dim)"; (e.target as HTMLButtonElement).style.color = "var(--ghost)"; }}>
               {q}
             </button>
           ))}
        </div>
      </div>

      {error && <div className="c-panel font-mono text-crimson c-cursor" style={{ padding: "1rem", border: "1px solid var(--flare)", marginBottom: "1.5rem" }}>[!] {error}</div>}

      {result && (
        <div className="c-panel" style={{ borderLeft: "4px solid var(--amber)" }}>
          <div style={{ padding: "1.5rem 2rem", borderBottom: `1px solid var(--iron)` }}>
            <p className="font-mono text-ghost" style={{ fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>QUESTION_LOGGED</p>
            <p className="font-ui text-chalk" style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0 }}>"{result.question}"</p>
          </div>
          
          <div style={{ padding: "1.5rem 2rem", background: "var(--coal)" }}>
             <p className="font-mono text-amber" style={{ fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>NEURAL_RESPONSE</p>
             <p className="font-ui text-chalk" style={{ fontSize: "1.4rem", lineHeight: 1.5, margin: 0 }}>{result.answer || "ERR_NO_DATA_EXTRACTED_FROM_CONTEXT"}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid var(--iron)" }}>
            {[
              { label: "CONFIDENCE_LVL", value: `${((result.score || 0) * 100).toFixed(1)}%`, color: "var(--amber)" },
              { label: "EVENT_CONTEXT_SIZE", value: result.events_used || 0, color: "var(--chalk)" },
              { label: "INFERENCE_LATENCY", value: result.latency_ms ? `${result.latency_ms.toFixed(0)}MS` : "—", color: "var(--dim)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: "1.5rem", borderRight: "1px solid var(--iron)", textAlign: "center" }}>
                <div className="font-display" style={{ fontSize: "1.5rem", color: color, marginBottom: "0.25rem" }}>{value}</div>
                <div className="font-mono text-ghost" style={{ fontSize: "0.6rem", letterSpacing: "0.1em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
