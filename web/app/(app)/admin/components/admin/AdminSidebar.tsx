"use client"

import { useRouter } from "next/navigation"

export default function AdminSidebar(){

const router = useRouter()

return(

<div className="admin-sidebar">

<h2 className="logo">
DISPO ADMIN
</h2>

<nav>

<button onClick={()=>router.push("/admin?tab=users")}>
Users
</button>

<button onClick={()=>router.push("/admin?tab=roles")}>
Roles
</button>

<button onClick={()=>router.push("/admin?tab=permissions")}>
Permissions
</button>

<button onClick={()=>router.push("/admin?tab=columns")}>
Columns
</button>

</nav>

</div>

)

}