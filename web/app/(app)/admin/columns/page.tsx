"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TourColumn } from "@/types/database";
import NewColumnModal from "@/components/AdminColumnModal";
import "./admin.css";

export default function AdminColumns() {
  const [columns, setColumns] = useState<TourColumn[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

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

  const deleteColumn = async (id: string) => {
    if (!confirm("Spalte wirklich löschen?")) return;

    await supabase
      .from("tour_columns")
      .delete()
      .eq("id", id);

    reloadColumns();
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Spalten konfigurieren</h1>
        <button
          className="btn-primary"
          onClick={() => setModalOpen(true)}
        >
          + Neue Spalte
        </button>
      </div>

      {columns.map((col) => (
        <div key={col.id} className="admin-row">
          <div>
            <strong>{col.label}</strong>
            <div className="admin-meta">
              Key: {col.key} | Typ: {col.type}
            </div>
          </div>

          <button
            className="delete-btn"
            onClick={() => deleteColumn(col.id)}
          >
            Löschen
          </button>
        </div>
      ))}

      <NewColumnModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={reloadColumns}
        currentCount={columns.length}
      />
    </div>
  );
}