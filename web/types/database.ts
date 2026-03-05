/* ================= TOURS ================= */

export type Tour = {
  id: string
  week_id: string
  planning_day_id: string | null
  created_at?: string
}

export type TourColumn = {
  id: string
  label: string
  key: string
  type: string
  visible: boolean
  position?: number
  created_at?: string
  is_visible: boolean
  column_group_id: string
}

export type TourValue = {
  id: string
  tour_id: string
  column_id: string
  value: string | null
}

/* ================= RELATIONS ================= */

export type TourWithRelations = Tour & {
  values?: TourValue[]
}


/* ================= USERS ================= */

export type Profile = {
  id: string
  email?: string
  name?: string
  company?: string
  phone?: string
  role_id?: string
  created_at?: string
}


/* ================= ROLES ================= */

export type Role = {
  id: string
  name: string
}

export type Permission = {
  id?: string
  key: string
  label?: string
  description?: string
}

export type RolePermission = {
  role_id: string
  permission_id: string
}

/* ================= COLUMN TYPES ================= */

export type ColumnType =
  | "text"
  | "number"
  | "date"
  | "time"
  | "select"
  | "checkbox";