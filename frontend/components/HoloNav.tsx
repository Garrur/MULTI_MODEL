"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Search, Video, FileText, Settings, ShieldAlert, Upload, Archive, Home } from "lucide-react";

const navItems = [
  { name: "Home",     href: "/",           icon: Home },
  { name: "Overview", href: "/dashboard",  icon: Activity },
  { name: "Live",     href: "/live",       icon: Video },
  { name: "Search",   href: "/search",     icon: Search },
  { name: "Upload",   href: "/upload",     icon: Upload },
  { name: "Archive",  href: "/sessions",   icon: Archive },
  { name: "Threats",  href: "/anomalies",  icon: ShieldAlert },
  { name: "Reports",  href: "/reports",    icon: FileText },
  { name: "Config",   href: "/settings",   icon: Settings },
];

export default function HoloNav() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <nav className="spatial-nav" aria-label="Primary navigation">

      {/* Brand */}
      <div style={{
        fontFamily: "var(--font-ui)",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color: "var(--text-primary)",
        paddingRight: "0.9rem",
        borderRight: "2px solid var(--border-neu)",
        whiteSpace: "nowrap",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        gap: "0.3rem",
      }}>
        <span style={{
          background: "var(--indigo)",
          color: "white",
          borderRadius: "var(--brutal-radius)",
          padding: "1px 6px",
          fontSize: "0.7rem",
          fontWeight: 700,
          border: "1.5px solid var(--indigo-dark)",
          boxShadow: "2px 2px 0 var(--indigo-dark)",
        }}>S</span>
        Sentinel<span style={{ color: "var(--coral)", fontWeight: 700 }}>.AI</span>
      </div>

      {/* Nav Items */}
      <div style={{ display: "flex", gap: "0.15rem", alignItems: "center" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon
                size={15}
                className="nav-icon"
                style={{ color: isActive ? "white" : "var(--text-dim)", transition: "color 0.2s" }}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Status */}
      <div style={{
        paddingLeft: "0.9rem",
        borderLeft: "2px solid var(--border-neu)",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
      }}>
        <div className="status-dot status-dot-active" />
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.58rem",
          color: "var(--emerald)",
          fontWeight: 700,
          letterSpacing: "0.06em",
        }}>
          ONLINE
        </span>
      </div>
    </nav>
  );
}
