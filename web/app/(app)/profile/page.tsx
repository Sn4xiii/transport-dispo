"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  name: string | null;
  company: string | null;
};

export default function ProfilePage() {

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  /* ================= LOAD USER ================= */

  useEffect(() => {

    async function loadProfile() {

      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();

      const user = userData.user;

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {

        setProfile(data);
        setName(data.name ?? "");
        setCompany(data.company ?? "");

      }

      setLoading(false);

    }

    loadProfile();

  }, []);

  /* ================= SAVE ================= */

  async function saveProfile() {

    if (!profile) return;

    setSaving(true);

    await supabase
      .from("profiles")
      .upsert({
        id: profile.id,
        name,
        company
      });

    setSaving(false);

  }

  /* ================= LOGOUT ================= */

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Lade Profil...</div>;
  }

  return (

    <div
      style={{
        maxWidth: 500,
        margin: "60px auto",
        padding: 30,
        background: "white",
        borderRadius: 14,
        border: "1px solid #e2e8f0"
      }}
    >

      <h1>Profil</h1>

      <div style={{ marginTop: 20 }}>

        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input
            value={email}
            disabled
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1"
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1"
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label>Firma</label>
          <input
            value={company}
            onChange={e => setCompany(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1"
            }}
          />
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            cursor: "pointer",
            marginRight: 10
          }}
        >
          {saving ? "Speichern..." : "Profil speichern"}
        </button>

        <button
          onClick={logout}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          Logout
        </button>

      </div>

    </div>

  );

}