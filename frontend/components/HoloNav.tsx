"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Search, Video, FileText, Settings, ShieldAlert, Upload, Archive, Home } from "lucide-react";

const navItems = [
  { name: "HOME",        href: "/",           icon: Home },
  { name: "OVERVIEW",    href: "/dashboard",  icon: Activity },
  { name: "LIVE FEED",   href: "/live",       icon: Video },
  { name: "SEARCH",      href: "/search",     icon: Search },
  { name: "UPLOAD",      href: "/upload",     icon: Upload },
  { name: "ARCHIVE",     href: "/sessions",   icon: Archive },
  { name: "THREATS",     href: "/anomalies",  icon: ShieldAlert },
  { name: "REPORTS",     href: "/reports",    icon: FileText },
  { name: "CONFIG",      href: "/settings",   icon: Settings },
];

export default function HoloNav() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <nav className="spatial-nav" aria-label="Primary navigation">
      {/* Brand mark left */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.25em",
          color: "var(--cyan)",
          textShadow: "var(--glow-cyan)",
          paddingRight: "0.75rem",
          borderRight: "1px solid var(--cyan-dim)",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        SENTINEL<span style={{ color: "var(--text-dim)" }}>.AI</span>
      </div>

      {/* Nav Items */}
      <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href} className={`nav-item ${isActive ? "active" : ""}`}>
              <Icon
                size={16}
                className="nav-icon"
                style={{
                  color: isActive ? "var(--cyan)" : "var(--text-dim)",
                  transition: "color 0.3s",
                }}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Status indicator right */}
      <div
        style={{
          paddingLeft: "0.75rem",
          borderLeft: "1px solid var(--cyan-dim)",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <div className="status-dot status-dot-active" />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.55rem",
            color: "var(--cyan)",
            letterSpacing: "0.08em",
          }}
        >
          ONLINE
        </span>
      </div>
    </nav>
  );
}
