/** The one-off fee an office pays to remove "Powered by" (stored in app_settings 'white_label_fee'). */
export type WhiteLabelFee = { amount: number; currency: string; bank: string; account_number: string; account_name: string };

export type WhiteLabelRequest = {
  id: string; office_id: string; requested_by: string; amount: number; receipt_path: string; reference: string | null;
  ai_verdict: "match" | "mismatch" | "unclear" | null; ai_notes: string | null; status: "pending" | "approved" | "rejected";
  review_note: string | null; created_at: string; reviewed_at: string | null;
};
