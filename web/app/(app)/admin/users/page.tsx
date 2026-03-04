"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./admin.css";

type Profile = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  role?: string;
};

type Role = {
  id: string;
  name: string;
};

export default function ProfilePage() {

  const [activeTab, setActiveTab] = useState<"profile" | "users" | "permissions">("profile");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const [newUserEmail, setNewUserEmail] = useState("");

  /* ================= LOAD ================= */

  useEffect(() => {

    async function loadData() {

      setLoading(true);

      console.log("===== LOAD DATA START =====");

      /* USER */

      const { data: userData, error: userError } = await supabase.auth.getUser();

      console.log("AUTH USER:", userData);
      console.log("AUTH ERROR:", userError);

      const user = userData.user;

      if (!user) {
        console.warn("Kein eingeloggter User gefunden");
        setLoading(false);
        return;
      }

      /* PROFILE */

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      console.log("PROFILE DATA:", profileData);
      console.log("PROFILE ERROR:", profileError);

      if (profileData) {
        setProfile(profileData);
        setName(profileData.name ?? "");
        setCompany(profileData.company ?? "");
      }

      /* USERS */

      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at");

      console.log("USERS:", usersData);
      console.log("USERS ERROR:", usersError);

      if (usersData) {
        setUsers(usersData);
      }

      /* ROLES */

      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("*")
        .order("name");

      console.log("ROLES:", rolesData);
      console.log("ROLES ERROR:", rolesError);

      if (rolesData) {
        setRoles(rolesData);
      }

      console.log("===== LOAD DATA END =====");

      setLoading(false);
    }

    loadData();

  }, []);

  /* ================= SAVE PROFILE ================= */

  async function saveProfile() {

    if (!profile) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        company
      })
      .eq("id", profile.id);

    console.log("SAVE PROFILE ERROR:", error);

    setSaving(false);
  }

  /* ================= CREATE USER ================= */

  async function createUser(){

  if(!newUserEmail) return;

  const res = await fetch("/api/create-user",{
    method:"POST",
    body:JSON.stringify({
      email:newUserEmail
    })
  });

  const data = await res.json();

  if(data.error){
    alert(data.error);
    return;
  }

  alert(`Temporäres Passwort: ${data.temporaryPassword}`);

  setNewUserEmail("");

}

  /* ================= CHANGE ROLE ================= */

  async function changeRole(id: string, role: string) {

    console.log("CHANGE ROLE:", id, role);

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id);

    console.log("CHANGE ROLE ERROR:", error);

    setUsers(prev =>
      prev.map(u =>
        u.id === id ? { ...u, role } : u
      )
    );
  }

  /* ================= LOGOUT ================= */

  async function logout() {

    console.log("LOGOUT");

    await supabase.auth.signOut();
    window.location.href = "/login";

  }

  if (loading) {
    return <div className="admin-container">Lade...</div>;
  }

  return (

    <div className="admin-container">

      <h1 className="admin-title">Benutzerverwaltung</h1>

      <div className="admin-tabs">

        <button
          className={activeTab === "profile" ? "admin-tab active" : "admin-tab"}
          onClick={() => setActiveTab("profile")}
        >
          Profil
        </button>

        <button
          className={activeTab === "users" ? "admin-tab active" : "admin-tab"}
          onClick={() => setActiveTab("users")}
        >
          Benutzer
        </button>

        <button
          className={activeTab === "permissions" ? "admin-tab active" : "admin-tab"}
          onClick={() => setActiveTab("permissions")}
        >
          Permissions
        </button>

      </div>

      {/* PROFILE */}

      {activeTab === "profile" && (

        <div className="admin-card">

          <div className="admin-field">
            <label>Email</label>
            <input value={profile?.email ?? ""} disabled />
          </div>

          <div className="admin-field">
            <label>Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="admin-field">
            <label>Firma</label>
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </div>

          <div className="admin-actions">

            <button
              className="btn-primary"
              onClick={saveProfile}
            >
              {saving ? "Speichern..." : "Speichern"}
            </button>

            <button
              className="btn-danger"
              onClick={logout}
            >
              Logout
            </button>

          </div>

        </div>

      )}

      {/* USERS */}

      {activeTab === "users" && (

        <div className="admin-card">

          <h3>Benutzer einladen</h3>

          <div className="admin-toolbar">

            <input
              className="admin-search"
              placeholder="Email eingeben"
              value={newUserEmail}
              onChange={e => setNewUserEmail(e.target.value)}
            />

            <button
              className="btn-primary"
              onClick={createUser}
            >
              Einladen
            </button>

          </div>

          <table className="admin-table">

            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Rolle</th>
              </tr>
            </thead>

            <tbody>

              {users.map(user => (

                <tr key={user.id}>

                  <td>{user.email}</td>

                  <td>{user.name ?? "-"}</td>

                  <td>

                    <select
                      className="role-select"
                      value={user.role ?? ""}
                      onChange={e =>
                        changeRole(user.id, e.target.value)
                      }
                    >

                      {roles.map(role => (

                        <option
                          key={role.id}
                          value={role.name}
                        >
                          {role.name}
                        </option>

                      ))}

                    </select>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

      {/* PERMISSIONS */}

      {activeTab === "permissions" && (

        <div className="admin-card">

          <h3>Rollen Übersicht</h3>

          <ul className="permissions-list">

            {roles.map(role => (

              <li key={role.id}>

                <span className={`role-badge role-${role.name}`}>
                  {role.name}
                </span>

                Rolle im System

              </li>

            ))}

          </ul>

        </div>

      )}

    </div>

  );

}