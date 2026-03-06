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
  start_date?: string;
  end_date?: string;
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

type TruckTypeRelation = {
  id?: string;
  name: string;
} | null;

type TourWithRelations = Tour & {
  cancelled?: boolean | null;
  truck_number?: string | null;
  planned_arrival_werk1?: string | null;
  planning_day_id?: string | null;
  position?: number | null;
  truck_type_id?: string | null;
  truck_types?: TruckTypeRelation;
};

type DragItem = {
  tourId: string;
  sourceDayId: string | null;
};

type CellCoord = {
  row: number;
  col: number;
};

type BulkMode = "truck_number" | "custom";

const DND_TYPE = "TOUR_ROW";

/* ================= HELPERS ================= */

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;
  return value.length === 16 ? `${value}:00` : value;
}

function getRowClass(tour: TourWithRelations) {
  if (tour.cancelled) return "tour-row tour-row-cancelled";
  if (tour.truck_types?.name === "SingleTrip") return "tour-row tour-row-singletrip";
  if (tour.truck_types?.name === "Return") return "tour-row tour-row-return";
  return "tour-row";
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

  const [copiedCellValue, setCopiedCellValue] = useState("");
  const [bulkMode, setBulkMode] = useState<BulkMode>("truck_number");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkColumnId, setBulkColumnId] = useState("");
  const [openMenuTourId, setOpenMenuTourId] = useState<string | null>(null);

  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* ================= LOAD ================= */

  useEffect(() => {
    if (!weekId) return;

    let isMounted = true;

    async function loadWeek() {
      setLoading(true);

      const { data: weekData, error: weekError } = await supabase
        .from("planning_weeks")
        .select("*")
        .eq("id", weekId)
        .maybeSingle();

      if (weekError) console.error("planning_weeks load error", weekError);

      const { data: dayData, error: dayError } = await supabase
        .from("planning_days")
        .select("*")
        .eq("planning_week_id", weekId)
        .order("date");

      if (dayError) console.error("planning_days load error", dayError);

      const { data: groupData, error: groupError } = await supabase
        .from("column_groups")
        .select("*")
        .eq("is_visible", true)
        .order("order_index");

      if (groupError) console.error("column_groups load error", groupError);

      const { data: columnData, error: columnError } = await supabase
        .from("tour_columns")
        .select("*")
        .eq("is_visible", true)
        .order("order_index");

      if (columnError) console.error("tour_columns load error", columnError);

      const dayIds = (dayData ?? []).map((d) => d.id);

      const tourResponse =
        dayIds.length > 0
          ? await supabase
              .from("tours")
              .select("*, truck_types(id, name)")
              .in("planning_day_id", dayIds)
              .order("planning_day_id")
              .order("position")
          : { data: [], error: null };

      if (tourResponse.error) console.error("tours load error", tourResponse.error);

      const tourData = (tourResponse.data ?? []) as TourWithRelations[];
      const tourIds = tourData.map((t) => t.id);

      const valueResponse =
        tourIds.length > 0
          ? await supabase.from("tour_column_values").select("*").in("tour_id", tourIds)
          : { data: [], error: null };

      if (valueResponse.error) {
        console.error("tour_column_values load error", valueResponse.error);
      }

      const valueMap: Record<string, Record<string, string>> = {};

      ((valueResponse.data ?? []) as TourValue[]).forEach((val) => {
        if (!val.tour_id || !val.column_id) return;
        if (!valueMap[val.tour_id]) valueMap[val.tour_id] = {};
        valueMap[val.tour_id][val.column_id] = val.value ?? "";
      });

      if (!isMounted) return;

      setWeek(weekData ?? null);
      setDays(dayData ?? []);
      setGroups(groupData ?? []);
      setColumns(columnData ?? []);
      setTours(tourData);
      setValues(valueMap);

      if ((dayData ?? []).length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const todayDay = dayData?.find((d) => d.date === today);
        setSelectedDayId(todayDay?.id ?? dayData?.[0]?.id ?? null);
      }

      const customColumns = (columnData ?? []).filter(
        (col) =>
          col.key !== "truck_number" &&
          col.key !== "truck_type_id" &&
          col.key !== "planned_arrival_werk1"
      );

      setBulkColumnId(customColumns[0]?.id ?? "");
      setLoading(false);
    }

    loadWeek();

    return () => {
      isMounted = false;
    };
  }, [weekId]);

  /* ================= CLICK OUTSIDE MENU ================= */

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

  const queueColumnSave = useCallback((tourId: string, columnId: string, value: string) => {
    const timerKey = `${tourId}:${columnId}`;

    if (saveTimersRef.current[timerKey]) {
      clearTimeout(saveTimersRef.current[timerKey]);
    }

    saveTimersRef.current[timerKey] = setTimeout(async () => {
      const { error } = await supabase.from("tour_column_values").upsert({
        tour_id: tourId,
        column_id: columnId,
        value,
      });

      if (error) console.error("tour_column_values save error", error);
    }, 300);
  }, []);

  const queueTourFieldSave = useCallback((tourId: string, field: string, value: unknown) => {
    const timerKey = `${tourId}:field:${field}`;

    if (saveTimersRef.current[timerKey]) {
      clearTimeout(saveTimersRef.current[timerKey]);
    }

    saveTimersRef.current[timerKey] = setTimeout(async () => {
      const { error } = await supabase.from("tours").update({ [field]: value }).eq("id", tourId);

      if (error) console.error(`tours save error for ${field}`, error);
    }, 300);
  }, []);

  /* ================= POSITION / REORDER ================= */

  async function persistDayPositions(dayId: string, dayTours: TourWithRelations[]) {
    const updates = dayTours.map((tour, index) =>
      supabase
        .from("tours")
        .update({ position: index + 1, planning_day_id: dayId })
        .eq("id", tour.id)
    );

    const results = await Promise.all(updates);
    results.forEach((result) => {
      if (result.error) console.error("position update error", result.error);
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

  /* ================= DND SAVE ================= */

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

  /* ================= KEYBOARD NAV ================= */

  function getCellInput(row: number, col: number) {
    return document.querySelector<HTMLInputElement>(`[data-row="${row}"][data-col="${col}"]`);
  }

  function handleCellKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    coord: CellCoord,
    currentValue: string,
    onPasteValue?: (value: string) => void
  ) {
    const { row, col } = coord;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      setCopiedCellValue(currentValue);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      if (!copiedCellValue || !onPasteValue) return;
      e.preventDefault();
      onPasteValue(copiedCellValue);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      getCellInput(row + 1, col)?.focus();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        getCellInput(row, col - 1)?.focus();
      } else {
        getCellInput(row, col + 1)?.focus();
      }
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      getCellInput(row, col + 1)?.focus();
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      getCellInput(row, col - 1)?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      getCellInput(row + 1, col)?.focus();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      getCellInput(row - 1, col)?.focus();
    }
  }

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
    if (selectedRows.length === 0 || !bulkValue.trim()) return;

    if (bulkMode === "truck_number") {
      setTours((prev) =>
        prev.map((tour) =>
          selectedRows.includes(tour.id)
            ? {
                ...tour,
                truck_number: bulkValue,
              }
            : tour
        )
      );

      const updates = selectedRows.map((tourId) =>
        supabase.from("tours").update({ truck_number: bulkValue }).eq("id", tourId)
      );

      const results = await Promise.all(updates);
      results.forEach((result) => {
        if (result.error) console.error("bulk truck_number error", result.error);
      });
    }

    if (bulkMode === "custom" && bulkColumnId) {
      setValues((prev) => {
        const next = { ...prev };

        selectedRows.forEach((tourId) => {
          next[tourId] = {
            ...(next[tourId] ?? {}),
            [bulkColumnId]: bulkValue,
          };
        });

        return next;
      });

      const updates = selectedRows.map((tourId) =>
        supabase.from("tour_column_values").upsert({
          tour_id: tourId,
          column_id: bulkColumnId,
          value: bulkValue,
        })
      );

      const results = await Promise.all(updates);
      results.forEach((result) => {
        if (result.error) console.error("bulk custom column error", result.error);
      });
    }

    setBulkValue("");
  }

  /* ================= TOUR ACTIONS ================= */

  async function toggleCancelled(tour: TourWithRelations) {
    const nextValue = !tour.cancelled;

    setTours((prev) =>
      prev.map((t) =>
        t.id === tour.id
          ? {
              ...t,
              cancelled: nextValue,
            }
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

    const { error: deleteValuesError } = await supabase
      .from("tour_column_values")
      .delete()
      .eq("tour_id", tour.id);

    if (deleteValuesError) {
      console.error("delete tour values error", deleteValuesError);
    }

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

    const insertPayload: Partial<TourWithRelations> = {
      planning_day_id: targetDayId,
      position: nextPosition,
      truck_number: tour.truck_number ?? null,
      planned_arrival_werk1: tour.planned_arrival_werk1 ?? null,
      truck_type_id: tour.truck_type_id ?? null,
      cancelled: false,
    };

    const { data: insertedTour, error } = await supabase
      .from("tours")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !insertedTour) {
      console.error("duplicate tour insert error", error);
      return;
    }

    const sourceValues = values[tour.id] ?? {};
    const valueEntries = Object.entries(sourceValues);

    if (valueEntries.length > 0) {
      const inserts = valueEntries.map(([columnId, value]) => ({
        tour_id: insertedTour.id,
        column_id: columnId,
        value,
      }));

      const { error: valuesError } = await supabase
        .from("tour_column_values")
        .insert(inserts);

      if (valuesError) {
        console.error("duplicate values error", valuesError);
      }
    }

    setOpenMenuTourId(null);
  }

  /* ================= CELL RENDER ================= */

  function renderCell(
    tour: TourWithRelations,
    col: TourColumn,
    rowIndex: number,
    colIndex: number
  ) {
    if (tour.cancelled) {
      return <span className="tour-cancelled-text">storniert</span>;
    }

    if (col.key === "truck_number") {
      const currentValue = tour.truck_number ?? "";

      return (
        <input
          className="cell-input"
          data-row={rowIndex}
          data-col={colIndex}
          value={currentValue}
          onKeyDown={(e) =>
            handleCellKeyDown(e, { row: rowIndex, col: colIndex }, currentValue, (pasted) => {
              setTours((prev) =>
                prev.map((t) => (t.id === tour.id ? { ...t, truck_number: pasted } : t))
              );
              queueTourFieldSave(tour.id, "truck_number", pasted);
            })
          }
          onChange={(e) => {
            const newValue = e.target.value;

            setTours((prev) =>
              prev.map((t) =>
                t.id === tour.id
                  ? {
                      ...t,
                      truck_number: newValue,
                    }
                  : t
              )
            );

            queueTourFieldSave(tour.id, "truck_number", newValue);
          }}
        />
      );
    }

    if (col.key === "planned_arrival_werk1") {
      const currentValue = toDatetimeLocal(tour.planned_arrival_werk1);

      return (
        <input
          className="cell-input"
          data-row={rowIndex}
          data-col={colIndex}
          type="datetime-local"
          value={currentValue}
          onKeyDown={(e) =>
            handleCellKeyDown(e, { row: rowIndex, col: colIndex }, currentValue, (pasted) => {
              const nextValue = fromDatetimeLocal(pasted);
              setTours((prev) =>
                prev.map((t) =>
                  t.id === tour.id ? { ...t, planned_arrival_werk1: nextValue } : t
                )
              );
              queueTourFieldSave(tour.id, "planned_arrival_werk1", nextValue);
            })
          }
          onChange={(e) => {
            const raw = e.target.value;
            const newValue = fromDatetimeLocal(raw);

            setTours((prev) =>
              prev.map((t) =>
                t.id === tour.id
                  ? {
                      ...t,
                      planned_arrival_werk1: newValue,
                    }
                  : t
              )
            );

            queueTourFieldSave(tour.id, "planned_arrival_werk1", newValue);
          }}
        />
      );
    }

    if (col.key === "truck_type_id") {
      return <div className="cell-readonly">{tour.truck_types?.name ?? "-"}</div>;
    }

    const currentValue = values[tour.id]?.[col.id] ?? "";

    return (
      <input
        className="cell-input"
        data-row={rowIndex}
        data-col={colIndex}
        value={currentValue}
        onKeyDown={(e) =>
          handleCellKeyDown(e, { row: rowIndex, col: colIndex }, currentValue, (pasted) => {
            setValues((prev) => ({
              ...prev,
              [tour.id]: {
                ...(prev[tour.id] ?? {}),
                [col.id]: pasted,
              },
            }));
            queueColumnSave(tour.id, col.id, pasted);
          })
        }
        onChange={(e) => {
          const newValue = e.target.value;

          setValues((prev) => ({
            ...prev,
            [tour.id]: {
              ...(prev[tour.id] ?? {}),
              [col.id]: newValue,
            },
          }));

          queueColumnSave(tour.id, col.id, newValue);
        }}
      />
    );
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
              <option value="truck_number">Truck Nummer</option>
              <option value="custom">Freie Spalte</option>
            </select>

            {bulkMode === "custom" && (
              <select
                className="bulk-select"
                value={bulkColumnId}
                onChange={(e) => setBulkColumnId(e.target.value)}
              >
                {visibleColumns
                  .filter(
                    (col) =>
                      col.key !== "truck_number" &&
                      col.key !== "truck_type_id" &&
                      col.key !== "planned_arrival_werk1"
                  )
                  .map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.label}
                    </option>
                  ))}
              </select>
            )}

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
                        <th rowSpan={2} className="sticky-col select-col">
                          ✓
                        </th>
                        <th rowSpan={2} className="action-col">
                          ⇅
                        </th>
                        <th rowSpan={2} className="menu-col">
                          ⋯
                        </th>

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
                      {dayTours.map((tour, rowIndex) => {
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
                                  title="Tour Aktionen"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuTourId(menuOpen ? null : tour.id);
                                  }}
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

                            {visibleColumns.map((col, colIndex) => (
                              <td key={col.id}>{renderCell(tour, col, rowIndex, colIndex)}</td>
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