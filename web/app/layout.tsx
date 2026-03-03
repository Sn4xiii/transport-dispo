"use client";

import "./globals.css";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, Menu } from "lucide-react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (typeof window !== "undefined") {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  const navItem = (href: string, label: string, icon: string) => {
    const active = pathname === href;

    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
        ${
          active
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        <span className="text-lg">{icon}</span>
        {sidebarOpen && (
          <span className="font-medium tracking-wide">
            {label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <html lang="de">
      <body className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#0f172a] dark:to-[#020617] transition-colors duration-500">
        <div className="flex h-screen overflow-hidden">

          {/* SIDEBAR */}
          <div
            className={`${
              sidebarOpen ? "w-64" : "w-20"
            } backdrop-blur-xl bg-white/70 dark:bg-[#0f172a]/80 border-r border-white/20 dark:border-gray-800 transition-all duration-300 flex flex-col shadow-xl`}
          >
            {/* Logo */}
            <div className="flex items-center justify-between p-5">
              {sidebarOpen && (
                <span className="text-xl font-semibold tracking-tight text-gray-800 dark:text-white">
                  Transport
                </span>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 dark:text-gray-400 hover:scale-110 transition"
              >
                <Menu size={20} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-2">
              {navItem("/", "Dashboard", "📊")}
              {navItem("/", "Wochenplanung", "📅")}
            </nav>

            {/* Theme Toggle */}
            <div className="p-4 border-t border-white/20 dark:border-gray-800">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-2 bg-white/60 dark:bg-gray-800/80 backdrop-blur-md text-gray-800 dark:text-white px-4 py-2 rounded-xl hover:scale-[1.03] transition-all duration-200 shadow"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                {sidebarOpen && (darkMode ? "Light Mode" : "Dark Mode")}
              </button>
            </div>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-10">
            <div className="max-w-7xl mx-auto animate-fadeIn">
              {children}
            </div>
          </div>

        </div>
      </body>
    </html>
  );
}