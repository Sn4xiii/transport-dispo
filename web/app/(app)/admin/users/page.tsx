"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./admin.css";

/* ================= TYPES ================= */

type Profile = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
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
  role_id: string;
  permissions: Permission[] | null;
};

/* ================= PAGE ================= */

export default function ProfilePage() {

  const [activeTab,setActiveTab] =
    useState<"profile"|"users"|"permissions">("profile");

  const [profile,setProfile] = useState<Profile | null>(null);
  const [users,setUsers] = useState<Profile[]>([]);
  const [roles,setRoles] = useState<Role[]>([]);
  const [permissions,setPermissions] = useState<Permission[]>([]);

  const [rolePermissions,setRolePermissions] =
    useState<Record<string,string[]>>({});

  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);

  const [name,setName] = useState("");
  const [company,setCompany] = useState("");

  const [newUserEmail,setNewUserEmail] = useState("");

  /* ================= LOAD ================= */

  useEffect(()=>{

    async function loadData(){

      setLoading(true);

      const { data:userData } = await supabase.auth.getUser();
      const user = userData.user;

      if(!user){
        setLoading(false);
        return;
      }

      /* PROFILE */

      const { data:profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id",user.id)
        .maybeSingle();

      if(profileData){

        const profileRow = profileData as Profile;

        setProfile(profileRow);
        setName(profileRow.name ?? "");
        setCompany(profileRow.company ?? "");

      }

      /* USERS */

      const { data:usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at");

      if(usersData){
        setUsers(usersData as Profile[]);
      }

      /* ROLES */

      const { data:rolesData } = await supabase
        .from("roles")
        .select("*")
        .order("name");

      if(rolesData){
        setRoles(rolesData as Role[]);
      }

      /* PERMISSIONS */

      const { data:permissionsData } = await supabase
        .from("permissions")
        .select("*")
        .order("key");

      if(permissionsData){
        setPermissions(permissionsData as Permission[]);
      }

      /* ROLE PERMISSIONS */

      const { data:rolePermData } = await supabase
        .from("role_permissions")
        .select(`
          role_id,
          permissions (
            id,
            key
          )
        `);

      const map:Record<string,string[]> = {};

      if(rolePermData){

        const rows = rolePermData as RolePermissionRow[];

        rows.forEach(row=>{

          if(!map[row.role_id]){
            map[row.role_id] = [];
          }

          const perms = Array.isArray(row.permissions)
            ? row.permissions
            : [];

          perms.forEach(permission=>{
            map[row.role_id].push(permission.key);
          });

        });

      }

      setRolePermissions(map);

      setLoading(false);

    }

    loadData();

  },[]);

  /* ================= SAVE PROFILE ================= */

  async function saveProfile(){

    if(!profile) return;

    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        name,
        company
      })
      .eq("id",profile.id);

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

  async function changeRole(id:string,role:string){

    await supabase
      .from("profiles")
      .update({ role })
      .eq("id",id);

    setUsers(prev =>
      prev.map(u =>
        u.id === id ? { ...u, role } : u
      )
    );

  }

  /* ================= PERMISSION TOGGLE ================= */

  async function togglePermission(roleId:string,permission:Permission){

    const hasPermission =
      rolePermissions[roleId]?.includes(permission.key);

    if(hasPermission){

      await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id",roleId)
        .eq("permission_id",permission.id);

      setRolePermissions(prev=>({

        ...prev,
        [roleId]:prev[roleId].filter(
          p=>p!==permission.key
        )

      }));

    }else{

      await supabase
        .from("role_permissions")
        .insert({
          role_id:roleId,
          permission_id:permission.id
        });

      setRolePermissions(prev=>({

        ...prev,
        [roleId]:[
          ...(prev[roleId] || []),
          permission.key
        ]

      }));

    }

  }

  /* ================= LOGOUT ================= */

  async function logout(){

    await supabase.auth.signOut();
    window.location.href="/login";

  }

  if(loading){
    return <div className="admin-container">Lade...</div>;
  }

  return(

    <div className="admin-container">

      <h1 className="admin-title">
        Benutzerverwaltung
      </h1>

      <div className="admin-tabs">

        <button
          className={activeTab==="profile" ? "admin-tab active" : "admin-tab"}
          onClick={()=>setActiveTab("profile")}
        >
          Profil
        </button>

        <button
          className={activeTab==="users" ? "admin-tab active" : "admin-tab"}
          onClick={()=>setActiveTab("users")}
        >
          Benutzer
        </button>

        <button
          className={activeTab==="permissions" ? "admin-tab active" : "admin-tab"}
          onClick={()=>setActiveTab("permissions")}
        >
          Permissions
        </button>

      </div>

      {/* PROFILE */}

      {activeTab==="profile" && (

        <div className="admin-card">

          <div className="admin-field">
            <label>Email</label>
            <input value={profile?.email ?? ""} disabled/>
          </div>

          <div className="admin-field">
            <label>Name</label>
            <input value={name}
              onChange={e=>setName(e.target.value)}
            />
          </div>

          <div className="admin-field">
            <label>Firma</label>
            <input value={company}
              onChange={e=>setCompany(e.target.value)}
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

      {activeTab==="users" && (

        <div className="admin-card">

          <h3>Benutzer einladen</h3>

          <div className="admin-toolbar">

            <input
              className="admin-search"
              placeholder="Email eingeben"
              value={newUserEmail}
              onChange={e=>setNewUserEmail(e.target.value)}
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

              {users.map(user=>(

                <tr key={user.id}>

                  <td>{user.email}</td>
                  <td>{user.name ?? "-"}</td>

                  <td>

                    <select
                      value={user.role ?? ""}
                      onChange={e =>
                        changeRole(user.id,e.target.value)
                      }
                    >

                      {roles.map(role=>(
                        <option key={role.id} value={role.name}>
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

      {activeTab==="permissions" && (

        <div className="admin-card">

          <h3>Rollen Permissions</h3>

          {roles.map(role=>(

            <div key={role.id} className="permission-role">

              <h4>{role.name}</h4>

              <div className="permission-grid">

                {permissions.map(permission=>{

                  const checked =
                    rolePermissions[role.id]?.includes(permission.key);

                  return(

                    <label
                      key={permission.id}
                      className="permission-item"
                    >

                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={()=>togglePermission(role.id,permission)}
                      />

                      {permission.key}

                    </label>

                  )

                })}

              </div>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}