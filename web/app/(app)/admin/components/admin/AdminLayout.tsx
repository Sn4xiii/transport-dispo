"use client"

import AdminSidebar from "./AdminSidebar"

export default function AdminLayout({children}:{children:React.ReactNode}){

return(

<div className="admin-layout">

<AdminSidebar/>

<div className="admin-content">

{children}

</div>

</div>

)

}