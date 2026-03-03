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
    const loadData = async () => {
      setLoading(true);
      setError(null);

      // Woche laden
      const { data: weekData, error: weekError } = await supabase
        .from("planning_weeks")
        .select("*")
        .eq("id", weekId)
        .maybeSingle();

      if (weekError) {
        setError(weekError.message);
        setLoading(false);
        return;
      }

      if (!weekData) {
        setError("Woche nicht gefunden.");
        setLoading(false);
        return;
      }

      setWeek(weekData);

      // Tours laden
      const { data: toursData, error: toursError } = await supabase
        .from("tours")
        .select("*")
        .eq("planning_week_id", weekId)
        .order("planned_arrival_werk1", { ascending: true });

      if (toursError) {
        setError(toursError.message);
      } else {
        setTours(toursData || []);
      }

      setLoading(false);
    };

    if (weekId) {
      loadData();
    }
  }, [weekId]);

  if (loading) {
    return <div className="p-6">Lade Woche...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded">
        Fehler: {error}
      </div>
    );
  }

  if (!week) {
    return <div className="p-6">Woche nicht gefunden.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          KW {week.week_number} / {week.year}
        </h1>
        <p className="text-slate-500 mt-1">
          {new Date(week.start_date).toLocaleDateString("de-DE")} –{" "}
          {new Date(week.end_date).toLocaleDateString("de-DE")}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-xl font-semibold mb-6">
          🚛 Touren
        </h2>

        {tours.length === 0 && (
          <div className="text-slate-500">
            Noch keine Touren angelegt.
          </div>
        )}

        {tours.length > 0 && (
          <div className="divide-y divide-slate-200">
            {tours.map((tour) => (
              <div key={tour.id} className="py-4">
                <div className="font-medium">
                  LKW: {tour.truck_number || "-"}
                </div>
                <div className="text-sm text-slate-500">
                  Kennzeichen: {tour.plate || "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}