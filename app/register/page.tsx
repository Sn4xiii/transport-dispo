"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Truck, UserPlus } from "lucide-react";
import "../login/style.css";

export default function RegisterPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
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

  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim() || null,
          company: company.trim() || null,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        name: name.trim() || null,
        company: company.trim() || null,
      });
    }

    setSuccess(
      "Account wurde erstellt. Bitte prüfe deine E-Mails, falls eine Bestätigung erforderlich ist."
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
            <h1>Neuen Account anlegen</h1>
            <p>
              Erstelle dein Benutzerkonto für Disposition, Touren und
              Wochenplanung.
            </p>
          </div>

          <div className="login-brand-features">
            <div className="login-feature">
              <strong>Benutzerkonto</strong>
              <span>Name, Firma und Zugang direkt anlegen</span>
            </div>

            <div className="login-feature">
              <strong>Profile</strong>
              <span>Grunddaten direkt beim Start hinterlegen</span>
            </div>

            <div className="login-feature">
              <strong>Workflow</strong>
              <span>Schneller Einstieg ins System</span>
            </div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-head">
            <h2>Registrieren</h2>
            <p>Lege dein Konto an und starte direkt im System.</p>
          </div>

          <form onSubmit={register} className="login-form">
            <div className="login-field">
              <label htmlFor="register-name">Name</label>
              <input
                id="register-name"
                type="text"
                placeholder="Max Mustermann"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-company">Firma</label>
              <input
                id="register-company"
                type="text"
                placeholder="Deine Firma"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-email">E-Mail</label>
              <input
                id="register-email"
                type="email"
                placeholder="name@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-password">Passwort</label>

              <div className="login-password-wrap">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Passwort eingeben"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              <UserPlus size={18} />
              <span>{loading ? "Erstellt..." : "Account erstellen"}</span>
            </button>

            <a href="/login" className="login-link-inline">
              Schon ein Konto? Zum Login
            </a>
          </form>
        </div>
      </div>
    </div>
  );
}