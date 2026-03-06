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
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
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

function getSectionTitle(section: string) {
  switch (section) {
    case "main":
      return "";
    case "dispo":
      return "Dispo";
    case "admin":
      return "Admin";
    case "system":
      return "System";
    default:
      return section;
  }
}

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
  const [loadingNav, setLoadingNav] = useState(true);

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
      setLoadingNav(true);

      const { data, error } = await supabase
        .from("navigation")
        .select("*")
        .order("section")
        .order("label");

      if (error) {
        console.error("Navigation load error:", error);
        setLoadingNav(false);
        return;
      }

      setNavItems(data ?? []);
      setLoadingNav(false);
    }

    loadNav();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleItems = useMemo(() => {
    return navItems.filter((item) => can(item.permission_key));
  }, [navItems, can]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, NavigationItem[]>();

    for (const item of visibleItems) {
      const existing = groups.get(item.section) ?? [];
      existing.push(item);
      groups.set(item.section, existing);
    }

    return Array.from(groups.entries());
  }, [visibleItems]);

  const isActivePath = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      window.localStorage.removeItem("token");
      router.push("/login");
      router.refresh();
    }
  };

  const renderNavItem = (item: NavigationItem) => {
    const Icon = iconMap[item.icon] ?? Settings;
    const active = isActivePath(item.path);

    return (
      <Link
        key={item.id}
        href={item.path}
        className={`nav-item ${active ? "active" : ""}`}
        title={!sidebarOpen ? item.label : undefined}
      >
        <span className="nav-item-icon">
          <Icon size={18} />
        </span>

        {sidebarOpen && <span className="nav-item-label">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Sidebar schließen"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={[
          "sidebar",
          sidebarOpen ? "open" : "closed",
          mobileOpen ? "mobile-open" : "",
        ].join(" ")}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-badge">
              <Truck size={18} />
            </div>

            {sidebarOpen && (
              <div className="sidebar-brand-text">
                <strong>Transitplan</strong>
                <span>Dispo System</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="toggle-btn"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "Sidebar einklappen" : "Sidebar ausklappen"}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        <div className="sidebar-content">
          <nav className="nav">
            {loadingNav && (
              <div className="nav-loading">
                {sidebarOpen ? "Navigation wird geladen..." : "..."}
              </div>
            )}

            {!loadingNav &&
              groupedItems.map(([section, items]) => (
                <div key={section} className="nav-section">
                  {sidebarOpen && getSectionTitle(section) && (
                    <div className="nav-section-title">{getSectionTitle(section)}</div>
                  )}

                  <div className="nav-section-items">
                    {items.map(renderNavItem)}
                  </div>
                </div>
              ))}

            {!loadingNav && groupedItems.length === 0 && (
              <div className="nav-empty">
                {sidebarOpen ? "Keine Navigation verfügbar." : "—"}
              </div>
            )}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            title={!sidebarOpen ? "Logout" : undefined}
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>

          {sidebarOpen && (
            <div className="sidebar-footer">
              <span>Transit v1.0</span>
              <small>by Mike</small>
            </div>
          )}
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Menü öffnen"
            >
              <Menu size={20} />
            </button>

            <div className="topbar-title-wrap">
              <h1 className="topbar-title">Transportplan Pilsen & Barsinghausen</h1>
              <p className="topbar-subtitle">Disposition & Wochenplanung</p>
            </div>
          </div>

          <div className="topbar-right">
            <Link href="/settings" className="topbar-settings" title="Einstellungen">
              <Settings size={18} />
            </Link>
          </div>
        </header>

        <main className="page-content">
          <div className="page-card">{children}</div>
        </main>
      </div>
    </div>
  );
}