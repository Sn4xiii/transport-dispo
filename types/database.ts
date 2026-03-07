/* ================= TOURS ================= */

export type Tour = {
  id: string
  planning_day_id: string | null
  position: number | null

  cancelled: boolean | null
  truck_number: string | null
  truck_type_id: string | null
  planned_arrival_werk1: string | null

  gps_link: string | null

  pls_shift_loading_date: string | null
  pls_shift_loading_time: string | null
  pls_shift_planned_date: string | null
  pls_shift_planned_time: string | null
  pls_shift_registered_arrival_date: string | null
  pls_shift_registered_arrival_time: string | null

  bgn_shift_loading_arrival_date: string | null
  bgn_shift_loading_arrival_time: string | null
  bgn_shift_loading_departure_date: string | null
  bgn_shift_loading_departure_time: string | null
  bgn_shift_delivery_note: string | null

  bgn_shift_unloading_planned_date: string | null
  bgn_shift_unloading_planned_time: string | null
  bgn_shift_unloading_arrival_date: string | null
  bgn_shift_unloading_arrival_time: string | null
  bgn_shift_unloading_start_date: string | null
  bgn_shift_unloading_start_time: string | null
  bgn_shift_unloading_departure_date: string | null
  bgn_shift_unloading_departure_time: string | null

  container_arrival_check: string | null

  ewals_delivery_note: string | null
  ewals_cmr: string | null
  ewals_actual: string | null
  ewals_damage: string | null

  empties_delivery_note: string | null
  empties_green: boolean | null
  empties_menthol: boolean | null
  empties_lightblue: boolean | null
  empties_darkblue: boolean | null
  empties_pink: boolean | null
  empties_purple: boolean | null
  empties_white_karton: boolean | null

  pls_plant_unloading_planned_date: string | null
  pls_plant_unloading_planned_time: string | null

  ceva_registered_arrival_empties_date: string | null
  ceva_registered_arrival_empties_time: string | null
  rt_st: string | null
  plate_numbers: string | null
  waiting_times: string | null
  comment: string | null

  reason_kpi_code_1: string | null
  reason_kpi_code_2: string | null

  delay_1: string | null
  delay_2: string | null
  delay_3: string | null
  delay_4: string | null

  loading_pls: string | null
  unloading_empties_pls: string | null
  result_1: string | null
  result_2: string | null
  unloading_result_1: string | null
  unloading_result_2: string | null

  eta_bgn_date: string | null
  eta_bgn_time: string | null

  created_at?: string | null
  updated_at?: string | null
}

export type TourColumn = {
  id: string
  key: string
  label: string
  type: string
  column_group_id: string | null
  order_index: number
  is_visible: boolean
  is_system: boolean
  field_type: "text" | "date" | "time" | "boolean"
  width?: number | null
  placeholder?: string | null
}

export type ColumnGroup = {
  id: string
  name: string
  position: number
  is_visible: boolean
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