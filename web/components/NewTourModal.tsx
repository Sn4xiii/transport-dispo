"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Tour } from "@/types/database";
import "./modal.css";

type Props = {
  isOpen: boolean;
  onClose: (newTour?: Tour) => void;
  weekId: string;
  dayId: string | null;
  days: {
    id: string;
    date: string;
  }[];
};

type TruckType = {
  id: string;
  name: string;
};

export default function NewTourModal({
  isOpen,
  onClose,
  weekId,
  dayId,
  days,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(dayId);
  const [truckId, setTruckId] = useState("");
  const [truckTypeId, setTruckTypeId] = useState("");
  const [truckTypes, setTruckTypes] = useState<TruckType[]>([]);
  const [plannedArrival, setPlannedArrival] = useState("");
  const [actualArrival, setActualArrival] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const fetchTruckTypes = async () => {
      const { data, error } = await supabase
        .from("truck_types")
        .select("id, name")
        .order("name");

      if (!error && data) {
        setTruckTypes(data);
      }
    };

    fetchTruckTypes();

    setSelectedDay(dayId);
    setTruckId("");
    setTruckTypeId("");
    setPlannedArrival("");
    setActualArrival("");
    setError(null);
  }, [isOpen, dayId]);

  const handleClose = useCallback(
    (newTour?: Tour) => {
      if (saving) return;
      onClose(newTour);
    },
    [saving, onClose]
  );

  if (!isOpen) return null;

  const createTour = async () => {
    if (!selectedDay) {
      setError("Bitte Tag auswählen.");
      return;
    }

    if (!truckId.trim()) {
      setError("Truck ID fehlt.");
      return;
    }

    if (!truckTypeId) {
      setError("Truck Type auswählen.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { data: lastTours, error: posError } = await supabase
        .from("tours")
        .select("position")
        .eq("planning_day_id", selectedDay)
        .order("position", { ascending: false })
        .limit(1);

      if (posError) throw posError;

      const nextPos = (lastTours?.[0]?.position ?? 0) + 1;

      const { data: insertedTour, error: insertError } = await supabase
        .from("tours")
        .insert({
          planning_week_id: weekId,
          planning_day_id: selectedDay,
          position: nextPos,
          truck_number: truckId.trim(),
          truck_type_id: truckTypeId,
          planned_arrival_werk1: plannedArrival || null,
          actual_arrival_werk1: actualArrival || null,
        })
        .select(`
          *,
          truck_types (
            id,
            name
          )
        `)
        .single<Tour>();

      if (insertError) throw insertError;

      handleClose(insertedTour);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  };

  const formatDay = (date: string) => {
    return new Date(`${date}T00:00:00`).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <div className="modal-overlay" onClick={() => handleClose()}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Neuer Transport</h2>
        </div>

        <div className="modal-content">
          <label className="modal-field">
            <span>Tag</span>
            <select
              value={selectedDay ?? ""}
              onChange={(e) => setSelectedDay(e.target.value)}
              disabled={saving}
            >
              {days.map((d) => (
                <option key={d.id} value={d.id}>
                  {formatDay(d.date)}
                </option>
              ))}
            </select>
          </label>

          <label className="modal-field">
            <span>Truck ID</span>
            <input
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              disabled={saving}
            />
          </label>

          <label className="modal-field">
            <span>Truck Type</span>
            <select
              value={truckTypeId}
              onChange={(e) => setTruckTypeId(e.target.value)}
              disabled={saving}
            >
              <option value="">Bitte auswählen</option>
              {truckTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          <label className="modal-field">
            <span>Geplante Ankunft (Werk 1)</span>
            <input
              type="datetime-local"
              value={plannedArrival}
              onChange={(e) => setPlannedArrival(e.target.value)}
              disabled={saving}
            />
          </label>

          <label className="modal-field">
            <span>Ist Ankunft (Werk 1)</span>
            <input
              type="datetime-local"
              value={actualArrival}
              onChange={(e) => setActualArrival(e.target.value)}
              disabled={saving}
            />
          </label>

          {error && <div className="modal-error">{error}</div>}
        </div>

        <div className="modal-actions">
          <button
            className="btn-secondary"
            onClick={() => handleClose()}
            disabled={saving}
          >
            Abbrechen
          </button>

          <button
            className="btn-primary"
            onClick={createTour}
            disabled={saving}
          >
            {saving ? "Speichern..." : "Anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
}