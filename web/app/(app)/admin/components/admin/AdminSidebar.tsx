"use client"

import { useState } from "react"

export default function AdminSidebar(){

const [active,setActive] = useState("dashboard")

return(

<div className="admin-sidebar">

<h2>Admin</h2>

<button onClick={()=>setActive("users")}>
Users
</button>

<button onClick={()=>setActive("roles")}>
Roles
</button>

<button onClick={()=>setActive("permissions")}>
Permissions
</button>

<button onClick={()=>setActive("columns")}>
Columns
</button>

</div>

)

}