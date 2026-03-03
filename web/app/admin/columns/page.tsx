"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TourColumn } from "@/types/database";
import "./admin.css";

export default function AdminColumns() {
  const [columns, setColumns] = useState<TourColumn[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  /* ✅ Daten direkt im Effect laden */
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tour_columns")
        .select("*")
        .order("position", { ascending: true });

      setColumns(data || []);
    };

    load();
  }, []);

  const reloadColumns = async () => {
    const { data } = await supabase
      .from("tour_columns")
      .select("*")
      .order("position", { ascending: true });

    setColumns(data || []);
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId) return;

    const draggedIndex = columns.findIndex(
      (c) => c.id === draggedId
    );
    const targetIndex = columns.findIndex(
      (c) => c.id === targetId
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCols = [...columns];
    const [removed] = newCols.splice(draggedIndex, 1);
    newCols.splice(targetIndex, 0, removed);

    for (let i = 0; i < newCols.length; i++) {
      await supabase
        .from("tour_columns")
        .update({ position: i + 1 })
        .eq("id", newCols[i].id);
    }

    setDraggedId(null);
    reloadColumns();
  };

  return (
    <div className="admin-container">
      <h1>Spalten konfigurieren</h1>

      {columns.map((col) => (
        <div
          key={col.id}
          className="admin-row"
          draggable
          onDragStart={() => setDraggedId(col.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(col.id)}
        >
          <span>
            {col.label} ({col.type})
          </span>
        </div>
      ))}
    </div>
  );
}