"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Tour, TourColumn, TourValue } from "@/types/database";
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

  const [week, setWeek] = useState<PlanningWeek | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [columns, setColumns] = useState<TourColumn[]>([]);
  const [values, setValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!weekId) return;

    const loadData = async () => {
      try {
        // Woche laden
        const { data: weekData } = await supabase
          .from("planning_weeks")
          .select("*")
          .eq("id", weekId)
          .maybeSingle();

        setWeek(weekData);

        // Spalten laden
        const { data: columnData } = await supabase
          .from("tour_columns")
          .select("*")
          .eq("active", true)
          .order("position", { ascending: true });

        setColumns(columnData || []);

        // Touren laden
        const { data: tourData } = await supabase
          .from("tours")
          .select("*")
          .eq("planning_week_id", weekId);

        setTours(tourData || []);

        // Werte laden
        const { data: valueData } = await supabase
          .from("tour_column_values")
          .select("*");

        const valueMap: Record<
          string,
          Record<string, string>
        > = {};

        valueData?.forEach((val: TourValue) => {
          if (!valueMap[val.tour_id]) {
            valueMap[val.tour_id] = {};
          }

          valueMap[val.tour_id][val.column_id] =
            val.value;
        });

        setValues(valueMap);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unbekannter Fehler");
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [weekId]);

  const handleInlineUpdate = async (
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

  if (loading)
    return <div className="status-box">Lade Woche...</div>;

  if (error)
    return (
      <div className="status-box error">
        Fehler: {error}
      </div>
    );

  if (!week) return null;

  return (
    <div className="week-container">
      <div className="week-header">
        <div>
          <h1>
            KW {week.week_number} / {week.year}
          </h1>
          <p>
            {new Date(
              week.start_date
            ).toLocaleDateString("de-DE")}{" "}
            –{" "}
            {new Date(
              week.end_date
            ).toLocaleDateString("de-DE")}
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setModalOpen(true)}
        >
          + Tour hinzufügen
        </button>
      </div>

      <div className="table-wrapper">
        {tours.length === 0 ? (
          <div className="empty-state">
            Noch keine Touren vorhanden.
          </div>
        ) : (
          <table className="tour-table">
            <thead>
              <tr>
                {columns
                  .filter((col) => col.visible)
                  .map((col) => (
                    <th key={col.id}>{col.label}</th>
                  ))}
              </tr>
            </thead>

            <tbody>
              {tours.map((tour) => (
                <tr key={tour.id}>
                  {columns
                    .filter((col) => col.visible)
                    .map((col) => (
                      <td key={col.id}>
                        <input
                          defaultValue={
                            values[tour.id]?.[
                              col.id
                            ] || ""
                          }
                          onBlur={(e) =>
                            handleInlineUpdate(
                              tour.id,
                              col.id,
                              e.target.value
                            )
                          }
                        />
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NewTourModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        weekId={weekId}
        columns={columns}
      />
    </div>
  );
}