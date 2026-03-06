"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  position?: number;
};

type ColumnGroup = {
  id: string;
  name: string;
  order_index: number;
  is_visible?: boolean;
};

type TourWithRelations = Tour & {
  cancelled?: boolean | null;
  truck_number?: string | null;
  planned_arrival_werk1?: string | null;
  planning_day_id?: string | null;
  position?: number | null;
  truck_type_id?: string | null;
  truck_types?: {
    id?: string;
    name: string;
  } | null;

  gps_link?: string | null;

  pls_shift_loading_date?: string | null;
  pls_shift_loading_time?: string | null;
  pls_shift_planned_date?: string | null;
  pls_shift_planned_time?: string | null;
  pls_shift_registered_arrival_date?: string | null;
  pls_shift_registered_arrival_time?: string | null;

  bgn_shift_loading_arrival_date?: string | null;
  bgn_shift_loading_arrival_time?: string | null;
  bgn_shift_loading_departure_date?: string | null;
  bgn_shift_loading_departure_time?: string | null;
  bgn_shift_delivery_note?: string | null;

  bgn_shift_unloading_planned_date?: string | null;
  bgn_shift_unloading_planned_time?: string | null;
  bgn_shift_unloading_arrival_date?: string | null;
  bgn_shift_unloading_arrival_time?: string | null;
  bgn_shift_unloading_start_date?: string | null;
  bgn_shift_unloading_start_time?: string | null;
  bgn_shift_unloading_departure_date?: string | null;
  bgn_shift_unloading_departure_time?: string | null;

  container_arrival_check?: string | null;

  ewals_delivery_note?: string | null;
  ewals_cmr?: string | null;
  ewals_actual?: string | null;
  ewals_damage?: string | null;

  empties_delivery_note?: string | null;
  empties_green?: boolean | null;
  empties_menthol?: boolean | null;
  empties_lightblue?: boolean | null;
  empties_darkblue?: boolean | null;
  empties_pink?: boolean | null;
  empties_purple?: boolean | null;
  empties_white_karton?: boolean | null;

  pls_plant_unloading_planned_date?: string | null;
  pls_plant_unloading_planned_time?: string | null;

  ceva_registered_arrival_empties_date?: string | null;
  ceva_registered_arrival_empties_time?: string | null;
  rt_st?: string | null;
  plate_numbers?: string | null;
  waiting_times?: string | null;
  comment?: string | null;

  reason_kpi_code_1?: string | null;
  reason_kpi_code_2?: string | null;

  delay_1?: string | null;
  delay_2?: string | null;
  delay_3?: string | null;
  delay_4?: string | null;

  loading_pls?: string | null;
  unloading_empties_pls?: string | null;
  result_1?: string | null;
  result_2?: string | null;
  unloading_result_1?: string | null;
  unloading_result_2?: string | null;

  eta_bgn_date?: string | null;
  eta_bgn_time?: string | null;
};

type DragItem = {
  tourId: string;
  sourceDayId: string | null;
};

type BulkMode = "system" | "custom";

const DND_TYPE = "TOUR_ROW";

/* ================= HELPERS ================= */

function getRowClass(tour: TourWithRelations) {
  if (tour.cancelled) return "tour-row tour-row-cancelled";
  if (tour.truck_types?.name === "SingleTrip") return "tour-row tour-row-singletrip";
  if (tour.truck_types?.name === "Return") return "tour-row tour-row-return";
  return "tour-row";
}

function isSystemColumn(col: TourColumn) {
  return Boolean((col as any).is_system);
}

function getFieldType(col: TourColumn) {
  return ((col as any).field_type ?? "text") as
    | "text"
    | "date"
    | "time"
    | "boolean";
}

function getTourFieldValue(tour: TourWithRelations, key: string) {
  return (tour as Record<string, unknown>)[key];
}

/* ================= DND ================= */

function DraggableRow({
  tour,
  children,
  className,
}: {
  tour: TourWithRelations;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLTableRowElement | null>(null);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: DND_TYPE,
      item: {
        tourId: tour.id,
        sourceDayId: tour.planning_day_id ?? null,
      } satisfies DragItem,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [tour.id, tour.planning_day_id]
  );

  useEffect(() => {
    if (ref.current) drag(ref.current);
  }, [drag]);

  return (
    <tr
      ref={ref}
      className={className}
      style={{ opacity: isDragging ? 0.45 : 1, cursor: "grab" }}
    >
      {children}
    </tr>
  );
}

function DayDropZone({
  dayId,
  onDropTour,
  children,
}: {
  dayId: string;
  onDropTour: (tourId: string, targetDayId: string) => Promise<void>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: DND_TYPE,
      drop: async (item: DragItem) => {
        await onDropTour(item.tourId, dayId);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [dayId, onDropTour]
  );

  useEffect(() => {
    if (ref.current) drop(ref.current);
  }, [drop]);

  return (
    <div
      ref={ref}
      className={isOver && canDrop ? "day-dropzone day-dropzone-active" : "day-dropzone"}
    >
      {children}
    </div>
  );
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
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [bulkMode, setBulkMode] = useState<BulkMode>("system");
  const [bulkColumnId, setBulkColumnId] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [openMenuTourId, setOpenMenuTourId] = useState<string | null>(null);

  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* ================= LOAD ================= */

  useEffect(() => {
    if (!weekId) return;

    let isMounted = true;

    async function loadWeek() {
      setLoading(true);

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

      const dayIds = (dayData ?? []).map((d) => d.id);

      const { data: tourData } =
        dayIds.length > 0
          ? await supabase
              .from("tours")
              .select("*, truck_types(id, name)")
              .in("planning_day_id", dayIds)
              .order("planning_day_id")
              .order("position")
          : { data: [] };

      const tourIds = (tourData ?? []).map((t) => t.id);

      const { data: valueData } =
        tourIds.length > 0
          ? await supabase
              .from("tour_column_values")
              .select("*")
              .in("tour_id", tourIds)
          : { data: [] };

      const valueMap: Record<string, Record<string, string>> = {};

      ((valueData ?? []) as TourValue[]).forEach((val) => {
        if (!val.tour_id || !val.column_id) return;
        if (!valueMap[val.tour_id]) valueMap[val.tour_id] = {};
        valueMap[val.tour_id][val.column_id] = val.value ?? "";
      });

      if (!isMounted) return;

      setWeek(weekData ?? null);
      setDays(dayData ?? []);
      setGroups(groupData ?? []);
      setColumns(columnData ?? []);
      setTours((tourData ?? []) as TourWithRelations[]);
      setValues(valueMap);

      if ((dayData ?? []).length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const todayDay = dayData?.find((d) => d.date === today);
        setSelectedDayId(todayDay?.id ?? dayData?.[0]?.id ?? null);
      }

      const firstSystemColumn = (columnData ?? []).find((c) => (c as any).is_system);
      const firstCustomColumn = (columnData ?? []).find((c) => !(c as any).is_system);

      setBulkColumnId(firstSystemColumn?.id ?? firstCustomColumn?.id ?? "");
      setLoading(false);
    }

    loadWeek();

    return () => {
      isMounted = false;
    };
  }, [weekId]);

  /* ================= MENU CLOSE ================= */

  useEffect(() => {
    function handleClick() {
      setOpenMenuTourId(null);
    }

    if (openMenuTourId) {
      window.addEventListener("click", handleClick);
    }

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [openMenuTourId]);

  /* ================= REALTIME ================= */

  useEffect(() => {
    if (!weekId) return;

    const channel = supabase
      .channel(`week-live-${weekId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tours" },
        (payload) => {
          setTours((prev) => {
            if (payload.eventType === "INSERT") {
              const next = payload.new as TourWithRelations;
              if (prev.some((t) => t.id === next.id)) return prev;
              return [...prev, next];
            }

            if (payload.eventType === "UPDATE") {
              const updated = payload.new as TourWithRelations;
              return prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t));
            }

            if (payload.eventType === "DELETE") {
              return prev.filter((t) => t.id !== payload.old.id);
            }

            return prev;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tour_column_values" },
        (payload) => {
          setValues((prev) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const row = payload.new as TourValue;
              if (!row.tour_id || !row.column_id) return prev;

              return {
                ...prev,
                [row.tour_id]: {
                  ...(prev[row.tour_id] ?? {}),
                  [row.column_id]: row.value ?? "",
                },
              };
            }

            if (payload.eventType === "DELETE") {
              const row = payload.old as TourValue;
              if (!row.tour_id || !row.column_id) return prev;

              const nextTourValues = { ...(prev[row.tour_id] ?? {}) };
              delete nextTourValues[row.column_id];

              return {
                ...prev,
                [row.tour_id]: nextTourValues,
              };
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

  /* ================= DERIVED ================= */

  const visibleColumns = useMemo(() => columns.filter((c) => c.is_visible), [columns]);

  const columnsByGroup = useMemo(() => {
    const map: Record<string, TourColumn[]> = {};
    groups.forEach((g) => {
      map[g.id] = [];
    });

    visibleColumns.forEach((col) => {
      if (!col.column_group_id) return;
      map[col.column_group_id]?.push(col);
    });

    return map;
  }, [groups, visibleColumns]);

  const orderedDayIds = useMemo(() => days.map((d) => d.id), [days]);

  const toursByDay = useMemo(() => {
    const map: Record<string, TourWithRelations[]> = {};
    days.forEach((d) => {
      map[d.id] = [];
    });

    tours.forEach((tour) => {
      if (!tour.planning_day_id) return;
      map[tour.planning_day_id]?.push(tour);
    });

    Object.keys(map).forEach((dayId) => {
      map[dayId].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });

    return map;
  }, [days, tours]);

  /* ================= SAVE ================= */

  const queueTourFieldSave = useCallback((tourId: string, field: string, value: unknown) => {
    const timerKey = `${tourId}:field:${field}`;

    if (saveTimersRef.current[timerKey]) {
      clearTimeout(saveTimersRef.current[timerKey]);
    }

    saveTimersRef.current[timerKey] = setTimeout(async () => {
      const { error } = await supabase
        .from("tours")
        .update({ [field]: value })
        .eq("id", tourId);

      if (error) {
        console.error(`save tours field ${field} failed`, error);
      }
    }, 250);
  }, []);

  const queueCustomValueSave = useCallback((tourId: string, columnId: string, value: string) => {
    const timerKey = `${tourId}:custom:${columnId}`;

    if (saveTimersRef.current[timerKey]) {
      clearTimeout(saveTimersRef.current[timerKey]);
    }

    saveTimersRef.current[timerKey] = setTimeout(async () => {
      const { error } = await supabase
        .from("tour_column_values")
        .upsert({
          tour_id: tourId,
          column_id: columnId,
          value,
        });

      if (error) {
        console.error("save custom value failed", error);
      }
    }, 250);
  }, []);

  /* ================= DND / POSITION ================= */

  async function persistDayPositions(dayId: string, dayTours: TourWithRelations[]) {
    const updates = dayTours.map((tour, index) =>
      supabase
        .from("tours")
        .update({ position: index + 1, planning_day_id: dayId })
        .eq("id", tour.id)
    );

    const results = await Promise.all(updates);
    results.forEach((result) => {
      if (result.error) {
        console.error("position update error", result.error);
      }
    });
  }

  const moveTourWithinDay = useCallback(
    async (dayId: string, tourId: string, direction: "up" | "down") => {
      const dayTours = [...(toursByDay[dayId] ?? [])];
      const currentIndex = dayTours.findIndex((t) => t.id === tourId);

      if (currentIndex === -1) return;

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= dayTours.length) return;

      const reordered = [...dayTours];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      setTours((prev) => {
        const rest = prev.filter((t) => t.planning_day_id !== dayId);
        const updatedDayTours = reordered.map((tour, index) => ({
          ...tour,
          position: index + 1,
          planning_day_id: dayId,
        }));
        return [...rest, ...updatedDayTours];
      });

      await persistDayPositions(
        dayId,
        reordered.map((tour, index) => ({
          ...tour,
          position: index + 1,
          planning_day_id: dayId,
        }))
      );
    },
    [toursByDay]
  );

  const moveTourToDay = useCallback(
    async (tourId: string, targetDayId: string) => {
      const draggedTour = tours.find((t) => t.id === tourId);
      if (!draggedTour) return;

      const sourceDayId = draggedTour.planning_day_id ?? null;

      setTours((prev) => {
        const next = prev.map((tour) =>
          tour.id === tourId
            ? {
                ...tour,
                planning_day_id: targetDayId,
              }
            : tour
        );

        const byDay: Record<string, TourWithRelations[]> = {};
        days.forEach((d) => {
          byDay[d.id] = [];
        });

        next.forEach((tour) => {
          if (tour.planning_day_id && byDay[tour.planning_day_id]) {
            byDay[tour.planning_day_id].push(tour);
          }
        });

        Object.keys(byDay).forEach((dayId) => {
          byDay[dayId]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .forEach((tour, index) => {
              tour.position = index + 1;
            });
        });

        return [...Object.values(byDay).flat()];
      });

      const targetCount = (toursByDay[targetDayId] ?? []).length;

      const { error } = await supabase
        .from("tours")
        .update({
          planning_day_id: targetDayId,
          position: targetCount + 1,
        })
        .eq("id", tourId);

      if (error) {
        console.error("drag move error", error);
        return;
      }

      if (sourceDayId && sourceDayId !== targetDayId) {
        const sourceTours = (toursByDay[sourceDayId] ?? []).filter((t) => t.id !== tourId);
        await persistDayPositions(
          sourceDayId,
          sourceTours.map((tour, index) => ({ ...tour, position: index + 1 }))
        );
      }

      const targetTours = [
        ...(toursByDay[targetDayId] ?? []).filter((t) => t.id !== tourId),
        { ...draggedTour, planning_day_id: targetDayId, position: targetCount + 1 },
      ];

      await persistDayPositions(
        targetDayId,
        targetTours.map((tour, index) => ({ ...tour, position: index + 1 }))
      );
    },
    [days, tours, toursByDay]
  );

  /* ================= ROW SELECT ================= */

  function toggleRowSelection(tourId: string) {
    setSelectedRows((prev) =>
      prev.includes(tourId) ? prev.filter((id) => id !== tourId) : [...prev, tourId]
    );
  }

  function clearSelection() {
    setSelectedRows([]);
  }

  /* ================= BULK EDIT ================= */

  async function applyBulkEdit() {
    if (selectedRows.length === 0 || !bulkColumnId || !bulkValue.trim()) return;

    const selectedColumn = columns.find((c) => c.id === bulkColumnId);
    if (!selectedColumn) return;

    if (isSystemColumn(selectedColumn)) {
      const key = selectedColumn.key;

      if (getFieldType(selectedColumn) === "boolean") {
        const boolValue = bulkValue === "true";

        setTours((prev) =>
          prev.map((tour) =>
            selectedRows.includes(tour.id)
              ? { ...tour, [key]: boolValue }
              : tour
          )
        );

        const updates = selectedRows.map((tourId) =>
          supabase.from("tours").update({ [key]: boolValue }).eq("id", tourId)
        );

        await Promise.all(updates);
      } else {
        setTours((prev) =>
          prev.map((tour) =>
            selectedRows.includes(tour.id)
              ? { ...tour, [key]: bulkValue }
              : tour
          )
        );

        const updates = selectedRows.map((tourId) =>
          supabase.from("tours").update({ [key]: bulkValue }).eq("id", tourId)
        );

        await Promise.all(updates);
      }
    } else {
      setValues((prev) => {
        const next = { ...prev };

        selectedRows.forEach((tourId) => {
          next[tourId] = {
            ...(next[tourId] ?? {}),
            [selectedColumn.id]: bulkValue,
          };
        });

        return next;
      });

      const updates = selectedRows.map((tourId) =>
        supabase.from("tour_column_values").upsert({
          tour_id: tourId,
          column_id: selectedColumn.id,
          value: bulkValue,
        })
      );

      await Promise.all(updates);
    }

    setBulkValue("");
  }

  /* ================= TOUR ACTIONS ================= */

  async function toggleCancelled(tour: TourWithRelations) {
    const nextValue = !tour.cancelled;

    setTours((prev) =>
      prev.map((t) =>
        t.id === tour.id
          ? { ...t, cancelled: nextValue }
          : t
      )
    );

    const { error } = await supabase
      .from("tours")
      .update({ cancelled: nextValue })
      .eq("id", tour.id);

    if (error) {
      console.error("toggle cancelled error", error);
    }

    setOpenMenuTourId(null);
  }

  async function deleteTour(tour: TourWithRelations) {
    const ok = window.confirm("Tour wirklich löschen?");
    if (!ok) return;

    setTours((prev) => prev.filter((t) => t.id !== tour.id));
    setSelectedRows((prev) => prev.filter((id) => id !== tour.id));

    await supabase.from("tour_column_values").delete().eq("tour_id", tour.id);
    const { error } = await supabase.from("tours").delete().eq("id", tour.id);

    if (error) {
      console.error("delete tour error", error);
    }

    setOpenMenuTourId(null);
  }

  async function duplicateTour(tour: TourWithRelations) {
    const targetDayId = tour.planning_day_id ?? selectedDayId;
    if (!targetDayId) return;

    const nextPosition = ((toursByDay[targetDayId] ?? []).length || 0) + 1;

    const duplicatePayload = {
      planning_day_id: targetDayId,
      position: nextPosition,

      gps_link: tour.gps_link ?? null,

      pls_shift_loading_date: tour.pls_shift_loading_date ?? null,
      pls_shift_loading_time: tour.pls_shift_loading_time ?? null,
      pls_shift_planned_date: tour.pls_shift_planned_date ?? null,
      pls_shift_planned_time: tour.pls_shift_planned_time ?? null,
      pls_shift_registered_arrival_date: tour.pls_shift_registered_arrival_date ?? null,
      pls_shift_registered_arrival_time: tour.pls_shift_registered_arrival_time ?? null,

      bgn_shift_loading_arrival_date: tour.bgn_shift_loading_arrival_date ?? null,
      bgn_shift_loading_arrival_time: tour.bgn_shift_loading_arrival_time ?? null,
      bgn_shift_loading_departure_date: tour.bgn_shift_loading_departure_date ?? null,
      bgn_shift_loading_departure_time: tour.bgn_shift_loading_departure_time ?? null,
      bgn_shift_delivery_note: tour.bgn_shift_delivery_note ?? null,

      bgn_shift_unloading_planned_date: tour.bgn_shift_unloading_planned_date ?? null,
      bgn_shift_unloading_planned_time: tour.bgn_shift_unloading_planned_time ?? null,
      bgn_shift_unloading_arrival_date: tour.bgn_shift_unloading_arrival_date ?? null,
      bgn_shift_unloading_arrival_time: tour.bgn_shift_unloading_arrival_time ?? null,
      bgn_shift_unloading_start_date: tour.bgn_shift_unloading_start_date ?? null,
      bgn_shift_unloading_start_time: tour.bgn_shift_unloading_start_time ?? null,
      bgn_shift_unloading_departure_date: tour.bgn_shift_unloading_departure_date ?? null,
      bgn_shift_unloading_departure_time: tour.bgn_shift_unloading_departure_time ?? null,

      container_arrival_check: tour.container_arrival_check ?? null,

      ewals_delivery_note: tour.ewals_delivery_note ?? null,
      ewals_cmr: tour.ewals_cmr ?? null,
      ewals_actual: tour.ewals_actual ?? null,
      ewals_damage: tour.ewals_damage ?? null,

      empties_delivery_note: tour.empties_delivery_note ?? null,
      empties_green: tour.empties_green ?? false,
      empties_menthol: tour.empties_menthol ?? false,
      empties_lightblue: tour.empties_lightblue ?? false,
      empties_darkblue: tour.empties_darkblue ?? false,
      empties_pink: tour.empties_pink ?? false,
      empties_purple: tour.empties_purple ?? false,
      empties_white_karton: tour.empties_white_karton ?? false,

      pls_plant_unloading_planned_date: tour.pls_plant_unloading_planned_date ?? null,
      pls_plant_unloading_planned_time: tour.pls_plant_unloading_planned_time ?? null,

      ceva_registered_arrival_empties_date: tour.ceva_registered_arrival_empties_date ?? null,
      ceva_registered_arrival_empties_time: tour.ceva_registered_arrival_empties_time ?? null,
      rt_st: tour.rt_st ?? null,
      plate_numbers: tour.plate_numbers ?? null,
      waiting_times: tour.waiting_times ?? null,
      comment: tour.comment ?? null,

      reason_kpi_code_1: tour.reason_kpi_code_1 ?? null,
      reason_kpi_code_2: tour.reason_kpi_code_2 ?? null,

      delay_1: tour.delay_1 ?? null,
      delay_2: tour.delay_2 ?? null,
      delay_3: tour.delay_3 ?? null,
      delay_4: tour.delay_4 ?? null,

      loading_pls: tour.loading_pls ?? null,
      unloading_empties_pls: tour.unloading_empties_pls ?? null,
      result_1: tour.result_1 ?? null,
      result_2: tour.result_2 ?? null,
      unloading_result_1: tour.unloading_result_1 ?? null,
      unloading_result_2: tour.unloading_result_2 ?? null,

      eta_bgn_date: tour.eta_bgn_date ?? null,
      eta_bgn_time: tour.eta_bgn_time ?? null,

      cancelled: false,
      truck_number: tour.truck_number ?? null,
      truck_type_id: tour.truck_type_id ?? null,
      planned_arrival_werk1: tour.planned_arrival_werk1 ?? null,
    };

    const { data: insertedTour, error } = await supabase
      .from("tours")
      .insert(duplicatePayload)
      .select("*")
      .single();

    if (error || !insertedTour) {
      console.error("duplicate insert error", error);
      return;
    }

    const sourceCustomValues = values[tour.id] ?? {};
    const customColumns = columns.filter((c) => !isSystemColumn(c));
    const allowedCustomIds = new Set(customColumns.map((c) => c.id));

    const inserts = Object.entries(sourceCustomValues)
      .filter(([columnId]) => allowedCustomIds.has(columnId))
      .map(([columnId, value]) => ({
        tour_id: insertedTour.id,
        column_id: columnId,
        value,
      }));

    if (inserts.length > 0) {
      await supabase.from("tour_column_values").insert(inserts);
    }

    setOpenMenuTourId(null);
  }

  /* ================= RENDER CELL ================= */

  function renderSystemCell(tour: TourWithRelations, col: TourColumn) {
    const key = col.key;
    const fieldType = getFieldType(col);
    const currentValue = getTourFieldValue(tour, key);

    if (tour.cancelled) {
      return <span className="tour-cancelled-text">storniert</span>;
    }

    if (fieldType === "boolean") {
      const checked = Boolean(currentValue);

      return (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            const newValue = e.target.checked;

            setTours((prev) =>
              prev.map((t) =>
                t.id === tour.id
                  ? { ...t, [key]: newValue }
                  : t
              )
            );

            queueTourFieldSave(tour.id, key, newValue);
          }}
        />
      );
    }

    if (fieldType === "date") {
      return (
        <input
          className="cell-input"
          type="date"
          value={(currentValue as string | null) ?? ""}
          onChange={(e) => {
            const newValue = e.target.value || null;

            setTours((prev) =>
              prev.map((t) =>
                t.id === tour.id
                  ? { ...t, [key]: newValue }
                  : t
              )
            );

            queueTourFieldSave(tour.id, key, newValue);
          }}
        />
      );
    }

    if (fieldType === "time") {
      return (
        <input
          className="cell-input"
          type="time"
          value={(currentValue as string | null)?.slice(0, 5) ?? ""}
          onChange={(e) => {
            const newValue = e.target.value || null;

            setTours((prev) =>
              prev.map((t) =>
                t.id === tour.id
                  ? { ...t, [key]: newValue }
                  : t
              )
            );

            queueTourFieldSave(tour.id, key, newValue);
          }}
        />
      );
    }

    return (
      <input
        className="cell-input"
        type="text"
        value={(currentValue as string | null) ?? ""}
        onChange={(e) => {
          const newValue = e.target.value;

          setTours((prev) =>
            prev.map((t) =>
              t.id === tour.id
                ? { ...t, [key]: newValue }
                : t
            )
          );

          queueTourFieldSave(tour.id, key, newValue);
        }}
      />
    );
  }

  function renderCustomCell(tour: TourWithRelations, col: TourColumn) {
    const value = values[tour.id]?.[col.id] ?? "";

    if (tour.cancelled) {
      return <span className="tour-cancelled-text">storniert</span>;
    }

    return (
      <input
        className="cell-input"
        type="text"
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;

          setValues((prev) => ({
            ...prev,
            [tour.id]: {
              ...(prev[tour.id] ?? {}),
              [col.id]: newValue,
            },
          }));

          queueCustomValueSave(tour.id, col.id, newValue);
        }}
      />
    );
  }

  function renderCell(tour: TourWithRelations, col: TourColumn) {
    if (isSystemColumn(col)) {
      return renderSystemCell(tour, col);
    }

    return renderCustomCell(tour, col);
  }

  /* ================= UI ================= */

  if (loading) {
    return <div className="week-container">Lade Woche...</div>;
  }

  if (!week) {
    return <div className="week-container">Woche nicht gefunden.</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="week-container">
        <div className="week-toolbar">
          <div>
            <h1>
              KW {week.week_number} / {week.year}
            </h1>
            <p className="week-subtitle">
              {days.length} Tage · {tours.length} Touren
            </p>
          </div>

          <div className="week-toolbar-actions">
            {selectedRows.length > 0 && (
              <div className="selection-badge">{selectedRows.length} markiert</div>
            )}

            <button className="btn-secondary" onClick={clearSelection}>
              Auswahl löschen
            </button>

            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              + Neue Tour
            </button>
          </div>
        </div>

        <div className="bulk-panel">
          <div className="bulk-panel-title">Bulk Edit</div>

          <div className="bulk-panel-row">
            <select
              className="bulk-select"
              value={bulkMode}
              onChange={(e) => setBulkMode(e.target.value as BulkMode)}
            >
              <option value="system">Systemfelder</option>
              <option value="custom">Custom Felder</option>
            </select>

            <select
              className="bulk-select"
              value={bulkColumnId}
              onChange={(e) => setBulkColumnId(e.target.value)}
            >
              {visibleColumns
                .filter((col) =>
                  bulkMode === "system" ? isSystemColumn(col) : !isSystemColumn(col)
                )
                .map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
            </select>

            <input
              className="bulk-input"
              placeholder="Wert für markierte Touren"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
            />

            <button className="btn-primary" onClick={applyBulkEdit}>
              Auf markierte anwenden
            </button>
          </div>
        </div>

        {days.map((day) => {
          const dayTours = toursByDay[day.id] ?? [];

          return (
            <section key={day.id} className="day-section">
              <div className="day-section-header">
                <h2>
                  {new Date(day.date).toLocaleDateString("de-DE", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </h2>

                <div className="day-meta">
                  <span>{dayTours.length} Touren</span>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedDayId(day.id);
                      setModalOpen(true);
                    }}
                  >
                    + Tour für diesen Tag
                  </button>
                </div>
              </div>

              <DayDropZone dayId={day.id} onDropTour={moveTourToDay}>
                <div className="table-scroll">
                  <table className="dispo-table">
                    <thead>
                      <tr className="group-row">
                        <th rowSpan={2} className="sticky-col select-col">✓</th>
                        <th rowSpan={2} className="action-col">⇅</th>
                        <th rowSpan={2} className="menu-col">⋯</th>

                        {groups.map((group) => {
                          const groupColumns = columnsByGroup[group.id] ?? [];
                          if (!groupColumns.length) return null;

                          return (
                            <th key={group.id} colSpan={groupColumns.length}>
                              {group.name}
                            </th>
                          );
                        })}
                      </tr>

                      <tr>
                        {visibleColumns.map((col) => (
                          <th key={col.id}>{col.label}</th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {dayTours.map((tour) => {
                        const rowClass = getRowClass(tour);
                        const isSelected = selectedRows.includes(tour.id);
                        const menuOpen = openMenuTourId === tour.id;

                        return (
                          <DraggableRow
                            key={tour.id}
                            tour={tour}
                            className={`${rowClass} ${isSelected ? "tour-row-selected" : ""}`}
                          >
                            <td className="sticky-col select-col">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRowSelection(tour.id)}
                              />
                            </td>

                            <td className="action-col">
                              <div className="row-actions">
                                <button
                                  className="icon-btn"
                                  onClick={() => moveTourWithinDay(day.id, tour.id, "up")}
                                  title="Nach oben"
                                >
                                  ↑
                                </button>
                                <button
                                  className="icon-btn"
                                  onClick={() => moveTourWithinDay(day.id, tour.id, "down")}
                                  title="Nach unten"
                                >
                                  ↓
                                </button>
                              </div>
                            </td>

                            <td className="menu-col">
                              <div className="tour-menu-wrap" onClick={(e) => e.stopPropagation()}>
                                <button
                                  className="icon-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuTourId(menuOpen ? null : tour.id);
                                  }}
                                  title="Tour Aktionen"
                                >
                                  ⋯
                                </button>

                                {menuOpen && (
                                  <div className="tour-menu">
                                    <button
                                      className="tour-menu-item"
                                      onClick={() => toggleCancelled(tour)}
                                    >
                                      {tour.cancelled ? "Reaktivieren" : "Stornieren"}
                                    </button>

                                    <button
                                      className="tour-menu-item"
                                      onClick={() => duplicateTour(tour)}
                                    >
                                      Duplizieren
                                    </button>

                                    <button
                                      className="tour-menu-item tour-menu-item-danger"
                                      onClick={() => deleteTour(tour)}
                                    >
                                      Löschen
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            {visibleColumns.map((col) => (
                              <td key={col.id}>{renderCell(tour, col)}</td>
                            ))}
                          </DraggableRow>
                        );
                      })}

                      {dayTours.length === 0 && (
                        <tr>
                          <td colSpan={visibleColumns.length + 3} className="empty-day-cell">
                            Keine Touren. Zieh eine Tour hierher oder lege eine neue an.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </DayDropZone>
            </section>
          );
        })}

        <NewTourModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          weekId={weekId}
          dayId={selectedDayId ?? orderedDayIds[0] ?? null}
          days={days}
        />
      </div>
    </DndProvider>
  );
}