"use client";

import { useState } from "react";
import { Menu, LayoutDashboard, Calendar } from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`h-screen bg-slate-900 text-white transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      } flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && <span className="font-bold text-lg">Transport</span>}
        <button onClick={() => setCollapsed(!collapsed)}>
          <Menu size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-2">
        <div className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded cursor-pointer">
          <LayoutDashboard size={20} />
          {!collapsed && <span>Dashboard</span>}
        </div>

        <div className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded cursor-pointer">
          <Calendar size={20} />
          {!collapsed && <span>Wochenplanung</span>}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 text-sm text-slate-400">
        {!collapsed && "v1.0"}
      </div>
    </div>
  );
}