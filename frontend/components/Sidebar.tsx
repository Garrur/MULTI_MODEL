"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Search, Video, FileText, Settings, ShieldAlert } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "OVERVIEW", href: "/", icon: Activity },
    { name: "SURVEILLANCE", href: "/live", icon: Video },
    { name: "IDENTITIES", href: "/search", icon: Search },
    { name: "ANOMALIES", href: "/anomalies", icon: ShieldAlert },
    { name: "REPORTS", href: "/reports", icon: FileText },
    { name: "SYSTEM CONFIG", href: "/settings", icon: Settings },
  ];

  return (
    <aside style={{
      width: "15rem",
      backgroundColor: "var(--void)",
      borderRight: "1px solid var(--iron)",
      position: "fixed",
      top: 0,
      left: 0,
      bottom: 0,
      display: "flex",
      flexDirection: "column",
      padding: "1.5rem 0",
      zIndex: 50,
      boxShadow: "5px 0 15px rgba(0,0,0,0.8)"
    }}>
      {/* Brand */}
      <div style={{ padding: "0 1.5rem", marginBottom: "3rem" }}>
        <h1 className="font-display" style={{ 
          margin: 0, 
          fontSize: "1.5rem", 
          letterSpacing: "0.15em", 
          color: "var(--chalk)",
          textShadow: "0 0 10px rgba(255,255,255,0.2)"
        }}>
          SENTINEL<span className="text-crimson glow-red">.AI</span>
        </h1>
        <div className="font-mono text-ghost" style={{ fontSize: "0.6rem", marginTop: "0.5rem", letterSpacing: "0.2em", borderTop: "1px solid var(--smoke)", paddingTop: "0.5rem" }}>
          SYS.VER_2.4.9 // ONLINE
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href} style={{ textDecoration: "none" }}>
              <div 
                className={`c-nav-link ${isActive ? "c-nav-active" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.75rem 1.5rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                  letterSpacing: "0.1em",
                  color: isActive ? "var(--chalk)" : "var(--ghost)",
                  cursor: "pointer",
                }}
              >
                <Icon size={16} color={isActive ? "var(--flare)" : "currentColor"} />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div style={{ padding: "1.5rem", marginTop: "auto", borderTop: "1px solid var(--iron)", background: "var(--panel)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <div className="c-cursor" style={{ width: 8, height: 8, background: "var(--flare)", boxShadow: "var(--glow-red)" }}></div>
          <span className="font-mono text-crimson" style={{ fontSize: "0.7rem", letterSpacing: "0.1em" }}>RESTRICTED ACCESS</span>
        </div>
        <p className="font-mono text-dim" style={{ margin: 0, fontSize: "0.6rem", lineHeight: 1.5 }}>
          UNAUTHORIZED USE IS STRICTLY PROHIBITED
        </p>
      </div>
    </aside>
  );
}
