"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Tour, TourColumn, TourValue } from "@/types/database";
import NewTourModal from "@/components/NewTourModal";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "./week.css";

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

type DragItem = {
  tourId: string;
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

const DND_TYPE = "TOUR_ROW";

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 16);
}

/* ================= DRAG ROW ================= */

function DraggableTourRow({
  tour,
  children
}: {
  tour: Tour;
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
        opacity: isDragging ? 0.5 : 1,
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
  onDropTour: (tourId: string, targetDayId: string) => void;
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
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [openDayId, setOpenDayId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  /* ================= LOAD ================= */

  useEffect(() => {

    if (!weekId) return;

    (async () => {

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

      const { data: columnData } = await supabase
        .from("tour_columns")
        .select("*")
        .eq("active", true)
        .order("position");

      const dayIds = (dayData ?? []).map(d => d.id);

      const { data: tourData } =
        dayIds.length > 0
          ? await supabase
              .from("tours")
              .select(`*, truck_types (id,name)`)
              .in("planning_day_id", dayIds)
              .order("planning_day_id")
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

        if (!valueMap[val.tour_id]) {
          valueMap[val.tour_id] = {};
        }

        valueMap[val.tour_id][val.column_id] = val.value ?? "";

      });

      setWeek(weekData ?? null);
      setDays(dayData ?? []);
      setColumns(columnData ?? []);
      setTours((tourData ?? []) as TourWithRelations[]);
      setValues(valueMap);

      /* ===== HEUTE AUTOMATISCH ÖFFNEN ===== */

      if (dayData?.length) {

        const today = new Date().toISOString().slice(0, 10);

        const todayDay = dayData.find(d => d.date === today);

        if (todayDay) {
          setSelectedDayId(todayDay.id);
          setOpenDayId(todayDay.id);
        } else {
          setSelectedDayId(dayData[0].id);
          setOpenDayId(dayData[0].id);
        }

      }

      setLoading(false);

    })();

  }, [weekId]);

  /* ================= DERIVED ================= */

  const visibleColumns = useMemo(
    () => columns.filter(c => c.visible),
    [columns]
  );

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

  /* ================= UPDATE ================= */

  const saveValue = async (
    tourId: string,
    columnId: string,
    value: string
  ) => {

    setValues(prev => ({
      ...prev,
      [tourId]: {
        ...prev[tourId],
        [columnId]: value
      }
    }));

    await supabase.from("tour_column_values").upsert({
      tour_id: tourId,
      column_id: columnId,
      value
    });

  };

  /* ================= CELL RENDER ================= */

  const renderCell = (tour: TourWithRelations, col: TourColumn) => {

    if (tour.cancelled) {
      return <span className="tour-cancelled-text">storniert</span>;
    }

    switch (col.key) {

      case "truck_number":
        return <input value={tour.truck_number ?? ""} readOnly />;

      case "truck_type_id":
        return <div>{tour.truck_types?.name ?? "-"}</div>;

      case "planned_arrival_werk1":
        return (
          <input
            type="datetime-local"
            value={toDatetimeLocal(tour.planned_arrival_werk1)}
            readOnly
          />
        );

    }

    const value = values[tour.id]?.[col.id] ?? "";

    return (
      <input
        value={value}
        onChange={e =>
          saveValue(
            tour.id,
            col.id,
            e.target.value
          )
        }
      />
    );
  };

  /* ================= UI ================= */

  if (loading) return <div className="week-container">Lade Woche...</div>;
  if (error) return <div className="week-container">{error}</div>;
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
          const isOpen = openDayId === day.id;

          return (
            <div key={day.id} className="day-card">

              <div
                className="day-header"
                onClick={() => {
                  setOpenDayId(isOpen ? null : day.id);
                  setSelectedDayId(day.id);
                }}
              >

                <div>
                  {new Date(day.date).toLocaleDateString("de-DE", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit"
                  })}
                </div>

                <div className="day-count">
                  {dayTours.length}
                </div>

              </div>

              {isOpen && (

                <DayDropZone
                  dayId={day.id}
                  onDropTour={() => {}}
                >

                  <div className="table-wrapper">

                  <table className="tour-table">

                    <thead>
                      <tr>
                        {visibleColumns.map(col => (
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

                          {visibleColumns.map(col => (
                            <td key={col.id}>
                              {renderCell(tour, col)}
                            </td>
                          ))}

                        </DraggableTourRow>

                      ))}

                    </tbody>

                  </table>

                  </div>

                </DayDropZone>

              )}

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