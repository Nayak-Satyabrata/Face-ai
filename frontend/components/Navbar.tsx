"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, UserPlus, ClipboardList, LayoutDashboard, Scan } from "lucide-react";

const navLinks = [
  { href: "/",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/register",   label: "Register",   icon: UserPlus },
  { href: "/attendance", label: "Attendance", icon: Scan },
  { href: "/logs",       label: "View Logs",  icon: ClipboardList },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "rgba(15,15,26,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <Camera size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">FaceAttend</span>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: active ? "rgba(99,102,241,0.2)" : "transparent",
                    color: active ? "#818cf8" : "var(--text-muted)",
                    border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Live indicator */}
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: "var(--accent-green)",
                boxShadow: "0 0 8px var(--accent-green)",
                animation: "pulse 2s infinite",
              }}
            />
            <span className="hidden sm:inline">Live</span>
          </div>
        </div>
      </div>
    </header>
  );
}
