"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabase-browser"

type User = {

id:string
email:string | null
name:string | null
company:string | null
phone:string | null

}

export default function UsersTable(){

const [users,setUsers] = useState<User[]>([])
const [search,setSearch] = useState("")

useEffect(()=>{

load()

},[])

async function load(){

const { data } =
await supabase
.from("profiles")
.select("*")
.order("created_at",{ascending:false})

if(data) setUsers(data)

}

const filtered =
users.filter(u =>
(u.email || "")
.toLowerCase()
.includes(search.toLowerCase())
)

return(

<div>

<input
placeholder="Search user..."
value={search}
onChange={e=>setSearch(e.target.value)}
/>

<table>

<thead>

<tr>
<th>Email</th>
<th>Name</th>
<th>Company</th>
<th>Phone</th>
</tr>

</thead>

<tbody>

{filtered.map(user=>(

<tr key={user.id}>

<td>{user.email}</td>

<td>

<input
value={user.name || ""}
onChange={async e=>{

await supabase
.from("profiles")
.update({name:e.target.value})
.eq("id",user.id)

}}

 />

</td>

<td>{user.company}</td>

<td>{user.phone}</td>

</tr>

))}

</tbody>

</table>

</div>

)

}