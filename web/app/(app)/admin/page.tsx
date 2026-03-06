"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import "./admin.css";

/* ================= TYPES ================= */

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  phone: string | null;
  role_id: string | null;
};

type Role = {
  id: string;
  name: string;
};

type Permission = {
  id: string;
  key: string;
  label: string | null;
  description: string | null;
};

type RolePermission = {
  role_id: string;
  permission_id: string;
  permissions: Permission;
};

type ColumnGroup = {
  id: string;
  name: string;
  position: number;
  is_visible: boolean;
};

type TourColumn = {
  id: string;
  label: string;
  column_group_id: string;
  position: number;
  is_visible: boolean;
};

type TabKey = "users" | "roles" | "permissions" | "columns";

type Notice =
  | {
      type: "success" | "error" | "info";
      message: string;
    }
  | null;

/* ================= PAGE ================= */

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>("users");

  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);

  const [columnGroups, setColumnGroups] = useState<ColumnGroup[]>([]);
  const [columns, setColumns] = useState<TourColumn[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newColumn, setNewColumn] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  /* ================= LOAD ================= */

  async function loadData(showLoader = true) {
    if (showLoader) setLoading(true);
    setNotice(null);

    try {
      const [
        usersRes,
        rolesRes,
        permissionsRes,
        rolePermissionsRes,
        groupsRes,
        columnsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").order("email"),
        supabase.from("roles").select("*").order("name"),
        supabase.from("permissions").select("*").order("key"),
        supabase
          .from("role_permissions")
          .select(`
            role_id,
            permission_id,
            permissions (*)
          `),
        supabase.from("column_groups").select("*").order("position"),
        supabase.from("tour_columns").select("*").order("position"),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (permissionsRes.error) throw permissionsRes.error;
      if (rolePermissionsRes.error) throw rolePermissionsRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (columnsRes.error) throw columnsRes.error;

      setUsers((usersRes.data ?? []) as Profile[]);
      setRoles((rolesRes.data ?? []) as Role[]);
      setPermissions((permissionsRes.data ?? []) as Permission[]);
      setRolePermissions((rolePermissionsRes.data ?? []) as RolePermission[]);
      setColumnGroups((groupsRes.data ?? []) as ColumnGroup[]);
      setColumns((columnsRes.data ?? []) as TourColumn[]);
    } catch (error: any) {
      console.error("Admin load error:", error);
      setNotice({
        type: "error",
        message: error?.message ?? "Daten konnten nicht geladen werden.",
      });
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    loadData(true);
  }, []);

  /* ================= DERIVED ================= */

  const roleMap = useMemo(() => {
    const map = new Map<string, string>();
    roles.forEach((role) => map.set(role.id, role.name));
    return map;
  }, [roles]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return users;

    return users.filter((u) => {
      const roleName = u.role_id ? roleMap.get(u.role_id) ?? "" : "";

      return (
        (u.email || "").toLowerCase().includes(q) ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.company || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        roleName.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleMap]);

  const stats = useMemo(() => {
    return {
      users: users.length,
      roles: roles.length,
      permissions: permissions.length,
      groups: columnGroups.length,
      columns: columns.length,
      visibleColumns: columns.filter((c) => c.is_visible).length,
    };
  }, [users, roles, permissions, columnGroups, columns]);

  const groupedColumns = useMemo(() => {
    return columnGroups.map((group) => ({
      group,
      items: columns
        .filter((c) => c.column_group_id === group.id)
        .sort((a, b) => a.position - b.position),
    }));
  }, [columnGroups, columns]);

  /* ================= HELPERS ================= */

  function showSuccess(message: string) {
    setNotice({ type: "success", message });
  }

  function showError(error: any, fallback: string) {
    console.error(error);
    setNotice({
      type: "error",
      message: error?.message ?? fallback,
    });
  }

  function hasPermission(roleId: string, permissionId: string) {
    return rolePermissions.some(
      (rp) => rp.role_id === roleId && rp.permission_id === permissionId
    );
  }

  /* ================= USER UPDATE ================= */

  async function updateUser(
    id: string,
    field: "name" | "company" | "phone" | "role_id",
    value: string
  ) {
    const previous = users;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, [field]: value || null } : u
      )
    );

    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value || null })
      .eq("id", id);

    if (error) {
      setUsers(previous);
      showError(error, "User konnte nicht aktualisiert werden.");
    }
  }

  /* ================= USER DELETE ================= */

  async function deleteUser(id: string) {
    const ok = window.confirm("User wirklich löschen?");
    if (!ok) return;

    const previous = users;
    setUsers((prev) => prev.filter((u) => u.id !== id));

    const { error } = await supabase.from("profiles").delete().eq("id", id);

    if (error) {
      setUsers(previous);
      showError(error, "User konnte nicht gelöscht werden.");
      return;
    }

    showSuccess("User wurde gelöscht.");
  }

  /* ================= CREATE USER ================= */

  async function createUser() {
    if (!newEmail.trim()) return;

    setBusy(true);
    setNotice(null);

    try {
      const res = await fetch("/backend/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "User konnte nicht erstellt werden.");
      }

      setNewEmail("");
      await loadData(false);
      showSuccess("User wurde erstellt.");
    } catch (error: any) {
      showError(error, "User konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  }

  /* ================= ROLE CREATE ================= */

  async function createRole() {
    if (!newRole.trim()) return;

    setBusy(true);
    setNotice(null);

    try {
      const { data, error } = await supabase
        .from("roles")
        .insert({ name: newRole.trim() })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setRoles((prev) =>
          [...prev, data as Role].sort((a, b) => a.name.localeCompare(b.name))
        );
      }

      setNewRole("");
      showSuccess("Rolle wurde erstellt.");
    } catch (error: any) {
      showError(error, "Rolle konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  }

  /* ================= ROLE DELETE ================= */

  async function deleteRole(id: string) {
    const ok = window.confirm("Rolle wirklich löschen?");
    if (!ok) return;

    const previousRoles = roles;
    setRoles((prev) => prev.filter((r) => r.id !== id));

    const { error } = await supabase.from("roles").delete().eq("id", id);

    if (error) {
      setRoles(previousRoles);
      showError(error, "Rolle konnte nicht gelöscht werden.");
      return;
    }

    setRolePermissions((prev) => prev.filter((rp) => rp.role_id !== id));
    setUsers((prev) =>
      prev.map((u) => (u.role_id === id ? { ...u, role_id: null } : u))
    );
    showSuccess("Rolle wurde gelöscht.");
  }

  /* ================= PERMISSION TOGGLE ================= */

  async function togglePermission(roleId: string, permission: Permission) {
    const exists = rolePermissions.find(
      (rp) => rp.role_id === roleId && rp.permission_id === permission.id
    );

    if (exists) {
      const previous = rolePermissions;

      setRolePermissions((prev) =>
        prev.filter(
          (rp) => !(rp.role_id === roleId && rp.permission_id === permission.id)
        )
      );

      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", permission.id);

      if (error) {
        setRolePermissions(previous);
        showError(error, "Permission konnte nicht entfernt werden.");
      }

      return;
    }

    const optimistic: RolePermission = {
      role_id: roleId,
      permission_id: permission.id,
      permissions: permission,
    };

    const previous = rolePermissions;
    setRolePermissions((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("role_permissions").insert({
      role_id: roleId,
      permission_id: permission.id,
    });

    if (error) {
      setRolePermissions(previous);
      showError(error, "Permission konnte nicht gesetzt werden.");
    }
  }

  /* ================= COLUMN GROUP CREATE ================= */

  async function createGroup() {
    if (!newGroup.trim()) return;

    setBusy(true);
    setNotice(null);

    try {
      const { data, error } = await supabase
        .from("column_groups")
        .insert({
          name: newGroup.trim(),
          position: columnGroups.length + 1,
          is_visible: true,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setColumnGroups((prev) =>
          [...prev, data as ColumnGroup].sort((a, b) => a.position - b.position)
        );
      }

      setNewGroup("");
      showSuccess("Gruppe wurde erstellt.");
    } catch (error: any) {
      showError(error, "Gruppe konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  }

  /* ================= COLUMN CREATE ================= */

  async function createColumn() {
    if (!newColumn.trim() || !selectedGroup) return;

    setBusy(true);
    setNotice(null);

    try {
      const { data, error } = await supabase
        .from("tour_columns")
        .insert({
          label: newColumn.trim(),
          column_group_id: selectedGroup,
          position: columns.length + 1,
          is_visible: true,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setColumns((prev) =>
          [...prev, data as TourColumn].sort((a, b) => a.position - b.position)
        );
      }

      setNewColumn("");
      showSuccess("Spalte wurde erstellt.");
    } catch (error: any) {
      showError(error, "Spalte konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  }

  /* ================= COLUMN VISIBILITY ================= */

  async function toggleColumn(id: string, visible: boolean) {
    const previous = columns;

    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_visible: !visible } : c))
    );

    const { error } = await supabase
      .from("tour_columns")
      .update({ is_visible: !visible })
      .eq("id", id);

    if (error) {
      setColumns(previous);
      showError(error, "Sichtbarkeit konnte nicht geändert werden.");
    }
  }

  /* ================= RENDER ================= */

  if (loading) {
    return <div className="admin-container">Loading...</div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Admin Panel</h1>
          <p className="admin-subtitle">
            Benutzer, Rollen, Berechtigungen und Spalten zentral verwalten
          </p>
        </div>

        <button className="btn-secondary" onClick={() => loadData(false)}>
          Reload
        </button>
      </div>

      {notice && (
        <div className={`admin-notice admin-notice-${notice.type}`}>
          {notice.message}
        </div>
      )}

      <div className="admin-stats">
        <div className="admin-stat-card">
          <span>Users</span>
          <strong>{stats.users}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Roles</span>
          <strong>{stats.roles}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Permissions</span>
          <strong>{stats.permissions}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Groups</span>
          <strong>{stats.groups}</strong>
        </div>
        <div className="admin-stat-card">
          <span>Columns</span>
          <strong>
            {stats.visibleColumns}/{stats.columns}
          </strong>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={tab === "users" ? "active" : ""}
          onClick={() => setTab("users")}
        >
          Users
        </button>

        <button
          className={tab === "roles" ? "active" : ""}
          onClick={() => setTab("roles")}
        >
          Roles
        </button>

        <button
          className={tab === "permissions" ? "active" : ""}
          onClick={() => setTab("permissions")}
        >
          Permissions
        </button>

        <button
          className={tab === "columns" ? "active" : ""}
          onClick={() => setTab("columns")}
        >
          Columns
        </button>
      </div>

      {tab === "users" && (
        <div className="admin-panel">
          <div className="admin-toolbar">
            <input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <input
              placeholder="Neue User E-Mail"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />

            <button className="btn-primary" onClick={createUser} disabled={busy}>
              {busy ? "Creating..." : "Create User"}
            </button>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Company</th>
                <th>Phone</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="admin-cell-strong">{user.email}</td>

                  <td>
                    <input
                      value={user.name || ""}
                      onChange={(e) =>
                        updateUser(user.id, "name", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={user.company || ""}
                      onChange={(e) =>
                        updateUser(user.id, "company", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={user.phone || ""}
                      onChange={(e) =>
                        updateUser(user.id, "phone", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <select
                      value={user.role_id || ""}
                      onChange={(e) =>
                        updateUser(user.id, "role_id", e.target.value)
                      }
                    >
                      <option value="">No role</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <button
                      className="btn-danger"
                      onClick={() => deleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-empty">
                    Keine User gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "roles" && (
        <div className="admin-panel">
          <div className="admin-toolbar">
            <input
              placeholder="Neue Rolle"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            />

            <button className="btn-primary" onClick={createRole} disabled={busy}>
              {busy ? "Creating..." : "Create Role"}
            </button>
          </div>

          <div className="admin-role-grid">
            {roles.map((role) => {
              const userCount = users.filter((u) => u.role_id === role.id).length;
              const permissionCount = rolePermissions.filter(
                (rp) => rp.role_id === role.id
              ).length;

              return (
                <div key={role.id} className="admin-role-card">
                  <div>
                    <h3>{role.name}</h3>
                    <p>{userCount} User · {permissionCount} Permissions</p>
                  </div>

                  <button
                    className="btn-danger"
                    onClick={() => deleteRole(role.id)}
                  >
                    Delete
                  </button>
                </div>
              );
            })}

            {roles.length === 0 && (
              <div className="admin-empty-card">Noch keine Rollen vorhanden.</div>
            )}
          </div>
        </div>
      )}

      {tab === "permissions" && (
        <div className="admin-panel">
          <div className="permission-table-wrap">
            <table className="admin-table permission-matrix">
              <thead>
                <tr>
                  <th>Permission</th>
                  {roles.map((role) => (
                    <th key={role.id}>{role.name}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission.id}>
                    <td>
                      <div className="permission-cell">
                        <strong>{permission.label || permission.key}</strong>
                        {permission.description && (
                          <span>{permission.description}</span>
                        )}
                      </div>
                    </td>

                    {roles.map((role) => (
                      <td key={role.id}>
                        <input
                          type="checkbox"
                          checked={hasPermission(role.id, permission.id)}
                          onChange={() => togglePermission(role.id, permission)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

                {permissions.length === 0 && (
                  <tr>
                    <td colSpan={roles.length + 1} className="admin-empty">
                      Keine Permissions gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "columns" && (
        <div className="admin-panel">
          <div className="admin-columns-grid">
            <div className="admin-card">
              <h2>Column Groups</h2>

              <div className="admin-toolbar">
                <input
                  placeholder="Neue Gruppe"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                />

                <button className="btn-primary" onClick={createGroup} disabled={busy}>
                  Create Group
                </button>
              </div>

              <div className="admin-group-list">
                {groupedColumns.map(({ group, items }) => (
                  <div key={group.id} className="admin-group-card">
                    <div className="admin-group-head">
                      <div>
                        <h3>{group.name}</h3>
                        <p>{items.length} Spalten</p>
                      </div>
                    </div>

                    <ul className="admin-column-list">
                      {items.map((col) => (
                        <li key={col.id}>
                          <span>{col.label}</span>

                          <button
                            className={col.is_visible ? "btn-secondary" : "btn-primary"}
                            onClick={() => toggleColumn(col.id, col.is_visible)}
                          >
                            {col.is_visible ? "Hide" : "Show"}
                          </button>
                        </li>
                      ))}

                      {items.length === 0 && (
                        <li className="admin-empty-inline">
                          Keine Spalten in dieser Gruppe.
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <h2>Create Column</h2>

              <div className="admin-form-vertical">
                <input
                  placeholder="Column Label"
                  value={newColumn}
                  onChange={(e) => setNewColumn(e.target.value)}
                />

                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <option value="">Select Group</option>
                  {columnGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                <button className="btn-primary" onClick={createColumn} disabled={busy}>
                  Create Column
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}