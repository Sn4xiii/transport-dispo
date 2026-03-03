"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Tour,
  TourColumn,
  TourValue,
} from "@/types/database";
import NewTourModal from "@/components/NewTourModal";
import "./week.css";

type PlanningWeek = {
  id: string;
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
};

export default function WeekDetail() {
  const params = useParams();
  const weekId = params.id as string;

  const [week, setWeek] =
    useState<PlanningWeek | null>(null);
  const [tours, setTours] =
    useState<Tour[]>([]);
  const [columns, setColumns] =
    useState<TourColumn[]>([]);
  const [values, setValues] =
    useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] =
    useState(true);
  const [modalOpen, setModalOpen] =
    useState(false);

  /* ---------------- LOAD DATA (React 19 safe) ---------------- */

  useEffect(() => {
    if (!weekId) return;

    let ignore = false;

    const run = async () => {
      const { data: weekData } =
        await supabase
          .from("planning_weeks")
          .select("*")
          .eq("id", weekId)
          .maybeSingle();

      const { data: columnData } =
        await supabase
          .from("tour_columns")
          .select("*")
          .eq("active", true)
          .order("position", {
            ascending: true,
          });

      const { data: tourData } =
        await supabase
          .from("tours")
          .select("*")
          .eq("planning_week_id", weekId)
          .order("position", {
            ascending: true,
          });

      const { data: valueData } =
        await supabase
          .from("tour_column_values")
          .select("*");

      if (ignore) return;

      const valueMap: Record<
        string,
        Record<string, string>
      > = {};

      valueData?.forEach(
        (val: TourValue) => {
          if (!valueMap[val.tour_id]) {
            valueMap[val.tour_id] = {};
          }
          valueMap[val.tour_id][
            val.column_id
          ] = val.value;
        }
      );

      setWeek(weekData);
      setColumns(columnData || []);
      setTours(tourData || []);
      setValues(valueMap);
      setLoading(false);
    };

    run();

    return () => {
      ignore = true;
    };
  }, [weekId]);

  /* ---------------- DELAY ---------------- */

  const calculateDelay = (
    tourId: string
  ) => {
    const planned =
      values[tourId]?.["planned_arrival"];
    const actual =
      values[tourId]?.["actual_arrival"];

    if (!planned || !actual)
      return null;

    const diff =
      new Date(actual).getTime() -
      new Date(planned).getTime();

    return Math.round(diff / 60000);
  };

  /* ---------------- SAVE ---------------- */

  const saveValue = async (
    tourId: string,
    columnId: string,
    value: string
  ) => {
    await supabase
      .from("tour_column_values")
      .upsert({
        tour_id: tourId,
        column_id: columnId,
        value,
      });

    setValues((prev) => ({
      ...prev,
      [tourId]: {
        ...prev[tourId],
        [columnId]: value,
      },
    }));
  };

  /* ---------------- RENDER CELL ---------------- */

  const renderCell = (
    tour: Tour,
    col: TourColumn
  ) => {
    const value =
      values[tour.id]?.[col.id] || "";

    if (col.type === "delay") {
      const delay =
        calculateDelay(tour.id);

      if (delay === null) return "-";

      return (
        <span
          className={
            delay > 15
              ? "delay-critical"
              : "delay-ok"
          }
        >
          {delay} min
        </span>
      );
    }

    if (col.type === "select") {
      return (
        <select
          value={value}
          onChange={(e) =>
            saveValue(
              tour.id,
              col.id,
              e.target.value
            )
          }
        >
          <option value="">
            -
          </option>
          {col.options?.map(
            (opt) => (
              <option
                key={opt}
                value={opt}
              >
                {opt}
              </option>
            )
          )}
        </select>
      );
    }

    if (col.type === "datetime") {
      return (
        <input
          type="datetime-local"
          value={value}
          onChange={(e) =>
            saveValue(
              tour.id,
              col.id,
              e.target.value
            )
          }
        />
      );
    }

    return (
      <input
        value={value}
        onChange={(e) =>
          saveValue(
            tour.id,
            col.id,
            e.target.value
          )
        }
      />
    );
  };

  /* ---------------- UI ---------------- */

  if (loading)
    return <div>Lade Woche...</div>;

  if (!week) return null;

  return (
    <div className="week-container">
      <div className="week-header">
        <h1>
          KW {week.week_number} /{" "}
          {week.year}
        </h1>

        <button
          className="btn-primary"
          onClick={() =>
            setModalOpen(true)
          }
        >
          + Tour hinzufügen
        </button>
      </div>

      <div className="table-wrapper">
        <table className="tour-table">
          <thead>
            <tr>
              {columns
                .filter(
                  (c) => c.visible
                )
                .map((col) => (
                  <th key={col.id}>
                    {col.label}
                  </th>
                ))}
            </tr>
          </thead>

          <tbody>
            {tours.map((tour) => (
              <tr key={tour.id}>
                {columns
                  .filter(
                    (c) => c.visible
                  )
                  .map((col) => (
                    <td key={col.id}>
                      {renderCell(
                        tour,
                        col
                      )}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewTourModal
        isOpen={modalOpen}
        onClose={() =>
          setModalOpen(false)
        }
        weekId={weekId}
        columns={columns}
      />
    </div>
  );
}