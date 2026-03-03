"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./admin.css";

export default function AdminWeeks() {
  const router = useRouter();

  const [year, setYear] = useState(2026);
  const [weekNumber, setWeekNumber] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const createWeek = async () => {
    if (!startDate || !endDate) {
      alert("Start- und Enddatum erforderlich");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc(
      "create_week_with_trucks",
      {
        p_year: year,
        p_week_number: weekNumber,
        p_start_date: startDate,
        p_end_date: endDate,
      }
    );

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Woche erfolgreich erstellt");

    // 🔥 Direkt zur Woche springen
    router.push(`/weeks/${data}`);
  };

  return (
    <div className="admin-container">
      <h1>Neue Woche anlegen</h1>

      <div className="admin-form">
        <label>Jahr</label>
        <input
          type="number"
          value={year}
          onChange={(e) =>
            setYear(Number(e.target.value))
          }
        />

        <label>Kalenderwoche</label>
        <input
          type="number"
          value={weekNumber}
          onChange={(e) =>
            setWeekNumber(Number(e.target.value))
          }
        />

        <label>Startdatum</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) =>
            setStartDate(e.target.value)
          }
        />

        <label>Enddatum</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) =>
            setEndDate(e.target.value)
          }
        />

        <button onClick={createWeek}>
          {loading
            ? "Erstelle..."
            : "Woche erstellen"}
        </button>
      </div>
    </div>
  );
}