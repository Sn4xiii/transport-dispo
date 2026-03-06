"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabase-browser"

export default function PermissionsTab(){

const [roles,setRoles] = useState<any[]>([])
const [permissions,setPermissions] = useState<any[]>([])
const [rp,setRp] = useState<any[]>([])

useEffect(()=>{

load()

},[])

async function load(){

const { data:rolesData } =
await supabase.from("roles").select("*")

const { data:permData } =
await supabase.from("permissions").select("*")

const { data:rpData } =
await supabase
.from("role_permissions")
.select("*")

setRoles(rolesData || [])
setPermissions(permData || [])
setRp(rpData || [])

}

function has(role:string,perm:string){

return rp.some(r =>
r.role_id===role &&
r.permission_id===perm
)

}

return(

<div>

<h2>Permissions</h2>

<table>

<thead>

<tr>

<th>Permission</th>

{roles.map(r=>(
<th key={r.id}>{r.name}</th>
))}

</tr>

</thead>

<tbody>

{permissions.map(p=>(

<tr key={p.id}>

<td>{p.key}</td>

{roles.map(role=>(

<td key={role.id}>

<input
type="checkbox"
checked={has(role.id,p.id)}
/>

</td>

))}

</tr>

))}

</tbody>

</table>

</div>

)

}