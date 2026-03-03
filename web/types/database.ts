export type ColumnType = "text" | "number" | "datetime" | "select";

export type TourColumn = {
  id: string;
  key: string;
  label: string;
  type: ColumnType;
  required: boolean;
  visible: boolean;
  position: number;
  active: boolean;
};

export type Tour = {
  id: string;
  planning_week_id: string;
  created_at: string;
};

export type TourValue = {
  id: string;
  tour_id: string;
  column_id: string;
  value: string;
};