"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { TourColumn } from "@/types/database";
import "./modal.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  weekId: string;
  columns: TourColumn[];
}

export default function NewTourModal({
  isOpen,
  onClose,
  weekId,
  columns,
}: Props) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const requiredCols = columns.filter(c => c.required);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (const col of requiredCols) {
      if (!formData[col.id]) {
        alert(`${col.label} ist Pflichtfeld`);
        return;
      }
    }

    setLoading(true);

    const { data: newTour } = await supabase
      .from("tours")
      .insert({ planning_week_id: weekId })
      .select()
      .single();

    for (const col of requiredCols) {
      await supabase.from("tour_column_values").insert({
        tour_id: newTour.id,
        column_id: col.id,
        value: formData[col.id]
      });
    }

    setLoading(false);
    onClose();
    location.reload();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Neue Tour</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          {requiredCols.map(col => (
            <div key={col.id} className="form-group">
              <label>{col.label} *</label>
              <input
                type={col.type === "datetime" ? "datetime-local" : "text"}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    [col.id]: e.target.value
                  }))
                }
              />
            </div>
          ))}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" disabled={loading}>
              {loading ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}