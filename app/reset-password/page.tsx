"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Truck } from "lucide-react";
import "../login/style.css";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setError("Kein gültiger Reset-Kontext gefunden. Bitte Link aus der E-Mail erneut öffnen.");
      }

      setChecking(false);
    }

    init();

    return () => {
      active = false;
    };
  }, []);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Passwort wurde erfolgreich geändert. Du kannst dich jetzt anmelden.");
    setLoading(false);

    setTimeout(() => {
      router.replace("/login");
    }, 1200);
  }

  if (checking) {
    return (
      <div className="login-page">
        <div className="login-card login-card-loading">
          <div className="login-loader" />
          <p>Prüfe Reset-Link...</p>
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
            <h1>Neues Passwort setzen</h1>
            <p>
              Wähle ein neues Passwort für dein Konto und logge dich danach
              wieder ein.
            </p>
          </div>

          <div className="login-brand-features">
            <div className="login-feature">
              <strong>Reset</strong>
              <span>Passwort sicher neu vergeben</span>
            </div>

            <div className="login-feature">
              <strong>Kontoschutz</strong>
              <span>Nur über deinen gültigen Reset-Link</span>
            </div>

            <div className="login-feature">
              <strong>Direkt weiter</strong>
              <span>Nach Änderung zurück zum Login</span>
            </div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-head">
            <h2>Neues Passwort</h2>
            <p>Vergib jetzt ein neues Passwort für dein Konto.</p>
          </div>

          <form onSubmit={updatePassword} className="login-form">
            <div className="login-field">
              <label htmlFor="new-password">Neues Passwort</label>
              <div className="login-password-wrap">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Neues Passwort"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="login-field">
              <label htmlFor="repeat-password">Passwort wiederholen</label>
              <input
                id="repeat-password"
                type={showPassword ? "text" : "password"}
                placeholder="Passwort wiederholen"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              <KeyRound size={18} />
              <span>{loading ? "Speichert..." : "Passwort speichern"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}