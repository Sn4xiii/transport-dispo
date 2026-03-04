"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./admin.css";

type Week = {
  id: string;
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
};

export default function AdminWeeks() {
  const router = useRouter();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(false);

  /* ========================= */
  /* ===== LOAD WEEKS ======== */
  /* ========================= */

  useEffect(() => {
    const fetchWeeks = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("planning_weeks")
        .select("*")
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });

      if (!error && data) {
        setWeeks(data);
      }

      setLoading(false);
    };

    fetchWeeks();
  }, []);

  /* ========================= */
  /* ===== CREATE WEEK ======= */
  /* ========================= */

  const createWeek = async () => {
  setLoading(true);

  let year: number;
  let week: number;

  if (weeks.length === 0) {
    const now = new Date();
    year = now.getFullYear();
    week = getISOWeek(now);
  } else {
    const latest = weeks[0];
    year = latest.year;
    week = latest.week_number + 1;

    if (week > 52) {
      week = 1;
      year = year + 1;
    }
  }

  const start = getDateOfISOWeek(week, year);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  /* Woche erstellen */

  const { data, error } = await supabase
    .from("planning_weeks")
    .insert({
      year: year,
      week_number: week,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    alert(error?.message);
    setLoading(false);
    return;
  }

  /* ===== 7 Tage erstellen ===== */

  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    days.push({
      planning_week_id: data.id,
      date: date.toISOString(),
    });
  }

  const { error: daysError } = await supabase
    .from("planning_days")
    .insert(days);

  if (daysError) {
    alert(daysError.message);
  }

  /* UI Update */

  setWeeks((prev) => [data, ...prev]);

  setLoading(false);
};

  /* ========================= */
  /* ===== DELETE WEEK ======= */
  /* ========================= */

  const deleteWeek = async (
    id: string,
    year: number,
    week: number
  ) => {
    const confirmed = confirm(
      `Woche ${week}/${year} wirklich löschen?`
    );
    if (!confirmed) return;

    setLoading(true);

    const { data: tours } = await supabase
      .from("tours")
      .select("id")
      .eq("planning_week_id", id)
      .limit(1);

    if (tours && tours.length > 0) {
      alert(
        "Diese Woche enthält noch Touren.\nBitte zuerst die Touren löschen oder stornieren."
      );
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("planning_weeks")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setWeeks((prev) => prev.filter((w) => w.id !== id));

    setLoading(false);
  };

  /* ========================= */
  /* ===== HELPER FUNCS ====== */
  /* ========================= */

  function getISOWeek(date: Date) {
    const temp = new Date(date.getTime());
    temp.setHours(0, 0, 0, 0);
    temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
    const week1 = new Date(temp.getFullYear(), 0, 4);

    return (
      1 +
      Math.round(
        ((temp.getTime() - week1.getTime()) / 86400000 -
          3 +
          ((week1.getDay() + 6) % 7)) /
          7
      )
    );
  }

  function getDateOfISOWeek(week: number, year: number) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;

    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }

    return ISOweekStart;
  }

  /* ========================= */
  /* ===== RENDER ============ */
  /* ========================= */

  return (
    <div className="admin-container">
      <h1>Wochen Verwaltung</h1>

      <button
        className="btn-create"
        onClick={createWeek}
        disabled={loading}
      >
        Neue Woche erstellen
      </button>

      {loading && weeks.length === 0 && (
        <div className="empty">Lade Wochen...</div>
      )}

      {!loading && weeks.length === 0 && (
        <div className="empty">Keine Wochen vorhanden</div>
      )}

      <div className="weeks-grid">
        {weeks.map((week) => (
          <div key={week.id} className="week-card">
            <div className="week-info">
              <h2>
                KW {week.week_number} / {week.year}
              </h2>

              <p>
                {new Date(week.start_date).toLocaleDateString("de-DE")} –{" "}
                {new Date(week.end_date).toLocaleDateString("de-DE")}
              </p>
            </div>

            <div className="week-actions">
              <button
                className="btn-open"
                onClick={() =>
                  router.push(`/weeks/${week.id}`)
                }
              >
                Öffnen
              </button>

              <button
                className="btn-delete"
                onClick={() =>
                  deleteWeek(
                    week.id,
                    week.year,
                    week.week_number
                  )
                }
                disabled={loading}
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}