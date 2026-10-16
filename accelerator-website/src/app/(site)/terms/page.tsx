import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms and Conditions", alternates: { canonical: "/terms" } };

export default function Page() {
  return <LegalPage title="Terms and conditions" intro="The terms that apply when you use this website or register for an event." sections={[
    { h: "Using this website", p: ["By using this website you agree to these terms. Please do not misuse the site, attempt to access areas you are not authorised to use, or submit false information."] },
    { h: "Event registration", p: ["A registration is confirmed only after your payment has been verified and you have received a registration reference. Each registration is for one named attendee.", "Ticket categories are available only during their published sales windows (Lagos time). Prices and benefits are shown on the event page."] },
    { h: "Event changes", p: ["We may need to change speakers, programme items or timings. We will communicate significant changes to registered attendees.", { pending: "Policy for change of date or venue" }] },
    { h: "Photography and filming", p: [{ pending: "Consent wording for photos and video at events" }] },
    { h: "Code of conduct", p: ["We expect everyone to treat fellow members, guests, speakers and staff with respect. We may refuse entry to anyone who behaves in a way that puts others at risk."] },
    { h: "Contact", p: [{ pending: "Official contact details" }] },
  ]} />;
}
