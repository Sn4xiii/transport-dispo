"use client"

import { useState } from "react"

import UsersTab from "./UsersTab"
import RolesTab from "./RolesTab"
import PermissionsTab from "./PermissionsTab"
import ColumnsTab from "./ColumnsTab"

export default function AdminTabs(){

const [tab,setTab] =
useState<"users"|"roles"|"permissions"|"columns">("users")

return(

<div>

<div className="admin-tabs">

<button onClick={()=>setTab("users")}>Users</button>
<button onClick={()=>setTab("roles")}>Roles</button>
<button onClick={()=>setTab("permissions")}>Permissions</button>
<button onClick={()=>setTab("columns")}>Columns</button>

</div>

{tab==="users" && <UsersTab/>}
{tab==="roles" && <RolesTab/>}
{tab==="permissions" && <PermissionsTab/>}
{tab==="columns" && <ColumnsTab/>}

</div>

)

}