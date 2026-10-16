import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Refund and Cancellation Policy", alternates: { canonical: "/refunds" } };

export default function Page() {
  return <LegalPage title="Refunds and cancellations" intro="What happens if you cannot attend, or if an event changes." sections={[
    { h: "Cancelling your registration", p: [{ pending: "Refund eligibility and deadline" }] },
    { h: "Transferring your ticket", p: [{ pending: "Whether tickets can be transferred to another person" }] },
    { h: "Duplicate payments", p: ["If you are charged twice for the same registration, contact us with both payment references and we will review the duplicate for a refund."] },
    { h: "If the event changes", p: [{ pending: "Refund policy if the event is postponed or cancelled" }] },
    { h: "How refunds are paid", p: ["Approved refunds are returned to the original payment method through Paystack. Processing times depend on your bank."] },
  ]} />;
}
