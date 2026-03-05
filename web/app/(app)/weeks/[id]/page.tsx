"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Tour, TourColumn, TourValue } from "@/types/database";
import NewTourModal from "@/components/NewTourModal";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
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
  position: number;
};

type ColumnGroup = {
  id: string;
  name: string;
  order_index: number;
  is_visible: boolean;
};

type DragItem = {
  tourId: string;
};

type TourWithRelations = Tour & {
  cancelled?: boolean;
  truck_types?: {
    id: string;
    name: string;
  } | null;
};

const DND_TYPE = "TOUR_ROW";

/* ================= DRAG ROW ================= */

function DraggableTourRow({
  tour,
  children
}: {
  tour: TourWithRelations;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLTableRowElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_TYPE,
    item: { tourId: tour.id },
    collect: monitor => ({
      isDragging: monitor.isDragging()
    })
  }));

  useEffect(() => {
    if (ref.current) drag(ref);
  }, [drag]);

  return (
    <tr
      ref={ref}
      style={{
        opacity: isDragging ? 0.4 : 1,
        cursor: "move"
      }}
    >
      {children}
    </tr>
  );
}

/* ================= DROP ZONE ================= */

function DayDropZone({
  dayId,
  onDropTour,
  children
}: {
  dayId: string;
  onDropTour: (tourId: string, dayId: string) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop(() => ({
    accept: DND_TYPE,
    drop: (item: DragItem) => {
      onDropTour(item.tourId, dayId);
    }
  }));

  useEffect(() => {
    if (ref.current) drop(ref);
  }, [drop]);

  return <div ref={ref}>{children}</div>;
}

/* ================= PAGE ================= */

export default function WeekDetail() {

  const params = useParams();
  const weekId = params.id as string;

  const [week, setWeek] = useState<PlanningWeek | null>(null);
  const [days, setDays] = useState<PlanningDay[]>([]);
  const [tours, setTours] = useState<TourWithRelations[]>([]);
  const [columns, setColumns] = useState<TourColumn[]>([]);
  const [groups, setGroups] = useState<ColumnGroup[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD ================= */

  useEffect(() => {

    if (!weekId) return;

    async function load() {

      const { data: weekData } = await supabase
        .from("planning_weeks")
        .select("*")
        .eq("id", weekId)
        .maybeSingle();

      const { data: dayData } = await supabase
        .from("planning_days")
        .select("*")
        .eq("planning_week_id", weekId)
        .order("date");

      const { data: groupData } = await supabase
        .from("column_groups")
        .select("*")
        .eq("is_visible", true)
        .order("order_index");

      const { data: columnData } = await supabase
        .from("tour_columns")
        .select("*")
        .eq("is_visible", true)
        .order("order_index");

      const dayIds = (dayData ?? []).map(d => d.id);

      const { data: tourData } =
        dayIds.length > 0
          ? await supabase
              .from("tours")
              .select(`*, truck_types (id,name)`)
              .in("planning_day_id", dayIds)
              .order("position")
          : { data: [] };

      const tourIds = tourData?.map(t => t.id) ?? [];

      const { data: valueData } =
        tourIds.length > 0
          ? await supabase
              .from("tour_column_values")
              .select("*")
              .in("tour_id", tourIds)
          : { data: [] };

      const valueMap: Record<string, Record<string, string>> = {};

      (valueData as TourValue[]).forEach(val => {
        if (!val.tour_id || !val.column_id) return;
        if (!valueMap[val.tour_id]) valueMap[val.tour_id] = {};
        valueMap[val.tour_id][val.column_id] = val.value ?? "";
      });

      setWeek(weekData ?? null);
      setDays(dayData ?? []);
      setGroups(groupData ?? []);
      setColumns(columnData ?? []);
      setTours((tourData ?? []) as TourWithRelations[]);
      setValues(valueMap);

      if (dayData?.length) {
        setSelectedDayId(dayData[0].id);
      }

      setLoading(false);
    }

    load();

  }, [weekId]);

  /* ================= REALTIME ================= */

  useEffect(() => {

    if (!weekId) return;

    const channel = supabase
      .channel(`week-${weekId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tours" },
        payload => {

          setTours(prev => {

            if (payload.eventType === "INSERT") {
              return [...prev, payload.new as TourWithRelations];
            }

            if (payload.eventType === "UPDATE") {
              return prev.map(t =>
                t.id === payload.new.id
                  ? { ...t, ...(payload.new as TourWithRelations) }
                  : t
              );
            }

            if (payload.eventType === "DELETE") {
              return prev.filter(t => t.id !== payload.old.id);
            }

            return prev;

          });

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [weekId]);

  /* ================= DRAG DROP ================= */

  async function moveTour(tourId: string, dayId: string) {

    await supabase
      .from("tours")
      .update({ planning_day_id: dayId })
      .eq("id", tourId);

  }

  /* ================= DERIVED ================= */

  const visibleColumns = useMemo(
    () => columns.filter(c => c.visible),
    [columns]
  );

  const columnsByGroup = useMemo(() => {

    const map: Record<string, TourColumn[]> = {};

    groups.forEach(g => {
      map[g.id] = [];
    });

    visibleColumns.forEach(col => {
      if (!col.column_group_id) return;
      map[col.column_group_id]?.push(col);
    });

    return map;

  }, [visibleColumns, groups]);

  const toursByDay = useMemo(() => {

    const map: Record<string, TourWithRelations[]> = {};

    days.forEach(d => {
      map[d.id] = [];
    });

    tours.forEach(t => {
      if (!t.planning_day_id) return;
      map[t.planning_day_id]?.push(t);
    });

    return map;

  }, [days, tours]);

  /* ================= CELL ================= */

  function renderCell(tour: TourWithRelations, col: TourColumn) {

    if (tour.cancelled) {
      return <span className="tour-cancelled-text">storniert</span>;
    }

    const value = values[tour.id]?.[col.id] ?? "";

    return <input value={value} readOnly />;

  }

  /* ================= UI ================= */

  if (loading) {
    return <div className="week-container">Lade Woche...</div>;
  }

  if (!week) return null;

  return (

    <DndProvider backend={HTML5Backend}>

      <div className="week-container">

        <h1>
          KW {week.week_number} / {week.year}
        </h1>

        <button
          className="btn-primary"
          onClick={() => setModalOpen(true)}
        >
          + Tour hinzufügen
        </button>

        {days.map(day => {

          const dayTours = toursByDay[day.id] ?? [];

          return (

            <div key={day.id} className="day-card">

              <div className="day-header">

                {new Date(day.date).toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit"
                })}

                <span className="day-count">
                  {dayTours.length}
                </span>

              </div>

              <DayDropZone
                dayId={day.id}
                onDropTour={moveTour}
              >

                {groups.map(group => {

                  const groupColumns = columnsByGroup[group.id] ?? [];
                  if (!groupColumns.length) return null;

                  const isOpen = openGroups.includes(group.id);

                  return (

                    <div key={group.id} className="column-group">

                      <div
                        className="group-header"
                        onClick={() => {

                          setOpenGroups(prev =>
                            prev.includes(group.id)
                              ? prev.filter(g => g !== group.id)
                              : [...prev, group.id]
                          );

                        }}
                      >
                        {isOpen ? "▼" : "▶"} {group.name}
                      </div>

                      {isOpen && (

                        <table className="tour-table">

                          <thead>
                            <tr>
                              {groupColumns.map(col => (
                                <th key={col.id}>{col.label}</th>
                              ))}
                            </tr>
                          </thead>

                          <tbody>

                            {dayTours.map(tour => (

                              <DraggableTourRow
                                key={tour.id}
                                tour={tour}
                              >

                                {groupColumns.map(col => (
                                  <td key={col.id}>
                                    {renderCell(tour, col)}
                                  </td>
                                ))}

                              </DraggableTourRow>

                            ))}

                          </tbody>

                        </table>

                      )}

                    </div>

                  );

                })}

              </DayDropZone>

            </div>

          );

        })}

        <NewTourModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          weekId={weekId}
          dayId={selectedDayId}
          days={days}
        />

      </div>

    </DndProvider>

  );

}