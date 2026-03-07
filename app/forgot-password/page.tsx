"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Truck } from "lucide-react";
import "../login/style.css";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(
      "Falls ein Konto existiert, wurde eine E-Mail zum Zurücksetzen des Passworts versendet."
    );
    setLoading(false);
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
            <h1>Passwort zurücksetzen</h1>
            <p>
              Fordere einen sicheren Reset-Link an, um wieder Zugriff auf dein
              Konto zu bekommen.
            </p>
          </div>

          <div className="login-brand-features">
            <div className="login-feature">
              <strong>Sicher</strong>
              <span>Reset-Link wird per E-Mail verschickt</span>
            </div>

            <div className="login-feature">
              <strong>Einfach</strong>
              <span>Nur E-Mail eingeben und Anleitung folgen</span>
            </div>

            <div className="login-feature">
              <strong>Schnell</strong>
              <span>Wieder direkt ins System zurück</span>
            </div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-head">
            <h2>Passwort vergessen</h2>
            <p>Gib deine E-Mail ein und wir senden dir einen Reset-Link.</p>
          </div>

          <form onSubmit={resetPassword} className="login-form">
            <div className="login-field">
              <label htmlFor="forgot-email">E-Mail</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="name@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              <Mail size={18} />
              <span>{loading ? "Sende..." : "Reset-Link senden"}</span>
            </button>

            <a href="/login" className="login-link-inline">
              Zurück zum Login
            </a>
          </form>
        </div>
      </div>
    </div>
  );
}