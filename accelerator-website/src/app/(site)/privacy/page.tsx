import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function Page() {
  return <LegalPage title="Privacy policy" intro="How we collect, use and protect your personal information." sections={[
    { h: "Who we are", p: ["This website is operated by Accelerator Community.", { pending: "Registered name, RC number and address (from CAC documents)" }] },
    { h: "What we collect", p: ["When you register for an event we collect your name, email address, phone number, city or state, membership status and any notes you choose to share. When you contact us we collect your name, email, optional phone number and your message.", "Payments are processed by Paystack. We do not see or store your card details; we receive only the payment status, amount, reference and payment channel."] },
    { h: "How we use it", p: ["To manage your registration, confirm your payment, communicate with you about the event, respond to your enquiries and keep accurate records. We do not sell your personal information."] },
    { h: "How we protect it", p: ["Registration records are stored in a secured database that is not publicly accessible. Only authorised administrators can view them."] },
    { h: "How long we keep it", p: [{ pending: "Data retention period to be confirmed" }] },
    { h: "Your rights", p: ["You can ask to see, correct or delete the personal information we hold about you, subject to our legal and accounting obligations, including the Nigeria Data Protection Act 2023.", "To make a request, email info@acceleratorsbillionaires.com."] },
  ]} />;
}
