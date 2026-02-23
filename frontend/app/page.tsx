"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Activity, ShieldAlert, Video, BrainCircuit, Search, Eye, Fingerprint, Lock, ChevronRight } from "lucide-react";

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

      <div style={{ position: "relative", textAlign: "center", zIndex: 10 }}>
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

// ── Feature Card Component ─────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, delay = 0 }: { icon: any, title: string, desc: string, delay?: number }) {
  return (
    <div className="holo-panel holo-corners" style={{ 
      padding: "2rem 1.5rem", 
      display: "flex", 
      flexDirection: "column", 
      gap: "1rem",
      animation: `scanline 8s linear infinite, glowPulse 4s ease-in-out infinite alternate`,
      animationDelay: `${delay}s`,
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, height: "1px",
        background: "linear-gradient(90deg, transparent, var(--cyan), transparent)",
        opacity: 0.5
      }} />
      <Icon size={28} style={{ color: "var(--cyan)", filter: "drop-shadow(0 0 8px var(--cyan))" }} />
      <h3 className="font-display" style={{ margin: 0, fontSize: "1.1rem", letterSpacing: "0.1em", color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p className="font-mono" style={{ margin: 0, fontSize: "0.75rem", lineHeight: 1.6, color: "var(--text-dim)" }}>
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
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden", paddingBottom: "6rem" }}>
      <CustomCursor />

      {/* Background Effects */}
      <div style={{
        position: "fixed", inset: 0, zIndex: -1,
        backgroundImage: "linear-gradient(rgba(0,229,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.02) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }} />
      <div style={{
        position: "fixed", inset: 0, zIndex: -1,
        background: "radial-gradient(circle at 50% 30%, rgba(0,229,255,0.05) 0%, transparent 60%)",
      }} />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "4rem 2rem" }}>
        
        {/* Hero Section */}
        <section style={{ textAlign: "center", marginBottom: "8rem", position: "relative" }}>
          <div style={{ 
            display: "inline-block", 
            padding: "0.4rem 1rem", 
            border: "1px solid var(--cyan-dim)", 
            background: "rgba(0,229,255,0.05)",
            borderRadius: "50px",
            marginBottom: "2rem"
          }}>
            <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--cyan)", letterSpacing: "0.2em" }}>
              SYSTEM VERSION 2.4.1 // UPLINK ESTABLISHED
            </span>
          </div>
          
          <h1 className="font-display" style={{ 
            fontSize: "clamp(3rem, 8vw, 6rem)", 
            margin: "0 0 1rem 0", 
            lineHeight: 1.1,
            letterSpacing: "0.1em",
            color: "#fff",
            textShadow: "0 0 20px rgba(0,229,255,0.3)"
          }}>
            <span style={{ color: "var(--cyan)", textShadow: "var(--glow-cyan)" }}>SENTINEL</span>.AI
          </h1>
          
          <p className="font-mono" style={{ 
            fontSize: "clamp(0.8rem, 2vw, 1rem)", 
            color: "var(--text-secondary)", 
            maxWidth: "700px", 
            margin: "0 auto 3rem auto",
            letterSpacing: "0.05em",
            lineHeight: 1.6
          }}>
            Advanced multimodal surveillance intelligence. Harnessing neural networks for real-time threat detection, cross-camera identity tracking, and forensic analysis.
          </p>

          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard" className="holo-btn font-mono" style={{ 
              display: "flex", alignItems: "center", gap: "0.5rem", 
              fontSize: "0.8rem", padding: "1rem 2rem", background: "rgba(0,229,255,0.1)" 
            }}>
              <Activity size={16} />
              INITIALIZE COMMAND
            </Link>
            
            <Link href="/upload" className="holo-btn font-mono" style={{ 
              display: "flex", alignItems: "center", gap: "0.5rem", 
              fontSize: "0.8rem", padding: "1rem 2rem", borderColor: "var(--text-dim)", color: "var(--text-primary)"
            }}>
              <Search size={16} />
              FORENSIC UPLOAD
            </Link>
          </div>
        </section>

        {/* Features Subsystem */}
        <section style={{ marginBottom: "6rem" }}>
          <div style={{ 
            display: "flex", alignItems: "center", gap: "1rem", marginBottom: "3rem" 
          }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", margin: 0, letterSpacing: "0.15em", color: "var(--text-primary)" }}>
              CORE SUBSYSTEMS
            </h2>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, var(--cyan-dim), transparent)" }} />
          </div>

          <div style={{ 
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" 
          }}>
            <FeatureCard 
              icon={Eye} 
              title="OMNI-TRACKING" 
              desc="Simultaneous tracking of hundreds of entities across dynamic environments using state-of-the-art ByteTrack algorithms."
              delay={0}
            />
            <FeatureCard 
              icon={Fingerprint} 
              title="CROSS-CAN RE-ID" 
              desc="Persistent identity recognition across disparate camera feeds relying on deep Vision Transformer (ViT) embeddings and FAISS vector matching."
              delay={0.2}
            />
            <FeatureCard 
              icon={BrainCircuit} 
              title="SEMANTIC ANALYSIS" 
              desc="Natural language interrogation of video feeds. Search for specific entities based on extracted attributes like clothing color and gender."
              delay={0.4}
            />
            <FeatureCard 
              icon={ShieldAlert} 
              title="THREAT DETECTION" 
              desc="Autonomous identification of loitering, trespassing, and anomalous behavior patterns with instantaneous alert dissemination."
              delay={0.6}
            />
            <FeatureCard 
              icon={Video} 
              title="HOLOGRAPHIC SCRUBBER" 
              desc="Visual timeline mapping of critical events and subject appearances within forensic video uploads for rapid incident review."
              delay={0.8}
            />
            <FeatureCard 
              icon={Lock} 
              title="ENCRYPTED ARCHIVE" 
              desc="Secure database persistence of historical analysis missions, preserving high-value metadata and telemetry for post-action reporting."
              delay={1.0}
            />
          </div>
        </section>

        {/* Tech Stack Specs */}
        <section className="holo-panel" style={{ padding: "3rem" }}>
          <div className="font-mono" style={{ 
            fontSize: "0.6rem", color: "var(--cyan)", letterSpacing: "0.2em", marginBottom: "1rem", textAlign: "center" 
          }}>
            TECHNICAL SPECIFICATIONS
          </div>
          <div style={{ 
            display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2rem", opacity: 0.7 
          }}>
            {["Next.js 15 Suite", "React 19 Core", "FastAPI Matrix", "PyTorch Neural Engine", "FAISS Vector Ops", "YOLOv8 & CLIP Models", "SQLite Databanks"].map((tech) => (
              <div key={tech} className="font-mono" style={{ 
                fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" 
              }}>
                <ChevronRight size={14} style={{ color: "var(--cyan)" }} />
                {tech}
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
