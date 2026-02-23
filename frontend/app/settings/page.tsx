"use client";

const endpoints = [
  ["POST", "/api/v1/process-frame", "INGEST_OPTICAL_DATA / PIPELINE",      "var(--cyan)"],
  ["GET",  "/api/v1/search?q=...",  "NLP_DATABASE_QUERY",                   "var(--alert-amber)"],
  ["POST", "/api/v1/ask",           "ROBERTA_INTERROGATION",                 "var(--cyan)"],
  ["GET",  "/api/v1/report/{id}",   "FLANT5_DOSSIER_GENERATION",            "var(--alert-amber)"],
  ["GET",  "/api/v1/anomalies",     "GNN_THREAT_DETECTION",                  "var(--alert-red)"],
  ["GET",  "/api/v1/persons",       "RETRIEVE_TRACKING_ROSTER",              "var(--alert-amber)"],
  ["GET",  "/api/v1/cameras",       "SENSOR_NODE_STATUS",                    "var(--alert-amber)"],
  ["WS",   "/api/v1/live-feed",     "FULL_DUPLEX_WSS_STREAM",               "var(--alert-red)"],
  ["GET",  "/health",               "SYSTEM_TELEMETRY",                      "var(--cyan)"],
  ["GET",  "/docs",                 "OPENAPI_SPECIFICATION",                 "var(--cyan)"],
];

const models = [
  ["DETECTION_CORE",         "facebook/detr-resnet-50"],
  ["REID_EMBEDDER",          "google/vit-base-patch16-224"],
  ["ATTRIBUTE_EXTRACTOR",    "openai/clip-vit-base-patch32"],
  ["SEMANTIC_VECTORIZER",    "sentence-transformers/all-MiniLM-L6-v2"],
  ["QA_ENGINE",              "deepset/roberta-base-squad2"],
  ["REPORT_SYNTHESIS",       "google/flan-t5-base"],
  ["SUMMARIZATION_NODE",     "facebook/bart-large-cnn"],
];

export default function SettingsPage() {
  return (
    <>
      <div style={{ marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <h1 className="font-display" style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)", margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          SYSTEM <span style={{ color: "var(--cyan)", textShadow: "var(--glow-cyan)" }}>MANIFEST</span>
        </h1>
        <p className="font-mono" style={{ fontSize: "0.65rem", marginTop: "0.35rem", color: "var(--text-dim)", letterSpacing: "0.15em" }}>
          // COMPILED ENDPOINT AND NEURAL ROUTING DEFINITIONS
        </p>
      </div>

      {/* API Endpoints */}
      <div className="holo-panel holo-corners" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
        <div className="holo-heading" style={{ marginBottom: "1.25rem" }}>API Routing Table</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {endpoints.map(([method, path, desc, color]) => (
            <div
              key={path}
              style={{
                display: "flex", alignItems: "center", gap: "1.5rem",
                padding: "0.85rem 1rem",
                background: "rgba(0,229,255,0.01)",
                border: "var(--border-holo)",
                borderRadius: "2px",
                transition: "background 0.3s, border-color 0.3s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(0,229,255,0.04)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,255,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(0,229,255,0.01)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,255,0.12)";
              }}
            >
              <div
                className="font-display"
                style={{ width: 50, textAlign: "center", color: color as string, fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}
              >
                {method}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-mono" style={{ fontSize: "0.82rem", margin: "0 0 3px 0", color: "var(--text-primary)", letterSpacing: "0.04em" }}>{path}</p>
                <p className="font-mono" style={{ fontSize: "0.6rem", margin: 0, color: "var(--text-dim)", letterSpacing: "0.08em" }}>// {desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Neural models */}
      <div className="holo-panel holo-corners" style={{ padding: "1.5rem" }}>
        <div className="holo-heading" style={{ marginBottom: "1.25rem" }}>Neural Network Definitions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {models.map(([role, model]) => (
            <div
              key={model}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.85rem 1rem",
                border: "var(--border-holo)",
                borderRadius: "2px",
                background: "rgba(0,229,255,0.01)",
                transition: "background 0.3s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,229,255,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,229,255,0.01)"; }}
            >
              <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
                <span className="status-dot status-dot-active" style={{ display: "inline-block", marginRight: "0.5rem" }} />
                {role}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: "0.72rem", color: "var(--alert-amber)", letterSpacing: "0.04em", padding: "3px 10px", background: "rgba(255,179,0,0.05)", border: "1px solid rgba(255,179,0,0.2)", borderRadius: "2px" }}
              >
                {model}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
