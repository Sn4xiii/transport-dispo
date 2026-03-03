"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PlanningWeek = {
  id: string;
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
};

type Tour = {
  id: string;
  truck_number: string | null;
  plate: string | null;
  planned_arrival_werk1: string | null;
  actual_arrival_werk1: string | null;
};

export default function WeekDetail() {
  const params = useParams();
  const weekId = params.id as string;

  const [week, setWeek] = useState<PlanningWeek | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!weekId) return;

    const loadData = async () => {
      try {
        const { data: weekData, error: weekError } = await supabase
          .from("planning_weeks")
          .select("*")
          .eq("id", weekId)
          .maybeSingle();

        if (weekError) throw weekError;
        if (!weekData) throw new Error("Woche nicht gefunden.");

        setWeek(weekData);

        const { data: toursData, error: toursError } = await supabase
          .from("tours")
          .select("*")
          .eq("planning_week_id", weekId)
          .order("planned_arrival_werk1", { ascending: true });

        if (toursError) throw toursError;

        setTours(toursData || []);
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

  const calculateDelay = (
    planned: string | null,
    actual: string | null
  ) => {
    if (!planned || !actual) return null;

    const plannedDate = new Date(planned).getTime();
    const actualDate = new Date(actual).getTime();

    const diffMinutes = Math.round((actualDate - plannedDate) / 60000);

    return diffMinutes;
  };

  if (loading) return <div className="p-6">Lade Woche...</div>;

  if (error)
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded">
        Fehler: {error}
      </div>
    );

  if (!week) return <div className="p-6">Woche nicht gefunden.</div>;

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            KW {week.week_number} / {week.year}
          </h1>
          <p className="text-gray-500">
            {new Date(week.start_date).toLocaleDateString("de-DE")} –{" "}
            {new Date(week.end_date).toLocaleDateString("de-DE")}
          </p>
        </div>

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          + Tour hinzufügen
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {tours.length === 0 ? (
          <div className="p-6 text-gray-500">
            Noch keine Touren vorhanden.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">LKW</th>
                <th className="px-4 py-3 text-left">Kennzeichen</th>
                <th className="px-4 py-3 text-left">Geplant Werk 1</th>
                <th className="px-4 py-3 text-left">Ist Werk 1</th>
                <th className="px-4 py-3 text-left">Delay</th>
              </tr>
            </thead>

            <tbody>
              {tours.map((tour) => {
                const delay = calculateDelay(
                  tour.planned_arrival_werk1,
                  tour.actual_arrival_werk1
                );

                return (
                  <tr key={tour.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      {tour.truck_number ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {tour.plate ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {tour.planned_arrival_werk1
                        ? new Date(
                            tour.planned_arrival_werk1
                          ).toLocaleString("de-DE")
                        : "-"}
                    </td>

                    <td className="px-4 py-3">
                      {tour.actual_arrival_werk1
                        ? new Date(
                            tour.actual_arrival_werk1
                          ).toLocaleString("de-DE")
                        : "-"}
                    </td>

                    <td
                      className={`px-4 py-3 font-semibold ${
                        delay !== null
                          ? delay > 15
                            ? "text-red-600"
                            : "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      {delay !== null ? `${delay} min` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}