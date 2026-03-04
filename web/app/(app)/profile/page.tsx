"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

type Profile = {
  id: string;
  name: string | null;
  company: string | null;
  role: string | null;
};

type Role = {
  id: string;
  name: string;
};

type Permission = {
  id: string;
  key: string;
};

type RolePermissionRow = {
  permissions: {
    key: string;
  } | {
    key: string;
  }[];
};

export default function ProfilePage() {

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const [roles, setRoles] = useState<Role[]>([]);
  const [role, setRole] = useState("");

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  /* ================= LOAD DATA ================= */

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

      /* PROFILE */

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setName(profileData.name ?? "");
        setCompany(profileData.company ?? "");
        setRole(profileData.role ?? "");
      }

      /* ROLES */

      const { data: rolesData } = await supabase
        .from("roles")
        .select("*")
        .order("name");

      if (rolesData) {
        setRoles(rolesData);
      }

      /* PERMISSIONS */

      const { data: permissionsData } = await supabase
        .from("permissions")
        .select("*")
        .order("key");

      if (permissionsData) {
        setPermissions(permissionsData);
      }

      /* ROLE PERMISSIONS */

      if (profileData?.role && rolesData) {

        const roleRow = rolesData.find(
          (r) => r.name === profileData.role
        );

        if (roleRow) {

          const { data: rolePermData } = await supabase
            .from("role_permissions")
            .select("permissions(key)")
            .eq("role_id", roleRow.id);

          const rows = (rolePermData ?? []) as RolePermissionRow[];

          const keys = rows.flatMap((row) => {

            if (Array.isArray(row.permissions)) {
              return row.permissions.map((p) => p.key);
            }

            if (row.permissions) {
              return [row.permissions.key];
            }

            return [];

          });

          setRolePermissions(keys);
        }
      }

      setLoading(false);
    }

    loadProfile();

  }, []);

  /* ================= SAVE PROFILE ================= */

  async function saveProfile() {

    if (!profile) return;

    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        name,
        company
      })
      .eq("id", profile.id);

    setSaving(false);
  }

  /* ================= CHANGE ROLE ================= */

  async function changeRole(newRole: string) {

    if (!profile) return;

    setRole(newRole);

    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", profile.id);

  }

  /* ================= TOGGLE PERMISSION ================= */

  async function togglePermission(permission: Permission) {

    const roleRow = roles.find((r) => r.name === role);
    if (!roleRow) return;

    const hasPermission = rolePermissions.includes(permission.key);

    if (hasPermission) {

      await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleRow.id)
        .eq("permission_id", permission.id);

      setRolePermissions((prev) =>
        prev.filter((p) => p !== permission.key)
      );

    } else {

      await supabase
        .from("role_permissions")
        .insert({
          role_id: roleRow.id,
          permission_id: permission.id
        });

      setRolePermissions((prev) => [...prev, permission.key]);

    }

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
        maxWidth: 600,
        margin: "60px auto",
        padding: 30,
        background: "white",
        borderRadius: 14,
        border: "1px solid #e2e8f0"
      }}
    >

      <h1>Profil</h1>

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
          onChange={(e) => setName(e.target.value)}
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
        <label>Firma</label>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
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
        <label>Rolle</label>
        <select
          value={role}
          onChange={(e) => changeRole(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginTop: 6,
            borderRadius: 8,
            border: "1px solid #cbd5e1"
          }}
        >

          {roles.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}

        </select>
      </div>

      <h3>Permissions</h3>

      <div style={{ marginBottom: 20 }}>

        {permissions.map((permission) => (

          <div key={permission.id} style={{ marginBottom: 6 }}>

            <label>

              <input
                type="checkbox"
                checked={rolePermissions.includes(permission.key)}
                onChange={() => togglePermission(permission)}
              />

              {" "}{permission.key}

            </label>

          </div>

        ))}

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

  );

}