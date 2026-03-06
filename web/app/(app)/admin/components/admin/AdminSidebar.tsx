"use client"

import { useState } from "react"

export default function AdminSidebar(){

const [tab,setTab] = useState("users")

return(

<div className="sidebar">

<button onClick={()=>setTab("users")}>
Users
</button>

<button onClick={()=>setTab("roles")}>
Roles
</button>

<button onClick={()=>setTab("permissions")}>
Permissions
</button>

<button onClick={()=>setTab("columns")}>
Columns
</button>

</div>

)

}