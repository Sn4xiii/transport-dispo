"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Menu, X, Settings } from "lucide-react";
import "./layout.css";

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Sidebar Zustand speichern */

  useEffect(() => {
    localStorage.setItem("sidebarOpen", String(sidebarOpen));
  }, [sidebarOpen]);

  const navItem = (
    href: string,
    label: string,
    Icon: React.ElementType
  ) => {
    const active = pathname === href;

    return (
      <Link
        href={href}
        className={`nav-item ${active ? "active" : ""}`}
        onClick={() => setMobileOpen(false)}
      >
        <Icon size={18} />
        {sidebarOpen && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <div className="layout">
      {/* Overlay Mobile */}
      {mobileOpen && (
        <div
          className="overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`sidebar ${sidebarOpen ? "open" : "closed"} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        <div className="sidebar-header">
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={18} />
          </button>
          {sidebarOpen && <h2>Transport</h2>}

          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="nav">

          {/* Hauptbereich */}
          <div className="nav-section">
            {navItem("/", "Dashboard", LayoutDashboard)}
          </div>

          {/* Planung */}
          <div className="nav-section">
            <div className="nav-section-title">
              Planung
            </div>

            {navItem(
              "/weeks",
              "Wochenübersicht",
              CalendarDays
            )}
          </div>

          {/* Admin Bereich */}
          <div className="nav-section">
            <div className="nav-section-title">
              Admin
            </div>

            {navItem(
              "/admin/weeks",
              "Neue Woche",
              CalendarDays
            )}

            {navItem(
              "/admin/columns",
              "Transport Spalten",
              Settings
            )}
          </div>

        </nav>

        <div className="sidebar-footer">
          <span>Dispo v1.0</span>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        <header className="header">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>

          <h1>Dispositionssystem</h1>

          <div className="header-actions">
            <button className="header-btn">Benutzer</button>
          </div>
        </header>

        <main className="content">
          <div className="card">{children}</div>
        </main>
      </div>
    </div>
  );
}