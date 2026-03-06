"use client"

import AdminSidebar from "./AdminSidebar"

export default function AdminLayout({
  children
}:{children:React.ReactNode}){

return(

<div className="admin">

<AdminSidebar/>

<div className="admin-main">

<header className="admin-header">

<h1>DISPO ADMIN</h1>

<input
placeholder="Search..."
className="admin-search"
/>

</header>

<div className="admin-content">

{children}

</div>

</div>

</div>

)

}