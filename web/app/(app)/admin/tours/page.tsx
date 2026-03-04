"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tour = {
  id: string
  planning_day_id: string
  planned_arrival_werk1: string | null
  truck_number: string | null
  plate: string | null
  cancelled: boolean
  truck_type_id: string | null
}

type TruckType = {
  id: string
  name: string
}

type PlanningDay = {
  id: string
  date: string
}

type TourView = Tour & {
  truck_type_name?: string
  day_date?: string
}

export default function AdminTours() {

  const [tours, setTours] = useState<TourView[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "cancelled">("all")

  /* ================= LOAD ================= */

  useEffect(() => {

    async function load() {

      setLoading(true)

      const { data: toursData } = await supabase
        .from("tours")
        .select("*")
        .order("planning_day_id")
        .order("position")

      const { data: types } = await supabase
        .from("truck_types")
        .select("*")

      const { data: days } = await supabase
        .from("planning_days")
        .select("*")

      const typeMap = new Map<string, string>()
      const dayMap = new Map<string, string>()

      types?.forEach((t: TruckType) =>
        typeMap.set(t.id, t.name)
      )

      days?.forEach((d: PlanningDay) =>
        dayMap.set(d.id, d.date)
      )

      const merged: TourView[] =
        toursData?.map((tour: Tour) => ({
          ...tour,
          truck_type_name: tour.truck_type_id
            ? typeMap.get(tour.truck_type_id)
            : undefined,
          day_date: dayMap.get(tour.planning_day_id)
        })) ?? []

      setTours(merged)

      setLoading(false)

    }

    load()

  }, [])

  /* ================= FILTERING ================= */

  const filteredTours = useMemo(() => {

    return tours.filter(t => {

      if (filter === "active" && t.cancelled) return false
      if (filter === "cancelled" && !t.cancelled) return false

      if (search) {

        const text =
          `${t.truck_number ?? ""} ${t.plate ?? ""}`
            .toLowerCase()

        if (!text.includes(search.toLowerCase()))
          return false

      }

      return true

    })

  }, [tours, search, filter])

  /* ================= HELPERS ================= */

  function formatDate(date?: string | null) {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("de-DE")
  }

  function formatTime(date?: string | null) {
    if (!date) return ""
    return new Date(date).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  /* ================= ACTIONS ================= */

  async function toggleCancel(id: string, cancelled: boolean) {

    const { error } = await supabase
      .from("tours")
      .update({ cancelled: !cancelled })
      .eq("id", id)

    if (!error) {

      setTours(prev =>
        prev.map(t =>
          t.id === id
            ? { ...t, cancelled: !cancelled }
            : t
        )
      )

    }

  }

  async function deleteTour(id: string) {

    const confirmDelete = confirm("Tour wirklich löschen?")
    if (!confirmDelete) return

    const { error } = await supabase
      .from("tours")
      .delete()
      .eq("id", id)

    if (!error) {
      setTours(prev =>
        prev.filter(t => t.id !== id)
      )
    }

  }

  /* ================= UI ================= */

  if (loading) {
    return <div style={{ padding: 40 }}>Lade...</div>
  }

  return (

    <div style={{ padding: 40, maxWidth: 1100, margin: "0 auto" }}>

      <h1>Admin – Touren</h1>

      <div style={{ display: "flex", gap: 12, marginTop: 20, marginBottom: 20 }}>

        <input
          placeholder="Suche Truck oder Kennzeichen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            width: 260
          }}
        />

        <select
          value={filter}
          onChange={e =>
            setFilter(
              e.target.value as "all" | "active" | "cancelled"
            )
          }
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1"
          }}
        >
          <option value="all">Alle</option>
          <option value="active">Aktiv</option>
          <option value="cancelled">Storniert</option>
        </select>

      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>

        <thead>
          <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
            <th style={{ padding: 10 }}>Datum / Ankunft</th>
            <th style={{ padding: 10 }}>Truck</th>
            <th style={{ padding: 10 }}>Typ</th>
            <th style={{ padding: 10 }}>Kennzeichen</th>
            <th style={{ padding: 10 }}>Aktionen</th>
          </tr>
        </thead>

        <tbody>

          {filteredTours.map(tour => (

            <tr
              key={tour.id}
              style={{
                borderBottom: "1px solid #e2e8f0",
                background: tour.cancelled
                  ? "#fee2e2"
                  : "transparent"
              }}
            >

              <td style={{ padding: 10 }}>

                {formatDate(tour.day_date)}

                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {formatTime(tour.planned_arrival_werk1)}
                </div>

              </td>

              <td style={{ padding: 10 }}>
                {tour.truck_number ?? "-"}
              </td>

              <td style={{ padding: 10 }}>
                {tour.truck_type_name ?? "-"}
              </td>

              <td style={{ padding: 10 }}>
                {tour.plate ?? "-"}
              </td>

              <td style={{ padding: 10 }}>

                <button
                  onClick={() =>
                    toggleCancel(tour.id, tour.cancelled)
                  }
                  style={{
                    background: tour.cancelled
                      ? "#16a34a"
                      : "#f59e0b",
                    color: "white",
                    border: "none",
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginRight: 6
                  }}
                >
                  {tour.cancelled
                    ? "Reaktivieren"
                    : "Stornieren"}
                </button>

                <button
                  onClick={() =>
                    deleteTour(tour.id)
                  }
                  style={{
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: "pointer"
                  }}
                >
                  Löschen
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  )

}