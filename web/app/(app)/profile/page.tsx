"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./profile.css";

type Profile = {
  id: string;
  name: string | null;
  company: string | null;
};

type Notice = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const initials = useMemo(() => {
    const source = name.trim() || email.trim() || "U";
    const parts = source.split(" ").filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [name, email]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (profile.name ?? "") !== name || (profile.company ?? "") !== company;
  }, [profile, name, company]);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setNotice(null);

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        const user = userData.user;

        if (!user) {
          setNotice({
            type: "error",
            message: "Kein Benutzer gefunden. Bitte erneut einloggen.",
          });
          setLoading(false);
          return;
        }

        setEmail(user.email ?? "");

        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, company")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          setProfile(data);
          setName(data.name ?? "");
          setCompany(data.company ?? "");
        } else {
          const fallbackProfile: Profile = {
            id: user.id,
            name: user.user_metadata?.name ?? null,
            company: null,
          };

          const { error: createError } = await supabase.from("profiles").upsert({
            id: fallbackProfile.id,
            name: fallbackProfile.name,
            company: fallbackProfile.company,
          });

          if (createError) {
            throw createError;
          }

          setProfile(fallbackProfile);
          setName(fallbackProfile.name ?? "");
          setCompany(fallbackProfile.company ?? "");
        }
      } catch (error: any) {
        console.error("Profile load error:", error);
        setNotice({
          type: "error",
          message: error?.message ?? "Profil konnte nicht geladen werden.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function resetForm() {
    if (!profile) return;
    setName(profile.name ?? "");
    setCompany(profile.company ?? "");
    setNotice({
      type: "info",
      message: "Änderungen wurden zurückgesetzt.",
    });
  }

  async function saveProfile() {
    if (!profile) return;

    setSaving(true);
    setNotice(null);

    try {
      const payload: Profile = {
        id: profile.id,
        name: name.trim() || null,
        company: company.trim() || null,
      };

      const { error } = await supabase.from("profiles").upsert(payload);

      if (error) {
        throw error;
      }

      setProfile(payload);
      setNotice({
        type: "success",
        message: "Profil erfolgreich gespeichert.",
      });
    } catch (error: any) {
      console.error("Profile save error:", error);
      setNotice({
        type: "error",
        message: error?.message ?? "Profil konnte nicht gespeichert werden.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      window.location.href = "/login";
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-shell">
          <div className="profile-loading">Lade Profil...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-shell">
        <div className="profile-header">
          <div>
            <h1>Mein Profil</h1>
            <p>Persönliche Daten und Kontoinformationen verwalten</p>
          </div>
        </div>

        <div className="profile-grid">
          <aside className="profile-side-card">
            <div className="profile-avatar">{initials}</div>

            <div className="profile-side-content">
              <h2>{name.trim() || "Benutzer"}</h2>
              <p>{email || "Keine E-Mail vorhanden"}</p>

              <div className="profile-badges">
                <span className="profile-badge">Account aktiv</span>
                {company.trim() && (
                  <span className="profile-badge profile-badge-soft">{company}</span>
                )}
              </div>
            </div>
          </aside>

          <section className="profile-main-card">
            <div className="profile-section-head">
              <div>
                <h3>Basisdaten</h3>
                <p>Diese Informationen werden in deinem Profil gespeichert.</p>
              </div>
            </div>

            {notice && (
              <div className={`profile-notice profile-notice-${notice.type}`}>
                {notice.message}
              </div>
            )}

            <div className="profile-form">
              <div className="profile-field">
                <label htmlFor="profile-email">E-Mail</label>
                <input
                  id="profile-email"
                  value={email}
                  disabled
                  className="profile-input profile-input-disabled"
                />
                <small>Die E-Mail kommt aus deinem Login und ist hier nicht editierbar.</small>
              </div>

              <div className="profile-field">
                <label htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dein Name"
                  className="profile-input"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="profile-company">Firma</label>
                <input
                  id="profile-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Deine Firma"
                  className="profile-input"
                />
              </div>
            </div>

            <div className="profile-actions">
              <button
                type="button"
                className="profile-btn profile-btn-secondary"
                onClick={resetForm}
                disabled={!hasChanges || saving}
              >
                Zurücksetzen
              </button>

              <button
                type="button"
                className="profile-btn profile-btn-primary"
                onClick={saveProfile}
                disabled={!hasChanges || saving}
              >
                {saving ? "Speichert..." : "Profil speichern"}
              </button>
            </div>
          </section>
        </div>

        <section className="profile-danger-zone">
          <div>
            <h3>Account</h3>
            <p>Hier kannst du dich sicher aus deiner Sitzung abmelden.</p>
          </div>

          <button
            type="button"
            className="profile-btn profile-btn-danger"
            onClick={logout}
          >
            Logout
          </button>
        </section>
      </div>
    </div>
  );
}