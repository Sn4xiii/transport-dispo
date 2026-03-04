"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Menu,
  Settings,
  Truck,
  Users,
  LucideIcon
} from "lucide-react";
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
  Users
};

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const pathname = usePathname();
  const { can } = usePermissions();

  /* Sidebar Zustand direkt aus localStorage laden (ESLint safe) */

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? saved === "true" : true;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);

  /* Sidebar Zustand speichern */

  useEffect(() => {
    localStorage.setItem("sidebarOpen", String(sidebarOpen));
  }, [sidebarOpen]);

  /* Navigation aus DB laden */

  useEffect(() => {

    async function loadNav() {

      const { data, error } = await supabase
        .from("navigation")
        .select("*")
        .order("section");

      if (error) {
        console.error("Navigation load error:", error);
        return;
      }

      setNavItems(data ?? []);
    }

    loadNav();

  }, []);

  /* einzelnes Nav Item */

  const navItem = (
    key: string,
    href: string,
    label: string,
    Icon: LucideIcon
  ) => {

    const active = pathname.startsWith(href);

    return (
      <Link
        key={key}
        href={href}
        className={`nav-item ${active ? "active" : ""}`}
        onClick={() => setMobileOpen(false)}
      >
        <Icon size={18} />
        {sidebarOpen && <span>{label}</span>}
      </Link>
    );
  };

  /* Navigation Section */

  const renderSection = (section: string, title?: string) => {

    const items = navItems.filter(
      item =>
        item.section === section &&
        can(item.permission_key)
    );

    if (items.length === 0) return null;

    return (

      <div className="nav-section">

        {title && (
          <div className="nav-section-title">
            {title}
          </div>
        )}

        {items.map(item => {

          const Icon = iconMap[item.icon] ?? Settings;

          return navItem(
            item.id,
            item.path,
            item.label,
            Icon
          );

        })}

      </div>

    );

  };

  return (

    <div className="layout">

      {/* SIDEBAR */}

      <aside
        className={`sidebar ${sidebarOpen ? "open" : "closed"} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >

        <div className="sidebar-header">

          {sidebarOpen && <h3>Transitplan</h3>}

          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
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

        <div className="sidebar-footer">
          <span>Transit v1.0 by Mike</span>
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

          <h1>Transportplan Pilsen & Barsinghausen</h1>


        </header>

        <main className="content">
          <div className="card">{children}</div>
        </main>

      </div>

    </div>

  );

}