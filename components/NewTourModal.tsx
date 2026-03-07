"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./modal.css";

type PlanningDay = {
  id: string;
  planning_week_id: string;
  date: string;
  position?: number;
};

type TruckType = {
  id: string;
  name: string;
};

type NewTourModalProps = {
  isOpen: boolean;
  onClose: () => void;
  weekId: string;
  dayId: string | null;
  days: PlanningDay[];
};

type FormState = {
  planning_day_id: string;
  truck_number: string;
  truck_type_id: string;
  gps_link: string;

  pls_shift_loading_date: string;
  pls_shift_loading_time: string;
  pls_shift_planned_date: string;
  pls_shift_planned_time: string;

  bgn_shift_delivery_note: string;
  rt_st: string;
  plate_numbers: string;
  waiting_times: string;
  comment: string;

  cancelled: boolean;
};

const INITIAL_FORM: FormState = {
  planning_day_id: "",
  truck_number: "",
  truck_type_id: "",
  gps_link: "",

  pls_shift_loading_date: "",
  pls_shift_loading_time: "",
  pls_shift_planned_date: "",
  pls_shift_planned_time: "",

  bgn_shift_delivery_note: "",
  rt_st: "",
  plate_numbers: "",
  waiting_times: "",
  comment: "",

  cancelled: false,
};

export default function NewTourModal({
  isOpen,
  onClose,
  weekId,
  dayId,
  days,
}: NewTourModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [truckTypes, setTruckTypes] = useState<TruckType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderedDays = useMemo(
    () =>
      [...days].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [days]
  );

  useEffect(() => {
    if (!isOpen) return;

    setForm({
      ...INITIAL_FORM,
      planning_day_id: dayId ?? orderedDays[0]?.id ?? "",
      pls_shift_loading_date:
        orderedDays.find((d) => d.id === (dayId ?? ""))?.date ?? "",
      pls_shift_planned_date:
        orderedDays.find((d) => d.id === (dayId ?? ""))?.date ?? "",
    });

    setError(null);
  }, [isOpen, dayId, orderedDays]);

  useEffect(() => {
    if (!isOpen) return;

    async function loadTruckTypes() {
      const { data, error } = await supabase
        .from("truck_types")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("truck_types load error", error);
        return;
      }

      setTruckTypes(data ?? []);
    }

    loadTruckTypes();
  }, [isOpen]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.planning_day_id) {
      setError("Bitte wähle einen Tag aus.");
      return;
    }

    setSaving(true);
    setError(null);

    const existingToursForDay = await supabase
      .from("tours")
      .select("id, position")
      .eq("planning_day_id", form.planning_day_id)
      .order("position", { ascending: true });

    if (existingToursForDay.error) {
      console.error("load positions error", existingToursForDay.error);
      setError("Positionen konnten nicht geladen werden.");
      setSaving(false);
      return;
    }

    const nextPosition = (existingToursForDay.data?.length ?? 0) + 1;

    const payload = {
      planning_day_id: form.planning_day_id,
      position: nextPosition,

      truck_number: form.truck_number || null,
      truck_type_id: form.truck_type_id || null,
      gps_link: form.gps_link || null,

      pls_shift_loading_date: form.pls_shift_loading_date || null,
      pls_shift_loading_time: form.pls_shift_loading_time || null,
      pls_shift_planned_date: form.pls_shift_planned_date || null,
      pls_shift_planned_time: form.pls_shift_planned_time || null,

      bgn_shift_delivery_note: form.bgn_shift_delivery_note || null,
      rt_st: form.rt_st || null,
      plate_numbers: form.plate_numbers || null,
      waiting_times: form.waiting_times || null,
      comment: form.comment || null,

      cancelled: form.cancelled,
    };

    const { error: insertError } = await supabase
      .from("tours")
      .insert(payload);

    if (insertError) {
      console.error("insert tour error", insertError);
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card dispo-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Neue Tour anlegen</h2>
            <p className="modal-subtitle">
              Woche {weekId.slice(0, 8)} · operative Grunddaten
            </p>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-grid">
            <div className="form-field">
              <label>Tag</label>
              <select
                value={form.planning_day_id}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedDay = orderedDays.find((d) => d.id === selectedId);

                  updateField("planning_day_id", selectedId);
                  updateField(
                    "pls_shift_loading_date",
                    selectedDay?.date ?? ""
                  );
                  updateField(
                    "pls_shift_planned_date",
                    selectedDay?.date ?? ""
                  );
                }}
                disabled={saving}
              >
                <option value="">Tag wählen</option>
                {orderedDays.map((day) => (
                  <option key={day.id} value={day.id}>
                    {new Date(day.date).toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Truck Number</label>
              <input
                type="text"
                value={form.truck_number}
                onChange={(e) => updateField("truck_number", e.target.value)}
                placeholder="z. B. 204 / 776 / BGN-12"
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label>Truck Type</label>
              <select
                value={form.truck_type_id}
                onChange={(e) => updateField("truck_type_id", e.target.value)}
                disabled={saving}
              >
                <option value="">Typ wählen</option>
                {truckTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field form-field-span-2">
              <label>GPS Link</label>
              <input
                type="text"
                value={form.gps_link}
                onChange={(e) => updateField("gps_link", e.target.value)}
                placeholder="https://..."
                disabled={saving}
              />
            </div>

            <div className="form-section-title">PLS Shift</div>

            <div className="form-field">
              <label>Loading Date</label>
              <input
                type="date"
                value={form.pls_shift_loading_date}
                onChange={(e) =>
                  updateField("pls_shift_loading_date", e.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label>Loading Hour</label>
              <input
                type="time"
                value={form.pls_shift_loading_time}
                onChange={(e) =>
                  updateField("pls_shift_loading_time", e.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label>Planned Date</label>
              <input
                type="date"
                value={form.pls_shift_planned_date}
                onChange={(e) =>
                  updateField("pls_shift_planned_date", e.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label>Planned Hour</label>
              <input
                type="time"
                value={form.pls_shift_planned_time}
                onChange={(e) =>
                  updateField("pls_shift_planned_time", e.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="form-section-title">BGN / Ceva</div>

            <div className="form-field form-field-span-2">
              <label>Delivery note</label>
              <input
                type="text"
                value={form.bgn_shift_delivery_note}
                onChange={(e) =>
                  updateField("bgn_shift_delivery_note", e.target.value)
                }
                placeholder="Delivery note"
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label>RT / ST</label>
              <input
                type="text"
                value={form.rt_st}
                onChange={(e) => updateField("rt_st", e.target.value)}
                placeholder="RT / ST"
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label>Plate numbers</label>
              <input
                type="text"
                value={form.plate_numbers}
                onChange={(e) => updateField("plate_numbers", e.target.value)}
                placeholder="Kennzeichen"
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label>Waiting times</label>
              <input
                type="text"
                value={form.waiting_times}
                onChange={(e) => updateField("waiting_times", e.target.value)}
                placeholder="z. B. 00:45"
                disabled={saving}
              />
            </div>

            <div className="form-field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  checked={form.cancelled}
                  onChange={(e) => updateField("cancelled", e.target.checked)}
                  disabled={saving}
                />
                Sofort als storniert markieren
              </label>
            </div>

            <div className="form-field form-field-span-2">
              <label>Comment</label>
              <textarea
                value={form.comment}
                onChange={(e) => updateField("comment", e.target.value)}
                placeholder="Interne Bemerkung"
                rows={4}
                disabled={saving}
              />
            </div>
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Abbrechen
            </button>

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Speichert..." : "Tour anlegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}