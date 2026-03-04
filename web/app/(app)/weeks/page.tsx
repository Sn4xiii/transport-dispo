"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Toast from "@/components/Toast";
import "./home.css";

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
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [futureLimit, setFutureLimit] = useState(5);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "warning";
  } | null>(null);

  /* ================= LOAD ================= */

  useEffect(() => {
    const loadWeeks = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("planning_weeks")
        .select("*");

      if (error) {
        setError(error.message);
      } else {
        setWeeks(data || []);
      }

      setLoading(false);
    };

    loadWeeks();
  }, []);

  /* ================= REALTIME ================= */

  useEffect(() => {
    const channel = supabase
      .channel("planning_weeks_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planning_weeks",
        },
        (payload) => {
          setWeeks((prev) => {
            if (payload.eventType === "INSERT") {
              setToast({
                message: "Neue Woche hinzugefügt",
                type: "success",
              });
              return [...prev, payload.new as PlanningWeek];
            }

            if (payload.eventType === "UPDATE") {
              setToast({
                message: "Woche wurde aktualisiert",
                type: "info",
              });
              return prev.map((w) =>
                w.id === payload.new.id
                  ? (payload.new as PlanningWeek)
                  : w
              );
            }

            if (payload.eventType === "DELETE") {
              setToast({
                message: "Woche wurde gelöscht",
                type: "warning",
              });
              return prev.filter(
                (w) => w.id !== payload.old.id
              );
            }

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ================= SORT ================= */

  const { currentWeek, futureWeeks, pastWeeks } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let current: PlanningWeek | null = null;
    const future: PlanningWeek[] = [];
    const past: PlanningWeek[] = [];

    weeks.forEach((week) => {
      const start = new Date(week.start_date);
      const end = new Date(week.end_date);

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (today >= start && today <= end) {
        current = week;
      } else if (start > today) {
        future.push(week);
      } else {
        past.push(week);
      }
    });

    future.sort(
      (a, b) =>
        new Date(a.start_date).getTime() -
        new Date(b.start_date).getTime()
    );

    past.sort(
      (a, b) =>
        new Date(b.start_date).getTime() -
        new Date(a.start_date).getTime()
    );

    return {
      currentWeek: current,
      futureWeeks: future,
      pastWeeks: past,
    };
  }, [weeks]);

  const renderWeekCard = (
    week: PlanningWeek,
    highlight = false
  ) => (
    <Link
      key={week.id}
      href={`/weeks/${week.id}`}
      className={`week-card ${
        highlight ? "week-current" : ""
      }`}
    >
      <div>
        <div className="week-title">
          KW {week.week_number} / {week.year}
        </div>
        <div className="week-dates">
          {new Date(week.start_date).toLocaleDateString("de-DE")} –{" "}
          {new Date(week.end_date).toLocaleDateString("de-DE")}
        </div>
      </div>
    </Link>
  );

  /* ================= RENDER ================= */

  return (
    <div className="home-background">
      <div className="home-wrapper">

        {/* HEADER */}
        <div className="home-header">
          <h1>Wochenplanung</h1>
          <p>Übersicht aller Planungswochen</p>
        </div>

        {loading && (
          <div className="state-box">
            Lade Wochen...
          </div>
        )}

        {error && (
          <div className="state-box state-error">
            Fehler: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {currentWeek && (
              <>
                <h2 className="section-title">
                  Aktuelle Woche
                </h2>
                <div className="weeks-grid">
                  {renderWeekCard(currentWeek, true)}
                </div>
              </>
            )}

            {futureWeeks.length > 0 && (
              <>
                <div className="future-header">
                  <h2 className="section-title">
                    Kommende Wochen
                  </h2>

                  <div className="limit-selector">
                    <span>Anzeige:</span>
                    <select
                      value={futureLimit}
                      onChange={(e) =>
                        setFutureLimit(Number(e.target.value))
                      }
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="weeks-grid">
                  {futureWeeks
                    .slice(0, futureLimit)
                    .map((week) =>
                      renderWeekCard(week)
                    )}
                </div>
              </>
            )}

            {pastWeeks.length > 0 && (
              <>
                <div className="past-toggle">
                  <button
                    onClick={() =>
                      setShowPast(!showPast)
                    }
                  >
                    {showPast
                      ? "Vergangene ausblenden"
                      : "Vergangene anzeigen"}
                  </button>
                </div>

                {showPast && (
                  <div className="weeks-grid">
                    {pastWeeks.map((week) =>
                      renderWeekCard(week)
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}