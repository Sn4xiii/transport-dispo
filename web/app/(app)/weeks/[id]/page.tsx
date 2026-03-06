"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Tour, TourColumn, TourValue } from "@/types/database";
import NewTourModal from "@/components/NewTourModal";
import "./week.css";

/* ================= TYPES ================= */

type PlanningWeek = {
id: string;
year: number;
week_number: number;
};

type PlanningDay = {
id: string;
planning_week_id: string;
date: string;
};

type ColumnGroup = {
id: string;
name: string;
order_index: number;
};

type TourWithRelations = Tour & {
truck_number?: string | null;
planned_arrival_werk1?: string | null;
truck_types?: { name: string } | null;
};

/* ================= PAGE ================= */

export default function WeekDetail() {

const params = useParams()
const weekId = params.id as string

const [week,setWeek] = useState<PlanningWeek|null>(null)
const [days,setDays] = useState<PlanningDay[]>([])
const [groups,setGroups] = useState<ColumnGroup[]>([])
const [columns,setColumns] = useState<TourColumn[]>([])
const [tours,setTours] = useState<TourWithRelations[]>([])
const [values,setValues] = useState<Record<string,Record<string,string>>>({})

const [modalOpen,setModalOpen] = useState(false)
const [selectedDay,setSelectedDay] = useState<string|null>(null)

const saveTimer = useRef<any>(null)

/* ================= LOAD ================= */

useEffect(()=>{

if(!weekId) return

;(async()=>{

const {data:weekData} = await supabase
.from("planning_weeks")
.select("*")
.eq("id",weekId)
.maybeSingle()

const {data:dayData} = await supabase
.from("planning_days")
.select("*")
.eq("planning_week_id",weekId)
.order("date")

const {data:groupData} = await supabase
.from("column_groups")
.select("*")
.eq("is_visible",true)
.order("order_index")

const {data:columnData} = await supabase
.from("tour_columns")
.select("*")
.eq("is_visible",true)
.order("order_index")

const dayIds = (dayData??[]).map(d=>d.id)

const {data:tourData} =
dayIds.length
? await supabase
.from("tours")
.select(`*, truck_types(name)`)
.in("planning_day_id",dayIds)
.order("position")
: {data:[]}

const tourIds = tourData?.map(t=>t.id) ?? []

const {data:valueData} =
tourIds.length
? await supabase
.from("tour_column_values")
.select("*")
.in("tour_id",tourIds)
: {data:[]}

const valueMap:Record<string,Record<string,string>> = {}

;(valueData as TourValue[]).forEach(v=>{

if(!v.tour_id || !v.column_id) return

if(!valueMap[v.tour_id]) valueMap[v.tour_id] = {}

valueMap[v.tour_id][v.column_id] = v.value ?? ""

})

setWeek(weekData??null)
setDays(dayData??[])
setGroups(groupData??[])
setColumns(columnData??[])
setTours((tourData??[]) as TourWithRelations[])
setValues(valueMap)

})()

},[weekId])

/* ================= UPDATE ================= */

async function saveColumn(
tourId:string,
columnId:string,
value:string
){

await supabase
.from("tour_column_values")
.upsert({
tour_id:tourId,
column_id:columnId,
value:value
})

}

/* ================= GROUPING ================= */

const columnsByGroup = useMemo(()=>{

const map:Record<string,TourColumn[]> = {}

groups.forEach(g=>map[g.id] = [])

columns.forEach(c=>{
if(c.column_group_id)
map[c.column_group_id]?.push(c)
})

return map

},[columns,groups])

const toursByDay = useMemo(()=>{

const map:Record<string,TourWithRelations[]> = {}

days.forEach(d=>map[d.id] = [])

tours.forEach(t=>{
if(t.planning_day_id)
map[t.planning_day_id]?.push(t)
})

return map

},[days,tours])

/* ================= CELL ================= */

function renderCell(tour:TourWithRelations,col:TourColumn){

const value = values[tour.id]?.[col.id] ?? ""

return(

<input
value={value}

onChange={(e)=>{

const newValue = e.target.value

setValues(prev=>({
...prev,
[tour.id]:{
...prev[tour.id],
[col.id]:newValue
}
}))

clearTimeout(saveTimer.current)

saveTimer.current = setTimeout(()=>{

saveColumn(tour.id,col.id,newValue)

},500)

}}

className="cell-input"
/>

)

}

/* ================= UI ================= */

if(!week) return <div>Loading...</div>

return(

<div className="week-container">

<h1>
KW {week.week_number} / {week.year}
</h1>

<button
className="btn-primary"
onClick={()=>setModalOpen(true)}

>

* Neue Tour

  </button>

{days.map(day=>{

const dayTours = toursByDay[day.id] ?? []

return(

<div key={day.id} className="day-section">

<h2>
{new Date(day.date).toLocaleDateString("de-DE",{
weekday:"long",
day:"2-digit",
month:"2-digit"
})}
</h2>

<table className="dispo-table">

<thead>

<tr className="group-row">

{groups.map(group=>{

const cols = columnsByGroup[group.id] ?? []

if(!cols.length) return null

return(

<th key={group.id} colSpan={cols.length}>
{group.name}
</th>
)

})}

</tr>

<tr>

{columns.map(col=>(

<th key={col.id}>{col.label}</th>
))}

</tr>

</thead>

<tbody>

{dayTours.map(tour=>(

<tr key={tour.id}>

{columns.map(col=>(

<td key={col.id}>
{renderCell(tour,col)}
</td>
))}

</tr>

))}

</tbody>

</table>

</div>

)

})}

<NewTourModal
isOpen={modalOpen}
onClose={()=>setModalOpen(false)}
weekId={weekId}
dayId={selectedDay}
days={days}
/>

</div>

)

}
