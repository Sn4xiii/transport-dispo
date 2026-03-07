"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Truck, LogIn } from "lucide-react";
import "./style.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (session) {
        router.replace("/");
        router.refresh();
        return;
      }

      setCheckingSession(false);
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function login(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (checkingSession) {
    return (
      <div className="login-page">
        <div className="login-card login-card-loading">
          <div className="login-loader" />
          <p>Prüfe Anmeldung...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-background-shape login-shape-1" />
      <div className="login-background-shape login-shape-2" />

      <div className="login-shell">
        <div className="login-brand-panel">
          <div className="login-brand-badge">
            <Truck size={28} />
          </div>

          <div className="login-brand-copy">
            <span className="login-kicker">Transit System</span>
            <h1>Transport Dispo</h1>
            <p>Planung, Rollen, Touren und Wochenübersichten an einem Ort.</p>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-head">
            <h2>Willkommen zurück</h2>
            <p>Melde dich mit deinem Konto an.</p>
          </div>

          <form onSubmit={login} className="login-form">
            <div className="login-field">
              <label htmlFor="email">E-Mail</label>
              <input
                id="email"
                type="email"
                placeholder="name@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Passwort</label>

              <div className="login-password-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Passwort eingeben"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              <LogIn size={18} />
              <span>{loading ? "Meldet an..." : "Login"}</span>
            </button>
          </form>

          <div className="login-links-row">
            <Link href="/forgot-password" className="login-link-inline">
              Passwort vergessen?
            </Link>

            <Link href="/register" className="login-link-inline">
              Account erstellen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}