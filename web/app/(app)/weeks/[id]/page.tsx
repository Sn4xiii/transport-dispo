"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Tour, TourColumn, TourValue } from "@/types/database";
import NewTourModal from "@/components/NewTourModal";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "./week.css";

/* ================= TYPES ================= */

type PlanningWeek = {
  id: string;
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
};

type PlanningDay = {
  id: string;
  planning_week_id: string;
  date: string;
  position: number;
};

type ColumnGroup = {
  id: string;
  name: string;
  order_index: number;
  is_visible: boolean;
};

type TourWithRelations = Tour & {
  cancelled?: boolean;
  truck_number?: string | null;
  planned_arrival_werk1?: string | null;
  truck_types?: {
    id: string;
    name: string;
  } | null;
};

/* ================= HELPERS ================= */

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 16);
}

function focusNextInput(current: HTMLInputElement, direction: "down" | "right") {

  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>("input")
  );

  const index = inputs.indexOf(current);

  if (direction === "right") {
    inputs[index + 1]?.focus();
  }

  if (direction === "down") {
    inputs[index + 5]?.focus();
  }
}

/* ================= PAGE ================= */

export default function WeekDetail() {

  const params = useParams();
  const weekId = params.id as string;

  const [week, setWeek] = useState<PlanningWeek | null>(null);
  const [days, setDays] = useState<PlanningDay[]>([]);
  const [columns, setColumns] = useState<TourColumn[]>([]);
  const [groups, setGroups] = useState<ColumnGroup[]>([]);
  const [tours, setTours] = useState<TourWithRelations[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});

  const [clipboard, setClipboard] = useState<string | null>(null);
  const [activeEditors, setActiveEditors] = useState<Record<string,string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [openDayId, setOpenDayId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  /* ================= UPDATE ================= */

  async function updateTourField(tourId:string, field:string, value:any){

    await supabase
      .from("tours")
      .update({ [field]: value })
      .eq("id", tourId)

  }

  async function updateColumnValue(
    tourId:string,
    columnId:string,
    value:string
  ){

    await supabase
      .from("tour_column_values")
      .upsert({
        tour_id: tourId,
        column_id: columnId,
        value: value
      })

  }

  /* ================= LOAD ================= */

  useEffect(()=>{

    if(!weekId) return

    ;(async()=>{

      const { data:weekData } =
        await supabase
        .from("planning_weeks")
        .select("*")
        .eq("id",weekId)
        .maybeSingle()

      const { data:dayData } =
        await supabase
        .from("planning_days")
        .select("*")
        .eq("planning_week_id",weekId)
        .order("date")

      const { data:groupData } =
        await supabase
        .from("column_groups")
        .select("*")
        .eq("is_visible",true)
        .order("order_index")

      const { data:columnData } =
        await supabase
        .from("tour_columns")
        .select("*")
        .eq("is_visible",true)
        .order("order_index")

      const dayIds = (dayData ?? []).map(d=>d.id)

      const { data:tourData } =
        dayIds.length
          ? await supabase
            .from("tours")
            .select(`*, truck_types(id,name)`)
            .in("planning_day_id",dayIds)
            .order("position")
          : { data:[] }

      const tourIds = tourData?.map(t=>t.id) ?? []

      const { data:valueData } =
        tourIds.length
          ? await supabase
            .from("tour_column_values")
            .select("*")
            .in("tour_id",tourIds)
          : { data:[] }

      const valueMap:Record<string,Record<string,string>> = {}

      ;(valueData as TourValue[]).forEach(v=>{

        if(!v.tour_id || !v.column_id) return

        if(!valueMap[v.tour_id]) valueMap[v.tour_id] = {}

        valueMap[v.tour_id][v.column_id] = v.value ?? ""

      })

      setWeek(weekData ?? null)
      setDays(dayData ?? [])
      setGroups(groupData ?? [])
      setColumns(columnData ?? [])
      setTours((tourData ?? []) as TourWithRelations[])
      setValues(valueMap)

      if(dayData?.length){

        const today = new Date().toISOString().slice(0,10)
        const todayDay = dayData.find(d=>d.date === today)

        const first = todayDay ?? dayData[0]

        setSelectedDayId(first.id)
        setOpenDayId(first.id)

      }

      setLoading(false)

    })()

  },[weekId])

  /* ================= REALTIME ================= */

  useEffect(()=>{

    const channel = supabase.channel(`week-live-${weekId}`)

    channel
    .on(
      "postgres_changes",
      { event:"*", schema:"public", table:"tours" },
      payload=>{

        setTours(prev=>{

          if(payload.eventType === "INSERT"){
            return [...prev, payload.new as TourWithRelations]
          }

          if(payload.eventType === "UPDATE"){
            const updated = payload.new as TourWithRelations
            return prev.map(t => t.id===updated.id ? updated : t)
          }

          if(payload.eventType === "DELETE"){
            return prev.filter(t=>t.id !== payload.old.id)
          }

          return prev

        })

      }
    )
    .on("broadcast",{event:"editing"}, payload=>{

      setActiveEditors(prev=>({
        ...prev,
        [payload.payload.cell]: payload.payload.user
      }))

    })
    .subscribe()

    return ()=>{ supabase.removeChannel(channel) }

  },[weekId])

  /* ================= DERIVED ================= */

  const visibleColumns =
    useMemo(()=>columns.filter(c=>c.is_visible),[columns])

  const columnsByGroup = useMemo(()=>{

    const map:Record<string,TourColumn[]> = {}

    groups.forEach(g=>map[g.id] = [])

    visibleColumns.forEach(col=>{
      if(col.column_group_id)
        map[col.column_group_id]?.push(col)
    })

    return map

  },[visibleColumns,groups])

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

  const renderCell = (tour:TourWithRelations, col:TourColumn)=>{

    const value = values[tour.id]?.[col.id] ?? ""
    const cellKey = `${tour.id}-${col.id}`
    const editor = activeEditors[cellKey]

    return(

      <input
        className={editor ? "cell-editing" : ""}
        value={value}

        onFocus={()=>{

          supabase.channel(`week-live-${weekId}`).send({
            type:"broadcast",
            event:"editing",
            payload:{
              cell:cellKey,
              user:"dispatcher"
            }
          })

        }}

        onKeyDown={(e)=>{

          const target = e.target as HTMLInputElement

          if(e.ctrlKey && e.key === "c"){
            setClipboard(target.value)
          }

          if(e.ctrlKey && e.key === "v" && clipboard){
            e.preventDefault()
            updateColumnValue(tour.id,col.id,clipboard)
          }

          if(e.key === "Enter"){
            e.preventDefault()
            focusNextInput(target,"down")
          }

          if(e.key === "Tab"){
            focusNextInput(target,"right")
          }

        }}

        onChange={async e=>{

          const newValue = e.target.value

          setValues(prev=>({
            ...prev,
            [tour.id]:{
              ...prev[tour.id],
              [col.id]:newValue
            }
          }))

          await updateColumnValue(tour.id,col.id,newValue)

        }}

      />

    )

  }

  /* ================= UI ================= */

  if(loading) return <div>Lade Woche...</div>
  if(!week) return null

  return(

    <DndProvider backend={HTML5Backend}>

      <div className="week-container">

        <h1>KW {week.week_number} / {week.year}</h1>

        <button
          className="btn-primary"
          onClick={()=>setModalOpen(true)}
        >
          + Tour hinzufügen
        </button>

        {days.map(day=>{

          const dayTours = toursByDay[day.id] ?? []
          const isOpen = openDayId === day.id

          return(

            <div key={day.id} className="day-card">

              <div
                className="day-header"
                onClick={()=>{

                  setOpenDayId(isOpen ? null : day.id)
                  setSelectedDayId(day.id)

                }}
              >

                <div>
                  {new Date(day.date).toLocaleDateString("de-DE",{
                    weekday:"long",
                    day:"2-digit",
                    month:"2-digit"
                  })}
                </div>

                <div className="day-count">
                  {dayTours.length}
                </div>

              </div>

              {isOpen && (

                <div className="table-wrapper">

                  {groups.map(group=>{

                    const groupColumns = columnsByGroup[group.id] ?? []
                    if(!groupColumns.length) return null

                    return(

                      <table key={group.id} className="tour-table">

                        <thead>

                          <tr className="column-group-row">
                            <th colSpan={groupColumns.length}>
                              {group.name}
                            </th>
                          </tr>

                          <tr>
                            {groupColumns.map(col=>(
                              <th key={col.id}>{col.label}</th>
                            ))}
                          </tr>

                        </thead>

                        <tbody>

                          {dayTours.map(tour=>(

                            <tr key={tour.id}>

                              {groupColumns.map(col=>(
                                <td key={col.id}>
                                  {renderCell(tour,col)}
                                </td>
                              ))}

                            </tr>

                          ))}

                        </tbody>

                      </table>

                    )

                  })}

                </div>

              )}

            </div>

          )

        })}

        <NewTourModal
          isOpen={modalOpen}
          onClose={()=>setModalOpen(false)}
          weekId={weekId}
          dayId={selectedDayId}
          days={days}
        />

      </div>

    </DndProvider>

  )

}