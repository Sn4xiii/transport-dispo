"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabase-browser"

export default function ColumnsTab(){

const [groups,setGroups] = useState<any[]>([])
const [columns,setColumns] = useState<any[]>([])

useEffect(()=>{

load()

},[])

async function load(){

const { data:g } =
await supabase
.from("column_groups")
.select("*")
.order("position")

const { data:c } =
await supabase
.from("tour_columns")
.select("*")
.order("position")

setGroups(g || [])
setColumns(c || [])

}

return(

<div>

<h2>Columns Builder</h2>

{groups.map(group=>(

<div key={group.id}>

<h3>{group.name}</h3>

<ul>

{columns
.filter(c=>c.column_group_id===group.id)
.map(col=>(

<li key={col.id}>
{col.label}
</li>

))}

</ul>

</div>

))}

</div>

)

}