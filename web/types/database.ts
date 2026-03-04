export type ColumnType =
  | "text"
  | "number"
  | "datetime"
  | "select"
  | "delay";

export type Tour = {
  id: string;
  planning_week_id: string | null;
  planning_day_id: string | null;
  cancelled: boolean;
  truck_number: string | null;
  plate: string | null;
  truck_type_id: string | null;
  truck_types?: {
    id: string;
    name: string;
  } | null;
  
  planned_arrival_werk1: string | null;
  actual_arrival_werk1: string | null;
  planned_arrival_werk2: string | null;
  actual_arrival_werk2: string | null;

  unloading_time_werk1: string | null;
  unloading_time_werk2: string | null;

  delivery_note_werk1: string | null;
  delivery_note_werk2: string | null;

  position: number | null;
  created_at: string | null;
};

export type TourColumn = {
  id: string;
  key: string;
  label: string;
  type: ColumnType;
  required: boolean;
  visible: boolean;
  active: boolean;
  position: number;
  options?: string[] | null; // 🔥 WICHTIG
};

export type TourValue = {
  id: string;
  tour_id: string;
  column_id: string;
  value: string;
};

export type PlanningDay = {
  id: string;
  planning_week_id: string;
  date: string;       // "YYYY-MM-DD"
  position: number;
};