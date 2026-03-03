"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PlanningWeek = {
  id: string;
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
  is_visible: boolean;
  is_locked: boolean;
};

export default function Home() {
  const [weeks, setWeeks] = useState<PlanningWeek[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadWeeks = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("planning_weeks")
        .select("*")
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });

      if (error) {
        console.error(error);
        setError(error.message);
      } else {
        setWeeks(data || []);
      }

      setLoading(false);
    };

    loadWeeks();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          📅 Wochenplanung
        </h1>
        <p className="text-slate-500 mt-1">
          Übersicht aller angelegten Kalenderwochen
        </p>
      </div>

      {/* Card Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* Loading */}
        {loading && (
          <div className="p-6 text-slate-500">
            Lade Wochen...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-6 text-red-600 bg-red-50 rounded-2xl">
            Fehler: {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && weeks.length === 0 && !error && (
          <div className="p-6 text-slate-500">
            Keine Wochen gefunden.
          </div>
        )}

        {/* Weeks List */}
        {!loading && weeks.length > 0 && (
          <div className="divide-y divide-slate-200">
            {weeks.map((week) => (
              <div
                key={week.id}
                className="p-6 flex justify-between items-center hover:bg-slate-50 transition cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-800">
                    KW {week.week_number} / {week.year}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {new Date(week.start_date).toLocaleDateString("de-DE")} –{" "}
                    {new Date(week.end_date).toLocaleDateString("de-DE")}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!week.is_visible && (
                    <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full">
                      Ausgeblendet
                    </span>
                  )}

                  {week.is_locked && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                      Gesperrt
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}