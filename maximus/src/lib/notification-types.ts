/** Every notification type the platform sends, grouped for the preferences screen. */
export const NOTIFICATION_TYPES = [
  { key: "support_ticket", label: "Complaints and replies from the admin team", group: "Community" },
  { key: "shared_with_you", label: "Goals, evaluations and orders your team sends you", group: "Team" },
  { key: "goal_submitted", label: "New goal submissions from your team", group: "Team" },
  { key: "white_label", label: "White-label payments and approvals", group: "Finance" },
  { key: "task_assigned", label: "Tasks your leader gives you", group: "Team" },
  { key: "task_reminder", label: "Morning reminder of today's tasks", group: "Reminders" },
  { key: "prospecting_nudge", label: "Reminders to keep inviting prospects", group: "Reminders" },
  { key: "prospect_update", label: "Prospect replies and AI follow-ups", group: "Growth" },
  { key: "growth_focus", label: "Weekly growth focus (what to work on)", group: "Growth" },
  { key: "sponsor_feedback", label: "Feedback from your sponsor", group: "Growth" },
  { key: "evaluation_reminder", label: "Evaluation reminders", group: "Reminders" },
  { key: "goal_reminder", label: "Monthly goal-setting reminders", group: "Reminders" },
  { key: "evaluation_completed", label: "Team member completed an evaluation", group: "Team" },
  { key: "team_registration", label: "New team registrations", group: "Team" },
  { key: "team_change", label: "Changes to your sponsor or office", group: "Team" },
  { key: "order_recorded", label: "Team orders", group: "Team" },
  { key: "order_milestone", label: "Sales milestones", group: "Growth" },
  { key: "fund_update", label: "Savings and payment updates", group: "Finance" },
  { key: "attendance_update", label: "Attendance correction decisions", group: "Growth" },
  { key: "birthday", label: "Birthdays", group: "Community" },
  { key: "anniversary", label: "Membership anniversaries", group: "Community" },
  { key: "recognition", label: "Recognition posts", group: "Community" },
  { key: "training_announcement", label: "Training announcements", group: "Community" },
  { key: "admin_announcement", label: "Administrative announcements", group: "Community" },
] as const;

export type NotificationTypeKey = (typeof NOTIFICATION_TYPES)[number]["key"];
