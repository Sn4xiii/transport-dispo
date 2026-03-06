"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ColumnType } from "@/types/database";
import "../app/(app)/admin_backup/columns/admin.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentCount: number;
}

export default function NewColumnModal({
  isOpen,
  onClose,
  onSaved,
  currentCount,
}: Props) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] =
    useState<ColumnType>("text");
  const [required, setRequired] =
    useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!label || !key) {
      alert("Label und Key sind Pflicht");
      return;
    }

    setLoading(true);

    await supabase.from("tour_columns").insert({
      label,
      key,
      type,
      required,
      visible: true,
      position: currentCount + 1,
      active: true,
    });

    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <h2>Neue Spalte</h2>

        <form
          onSubmit={handleSubmit}
          className="modal-form"
        >
          <label>Label</label>
          <input
            value={label}
            onChange={(e) =>
              setLabel(e.target.value)
            }
          />

          <label>Key (DB Feld)</label>
          <input
            value={key}
            onChange={(e) =>
              setKey(e.target.value)
            }
          />

          <label>Typ</label>
          <select
            value={type}
            onChange={(e) =>
              setType(
                e.target.value as ColumnType
              )
            }
          >
            <option value="text">Text</option>
            <option value="number">
              Number
            </option>
            <option value="datetime">
              DateTime
            </option>
            <option value="select">
              Select
            </option>
          </select>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) =>
                setRequired(
                  e.target.checked
                )
              }
            />
            Pflichtfeld
          </label>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
            >
              Abbrechen
            </button>

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Speichert..."
                : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}