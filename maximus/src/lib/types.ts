// Row types for the tables the app reads. Kept in sync with supabase/migrations.
// (You can regenerate full types with `supabase gen types typescript`.)

export type Permission =
  | "view_own_dashboard"
  | "view_team_dashboard"
  | "view_direct_downlines"
  | "view_extended_downline"
  | "manage_office"
  | "view_authorized_financials"
  | "approve_attendance_exceptions"
  | "review_member_goals"
  | "approve_financial_transactions"
  | "publish_announcements"
  | "manage_content"
  | "manage_roles"
  | "view_org_analytics";

export type RoleKey =
  | "member" | "downline" | "upline" | "sponsor"
  | "team_leader" | "director" | "executive_admin" | "super_admin";

export type Profile = {
  id: string;
  member_id: string;
  referral_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  date_of_birth: string | null;
  gender: string | null;
  office_id: string | null;
  sponsor_id: string | null;
  upline_id: string | null;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  birthday_visibility: "private" | "day_month" | "full";
  ai_memory_enabled: boolean;
  status: "active" | "suspended" | "deactivated";
  onboarding_completed: boolean;
  joined_at: string;
};

export type Office = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_m: number;
  timezone: string;
  schedule: Record<string, { open?: string; close?: string }>;
  manager_id: string | null;
  is_active: boolean;
  late_grace_minutes?: number;
};

export type AttendanceStatus =
  | "verified_in_office" | "outside_radius" | "location_unavailable"
  | "pending_review" | "approved_exception" | "rejected";

export type Attendance = {
  id: string;
  user_id: string;
  office_id: string;
  attendance_date: string;
  check_in_at: string;
  check_out_at: string | null;
  status: AttendanceStatus;
  method: "gps" | "manual" | "admin";
  check_in_accuracy_m: number | null;
  check_in_distance_m: number | null;
  check_out_distance_m: number | null;
  note: string | null;
};

export type GoalStatus = "draft" | "submitted" | "approved" | "revision_requested";

export type CustomGoal = { title: string; target?: number | null; unit?: string | null };

export type MonthlyGoal = {
  id: string;
  user_id: string;
  month: string;
  income_target: number | null;
  sales_target: number | null;
  prospecting_target: number | null;
  recruitment_target: number | null;
  order_target: number | null;
  savings_target: number | null;
  personal_development_target: string | null;
  custom_goals: CustomGoal[];
  plan_text?: string | null;
  status: GoalStatus;
  reviewer_id: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

export type GoalProgress = {
  income: number; sales: number; prospecting: number; recruitment: number; orders: number; savings: number;
};

export type Evaluation = {
  id: string;
  user_id: string;
  period_date: string;
  earnings: number;
  prospects: number;
  presentations: number;
  follow_ups: number;
  orders_generated: number;
  new_joins: number;
  members_supported: number;
  challenges: string | null;
  priorities: string | null;
  support_needed: string | null;
  submitted_at: string;
};

export type TransactionKind = "deposit" | "contribution" | "withdrawal" | "adjustment" | "reversal";
export type TransactionStatus = "pending" | "confirmed" | "rejected";

export type FinancialTransaction = {
  id: string;
  account_id: string;
  user_id: string;
  kind: TransactionKind;
  direction: 1 | -1;
  amount: number;
  status: TransactionStatus;
  source: "self_reported" | "admin_recorded";
  occurred_on: string;
  receipt_path: string | null;
  note: string | null;
  reference_id: string | null;
  created_at: string;
};

export type AccountBalance = {
  account_id: string;
  user_id: string;
  kind: "savings" | "contributions";
  name: string;
  target_amount: number | null;
  currency: string;
  confirmed_balance: number;
  pending_in: number;
  pending_out: number;
};

export type Order = {
  id: string;
  member_id: string;
  recorded_by: string | null;
  customer_name: string | null;
  amount: number;
  business_volume: number | null;
  category: string | null;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  order_date: string;
  notes: string | null;
  platform?: string | null;
  description?: string | null;
  attachment_path?: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type TeamMemberStat = {
  member: string;
  full_name: string;
  member_code: string;
  avatar_url: string | null;
  office_name: string | null;
  depth: number;
  sponsor_id: string | null;
  joined_at: string;
  status: Profile["status"];
  attendance_days: number;
  prospects: number;
  orders: number;
  sales: number;
  evaluations: number;
  last_activity: string | null;
  is_active: boolean;
};
