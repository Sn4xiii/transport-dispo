"use client"

import AdminSidebar from "./AdminSidebar"

import AdminHeader from "./AdminHeader"
export default function AdminLayout({
  children
}:{children:React.ReactNode}){

return(

<div className="admin-layout">

<AdminSidebar/>

<div className="admin-main">

<AdminHeader/>

<div className="admin-content">

{children}

</div>

</div>

</div>

)

}