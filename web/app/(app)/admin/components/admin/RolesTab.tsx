"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-browser"

type Role = {
  id: string
  name: string
}

export default function RolesTab() {

  const [roles, setRoles] = useState<Role[]>([])
  const [newRole, setNewRole] = useState("")

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from("roles")
      .select("*")

    if (data) setRoles(data)
  }

  async function createRole() {

    if (!newRole) return

    const { data } = await supabase
      .from("roles")
      .insert({ name: newRole })
      .select()
      .single()

    if (data) {
      setRoles(prev => [...prev, data])
      setNewRole("")
    }
  }

  return (
    <div>

      <h2>Roles</h2>

      <input
        placeholder="New Role"
        value={newRole}
        onChange={e => setNewRole(e.target.value)}
      />

      <button onClick={createRole}>
        Create Role
      </button>

      <ul>
        {roles.map(role => (
          <li key={role.id}>
            {role.name}
          </li>
        ))}
      </ul>

    </div>
  )
}