"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ShieldAlert, Video, BrainCircuit, Search, Eye, Fingerprint, Lock, ChevronRight } from "lucide-react";
import CustomCursor from "@/components/CustomCursor";

// ── Boot Sequence (Redesigned) ──────────────────────────────────
function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const phases = [
    "INITIALIZING CORE...",
    "LOADING NEURAL SUBSYSTEMS...",
    "CALIBRATING OPTICAL SENSORS...",
    "ESTABLISHING SECURE UPLINK...",
    "SYSTEM ONLINE",
  ];

  useEffect(() => {
    const hasBooted = sessionStorage.getItem("sentinel_booted");
    if (hasBooted) {
      onComplete();
      return;
    }

    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + 1.5;
        if (next >= 100) {
          clearInterval(t);
          sessionStorage.setItem("sentinel_booted", "true");
          setTimeout(onComplete, 600);
          return 100;
        }
        setPhase(Math.floor((next / 100) * (phases.length - 1)));
        return next;
      });
    }, 25);
    return () => clearInterval(t);
  }, [onComplete]);

  return (
    <div className="boot-screen">
      {/* Background Dots (Subtle) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(var(--border-neu) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
          opacity: 0.5,
        }}
      />

      <div className="neu-card" style={{ position: "relative", padding: "4rem", textAlign: "center", zIndex: 10, maxWidth: "600px" }}>
        <div className="boot-logo" style={{ marginBottom: "0.25rem" }}>
          SENTINEL<span>.AI</span>
        </div>
        <div
          className="font-ui"
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            letterSpacing: "0.1em",
            fontWeight: 600,
            marginBottom: "3rem",
            textTransform: "uppercase"
          }}
        >
          Human-Centric Surveillance Intelligence
        </div>

        <div className="boot-progress-track" style={{ marginBottom: "1.5rem" }}>
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

// ── Feature Card Component ─────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, delay = 0 }: { icon: any, title: string, desc: string, delay?: number }) {
  return (
    <div className="neu-card" style={{ 
      padding: "2.5rem 2rem", 
      display: "flex", 
      flexDirection: "column", 
      gap: "1.2rem",
      animation: `float-up 0.6s var(--ease-spring) both`,
      animationDelay: `${delay}s`,
      position: "relative",
      background: "var(--surface)",
      backdropFilter: "var(--glass-blur)",
      WebkitBackdropFilter: "var(--glass-blur)",
    }}>
      <div style={{
        display: "inline-flex",
        padding: "0.75rem",
        background: "var(--indigo-pale)",
        borderRadius: "var(--radius-sm)",
        border: "2px solid var(--indigo)",
        width: "max-content",
        boxShadow: "2px 2px 0 var(--indigo-dark)"
      }}>
        <Icon size={24} className="text-indigo" />
      </div>
      
      <h3 className="font-display" style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p className="font-ui" style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
        {desc}
      </p>
    </div>
  );
}

// ── Landing Page ───────────────────────────────────────────────────
export default function LandingPage() {
  const [booting, setBooting] = useState(true);

  if (booting) {
    return <BootScreen onComplete={() => setBooting(false)} />;
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden", paddingBottom: "8rem" }}>
      {/* We DO NOT render CustomCursor to use standard browser cursor on the landing page based on user request */}
      
      {/* Background Dots + Gradient */}
      <div style={{
        position: "fixed", inset: 0, zIndex: -1,
        backgroundImage: "radial-gradient(var(--border-neu) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        opacity: 0.3
      }} />
      <div style={{
        position: "fixed", inset: 0, zIndex: -1,
        background: "radial-gradient(circle at 50% 0%, var(--indigo-pale) 0%, transparent 70%)",
      }} />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "6rem 2rem 2rem 2rem" }}>
        
        {/* Hero Section */}
        <section style={{ textAlign: "center", marginBottom: "8rem", position: "relative" }}>
          
          <div className="neu-card" style={{ 
            display: "inline-block", 
            padding: "0.4rem 1rem", 
            background: "white",
            marginBottom: "2.5rem",
            borderRadius: "50px"
          }}>
            <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--indigo)", fontWeight: 700, letterSpacing: "0.1em" }}>
              SYSTEM VERSION 2.4.1 // UPLINK ESTABLISHED
            </span>
          </div>
          
          <h1 className="font-display" style={{ 
            fontSize: "clamp(3.5rem, 8vw, 6.5rem)", 
            fontWeight: 700,
            margin: "0 0 1.5rem 0", 
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)"
          }}>
            <span style={{ color: "var(--indigo)" }}>Sentinel</span>.AI
          </h1>
          
          <p className="font-ui" style={{ 
            fontSize: "clamp(1rem, 2vw, 1.2rem)", 
            color: "var(--text-secondary)", 
            maxWidth: "700px", 
            margin: "0 auto 3rem auto",
            lineHeight: 1.6
          }}>
            Advanced multimodal surveillance intelligence. Harnessing neural networks for real-time threat detection, cross-camera identity tracking, and forensic analysis.
          </p>

          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap", animation: "float-up 0.6s var(--dur-med) both" }}>
            <Link href="/dashboard" className="holo-btn holo-btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", padding: "1rem 2rem" }}>
              <Activity size={18} />
              INITIALIZE COMMAND
            </Link>
            
            <Link href="/upload" className="holo-btn" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", padding: "1rem 2rem", background: "white" }}>
              <Search size={18} />
              FORENSIC UPLOAD
            </Link>
          </div>
        </section>

        {/* Features Subsystem */}
        <section style={{ marginBottom: "8rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "4rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              Core Subsystems
            </h2>
            <div style={{ flex: 1, height: "2px", background: "var(--border-brutal)" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
            <FeatureCard 
              icon={Eye} 
              title="Omni-Tracking" 
              desc="Simultaneous tracking of hundreds of entities across dynamic environments using state-of-the-art ByteTrack algorithms."
              delay={0}
            />
            <FeatureCard 
              icon={Fingerprint} 
              title="Cross-Cam Re-ID" 
              desc="Persistent identity recognition across disparate camera feeds relying on deep Vision Transformer (ViT) embeddings and FAISS vector matching."
              delay={0.1}
            />
            <FeatureCard 
              icon={BrainCircuit} 
              title="Semantic Analysis" 
              desc="Natural language interrogation of video feeds. Search for specific entities based on extracted attributes like clothing color and gender."
              delay={0.2}
            />
            <FeatureCard 
              icon={ShieldAlert} 
              title="Threat Detection" 
              desc="Autonomous identification of loitering, trespassing, and anomalous behavior patterns with instantaneous alert dissemination."
              delay={0.3}
            />
            <FeatureCard 
              icon={Video} 
              title="Forensic Scrubber" 
              desc="Visual timeline mapping of critical events and subject appearances within forensic video uploads for rapid incident review."
              delay={0.4}
            />
            <FeatureCard 
              icon={Lock} 
              title="Encrypted Archive" 
              desc="Secure database persistence of historical analysis missions, preserving high-value metadata and telemetry for post-action reporting."
              delay={0.5}
            />
          </div>
        </section>

        {/* Tech Stack Specs */}
        <section className="neu-card" style={{ padding: "4rem", background: "var(--bg-raised)" }}>
          <div className="font-mono text-indigo" style={{ 
            fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", marginBottom: "2rem", textAlign: "center" 
          }}>
            TECHNICAL SPECIFICATIONS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2.5rem" }}>
            {["Next.js 15", "React 19 Core", "FastAPI Matrix", "PyTorch Neural Engine", "FAISS Vector Ops", "YOLOv8 & CLIP Models", "SQLite Databanks"].map((tech) => (
              <div key={tech} className="font-ui" style={{ 
                fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" 
              }}>
                <ChevronRight size={16} className="text-coral" strokeWidth={3} />
                {tech}
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
