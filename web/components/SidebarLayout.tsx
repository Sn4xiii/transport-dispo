"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Menu,
  Settings,
  Truck,
  Users,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/lib/supabase-browser";
import "./layout.css";

type NavigationItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  section: string;
  permission_key: string;
};

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarDays,
  Settings,
  Truck,
  Users,
};

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermissions();

  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);

  useEffect(() => {
    setMounted(true);

    const saved = window.localStorage.getItem("sidebarOpen");
    if (saved !== null) {
      setSidebarOpen(saved === "true");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem("sidebarOpen", String(sidebarOpen));
  }, [mounted, sidebarOpen]);

  useEffect(() => {
    async function loadNav() {
      const { data, error } = await supabase
        .from("navigation")
        .select("*")
        .order("section")
        .order("label");

      if (error) {
        console.error("Navigation load error:", error);
        return;
      }

      setNavItems(data ?? []);
    }

    loadNav();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleItems = useMemo(() => {
    return navItems.filter((item) => can(item.permission_key));
  }, [navItems, can]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderSection(section: string, title?: string) {
    const items = visibleItems.filter((item) => item.section === section);

    if (items.length === 0) return null;

    return (
      <div className="nav-section">
        {title && sidebarOpen && (
          <div className="nav-section-title">{title}</div>
        )}

        {items.map((item) => {
          const Icon = iconMap[item.icon] ?? Settings;
          const active = isActive(item.path);

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`nav-item ${active ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon size={18} />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    );
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      router.push("/login");
      router.refresh();
    }
  }

  if (!mounted) {
    return (
      <div className="layout">
        <div className="main">
          <header className="header">
            <h1>Transportplan Pilsen & Barsinghausen</h1>
          </header>
          <main className="content">
            <div className="card">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      {mobileOpen && (
        <div
          className="overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${sidebarOpen ? "open" : "closed"} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        <div className="sidebar-header">
          {sidebarOpen && <h3>Transitplan</h3>}

          <button
            type="button"
            className="toggle-btn"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "Sidebar einklappen" : "Sidebar ausklappen"}
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="nav">
          {renderSection("main")}
          {renderSection("dispo", "Dispo")}
          {renderSection("admin", "Admin")}
          {renderSection("system", "System")}
        </nav>

        <div className="sidebar-logout">
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            title={!sidebarOpen ? "Logout" : undefined}
          >
            {sidebarOpen ? (
              "Logout"
            ) : (
              <LogOut size={18} />
            )}
          </button>
        </div>

        <div className="sidebar-footer">
          <span>{sidebarOpen ? "Transit v1.1 by Mike" : "v1.1"}</span>
        </div>
      </aside>

      <div className="main">
        <header className="header">
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Menü öffnen"
          >
            <Menu size={20} />
          </button>

          <h1>Transportplan Pilsen & Barsinghausen</h1>

          <div className="header-actions">
            <Link href="/profile" className="header-btn" aria-label="Profil">
              <Settings size={16} />
            </Link>
          </div>
        </header>

        <main className="content">
          <div className="card">{children}</div>
        </main>
      </div>
    </div>
  );
}