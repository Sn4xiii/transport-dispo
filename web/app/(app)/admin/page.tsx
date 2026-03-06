"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import "./admin.css";

/* ================= TYPES ================= */

type Profile = {
  id: string
  email: string | null
  name: string | null
  company: string | null
  phone: string | null
  role: string | null
}

type Role = {
  id: string
  name: string
}

type Permission = {
  id: string
  key: string
  label: string | null
  description: string | null
}

type RolePermission = {
  role_id: string
  permission_id: string
  permissions: Permission
}

type ColumnGroup = {
  id: string
  name: string
  position: number
  is_visible: boolean
}

type TourColumn = {
  id: string
  label: string
  column_group_id: string
  position: number
  is_visible: boolean
}

/* ================= PAGE ================= */

export default function AdminPage(){

  const [tab,setTab] =
    useState<"users"|"roles"|"permissions"|"columns">("users")

  const [users,setUsers] = useState<Profile[]>([])
  const [roles,setRoles] = useState<Role[]>([])
  const [permissions,setPermissions] = useState<Permission[]>([])
  const [rolePermissions,setRolePermissions] =
    useState<RolePermission[]>([])

  const [columnGroups,setColumnGroups] = useState<ColumnGroup[]>([])
  const [columns,setColumns] = useState<TourColumn[]>([])

  const [search,setSearch] = useState("")
  const [loading,setLoading] = useState(true)

  const [newEmail,setNewEmail] = useState("")
  const [newRole,setNewRole] = useState("")

  const [newGroup,setNewGroup] = useState("")
  const [newColumn,setNewColumn] = useState("")
  const [selectedGroup,setSelectedGroup] = useState("")

  /* ================= LOAD ================= */

  async function load(){

    setLoading(true)

    const { data:usersData } =
      await supabase
        .from("profiles")
        .select("*")
        .order("created_at",{ascending:false})

    if(usersData) setUsers(usersData)

    const { data:rolesData } =
      await supabase.from("roles").select("*")

    if(rolesData) setRoles(rolesData)

    const { data:permissionsData } =
      await supabase.from("permissions").select("*")

    if(permissionsData) setPermissions(permissionsData)

    const { data:rpData } =
      await supabase
        .from("role_permissions")
        .select(`
          role_id,
          permission_id,
          permissions (*)
        `)

    if(rpData) setRolePermissions(rpData)

    const { data:groupsData } =
      await supabase
        .from("column_groups")
        .select("*")
        .order("position")

    if(groupsData) setColumnGroups(groupsData)

    const { data:columnsData } =
      await supabase
        .from("tour_columns")
        .select("*")
        .order("position")

    if(columnsData) setColumns(columnsData)

    setLoading(false)

  }

  useEffect(()=>{
    load()
  },[])

  /* ================= USER SEARCH ================= */

  const filteredUsers = useMemo(()=>{

    const q = search.toLowerCase()

    return users.filter(u =>
      (u.email || "").toLowerCase().includes(q) ||
      (u.name || "").toLowerCase().includes(q)
    )

  },[users,search])

  /* ================= USER UPDATE ================= */

  async function updateUser(
    id:string,
    field:"name"|"company"|"phone"|"role",
    value:string
  ){

    await supabase
      .from("profiles")
      .update({ [field]:value })
      .eq("id",id)

    setUsers(prev =>
      prev.map(u =>
        u.id === id ? { ...u,[field]:value } : u
      )
    )

  }

  /* ================= USER DELETE ================= */

  async function deleteUser(id:string){

    if(!confirm("User löschen?")) return

    await supabase
      .from("profiles")
      .delete()
      .eq("id",id)

    setUsers(prev =>
      prev.filter(u=>u.id !== id)
    )

  }

  /* ================= CREATE USER ================= */

  async function createUser(){

    if(!newEmail) return

    try{

      const res = await fetch("/backend/create-user",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({ email:newEmail })
      })

      const data = await res.json()

      console.log(data)

      if(!res.ok){
        alert(data.error || "User konnte nicht erstellt werden")
        return
      }

      setNewEmail("")

      /* USERS NEU LADEN */

      await load()

    }catch(err){

      console.error(err)
      alert("Server Fehler")

    }

  }

  /* ================= ROLE CREATE ================= */

  async function createRole(){

    if(!newRole) return

    const { data } =
      await supabase
        .from("roles")
        .insert({ name:newRole })
        .select()
        .single()

    if(data){
      setRoles(prev=>[...prev,data])
      setNewRole("")
    }

  }

  /* ================= ROLE DELETE ================= */

  async function deleteRole(id:string){

    if(!confirm("Role löschen?")) return

    await supabase
      .from("roles")
      .delete()
      .eq("id",id)

    setRoles(prev =>
      prev.filter(r=>r.id !== id)
    )

  }

  /* ================= PERMISSION TOGGLE ================= */

  async function togglePermission(roleId:string,permission:Permission){

    const exists = rolePermissions.find(
      rp =>
        rp.role_id === roleId &&
        rp.permission_id === permission.id
    )

    if(exists){

      await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id",roleId)
        .eq("permission_id",permission.id)

      setRolePermissions(prev =>
        prev.filter(
          rp =>
            !(rp.role_id === roleId &&
              rp.permission_id === permission.id)
        )
      )

    }else{

      await supabase
        .from("role_permissions")
        .insert({
          role_id:roleId,
          permission_id:permission.id
        })

      setRolePermissions(prev => [
        ...prev,
        {
          role_id:roleId,
          permission_id:permission.id,
          permissions:permission
        }
      ])

    }

  }

  function hasPermission(roleId:string,permissionId:string){

    return rolePermissions.some(
      rp =>
        rp.role_id === roleId &&
        rp.permission_id === permissionId
    )

  }

  /* ================= COLUMN GROUP CREATE ================= */

  async function createGroup(){

    if(!newGroup) return

    const { data } =
      await supabase
        .from("column_groups")
        .insert({
          name:newGroup,
          position:columnGroups.length + 1,
          is_visible:true
        })
        .select()
        .single()

    if(data){
      setColumnGroups(prev=>[...prev,data])
      setNewGroup("")
    }

  }

  /* ================= COLUMN CREATE ================= */

  async function createColumn(){

    if(!newColumn || !selectedGroup) return

    const { data } =
      await supabase
        .from("tour_columns")
        .insert({
          label:newColumn,
          column_group_id:selectedGroup,
          position:columns.length + 1,
          is_visible:true
        })
        .select()
        .single()

    if(data){
      setColumns(prev=>[...prev,data])
      setNewColumn("")
    }

  }

  /* ================= COLUMN VISIBILITY ================= */

  async function toggleColumn(id:string,visible:boolean){

    await supabase
      .from("tour_columns")
      .update({ is_visible:!visible })
      .eq("id",id)

    setColumns(prev =>
      prev.map(c =>
        c.id===id ? {...c,is_visible:!visible} : c
      )
    )

  }

  if(loading){
    return <div className="admin-container">Loading...</div>
  }

  return(

    <div className="admin-container">

      <h1 className="admin-title">Admin Panel</h1>

      <div className="admin-tabs">

        <button
          className={tab==="users" ? "active":""}
          onClick={()=>setTab("users")}
        >
          Users
        </button>

        <button
          className={tab==="roles" ? "active":""}
          onClick={()=>setTab("roles")}
        >
          Roles
        </button>

        <button
          className={tab==="permissions" ? "active":""}
          onClick={()=>setTab("permissions")}
        >
          Permissions
        </button>

        <button
          className={tab==="columns" ? "active":""}
          onClick={()=>setTab("columns")}
        >
          Columns
        </button>

      </div>

      {/* USERS */}

      {tab==="users" && (

        <div>

          <div className="admin-toolbar">

            <input
              placeholder="Search..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />

            <input
              placeholder="Email"
              value={newEmail}
              onChange={e=>setNewEmail(e.target.value)}
            />

            <button className="btn-primary" onClick={createUser}>
              Create User
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

              {filteredUsers.map(user=>(

                <tr key={user.id}>

                  <td>{user.email}</td>

                  <td>
                    <input
                      value={user.name || ""}
                      onChange={e =>
                        updateUser(user.id,"name",e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={user.company || ""}
                      onChange={e =>
                        updateUser(user.id,"company",e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={user.phone || ""}
                      onChange={e =>
                        updateUser(user.id,"phone",e.target.value)
                      }
                    />
                  </td>

                  <td>

                    <select
                      value={user.role || ""}
                      onChange={e =>
                        updateUser(user.id,"role",e.target.value)
                      }
                    >

                      {roles.map(r=>(
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}

                    </select>

                  </td>

                  <td>

                    <button
                      className="btn-danger"
                      onClick={()=>deleteUser(user.id)}
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>

  )

}