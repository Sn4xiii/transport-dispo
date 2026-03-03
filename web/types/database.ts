export type ColumnType =
  | "text"
  | "number"
  | "datetime"
  | "select"
  | "delay";

export type Tour = {
  id: string;
  planning_week_id: string;
  position: number;
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