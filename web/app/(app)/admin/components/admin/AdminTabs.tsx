"use client"

import { useState } from "react"

import UsersTab from "./tabs/UsersTab"
import RolesTab from "./tabs/RolesTab"
import PermissionsTab from "./tabs/PermissionsTab"
import ColumnsTab from "./tabs/ColumnsTab"


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