import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Privacy policy" };

// Plain-language starting point. Have it reviewed by your legal adviser
// (e.g. against the Nigeria Data Protection Act 2023) before launch.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link href="/" aria-label="Maximus home"><Logo className="h-9 w-auto text-fg" /></Link>
      <h1 className="mt-10 text-3xl font-bold tracking-tight">Privacy policy</h1>
      <p className="mt-2 text-sm text-fg-subtle">Draft — pending review by the Maximus administration.</p>
      <div className="mt-8 space-y-6 leading-relaxed text-fg-muted [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg">
        <section>
          <h2>What we collect</h2>
          <p>Your name, email, phone and WhatsApp numbers, date of birth, optional gender and profile picture, your office, sponsor and upline, and the activity you record in Maximus: attendance check-ins (including the location your device reports when you check in), goals, evaluations, orders and financial records.</p>
        </section>
        <section>
          <h2>Why we collect it</h2>
          <p>To run your membership: organising teams, supporting your development, recording attendance, reviewing goals and evaluations, and keeping an auditable record of contributions and savings.</p>
        </section>
        <section>
          <h2>Location</h2>
          <p>Your location is requested only when you tap Check in or Check out, and only with your browser&apos;s permission. It is compared with your office&apos;s registered location. A matching location is not proof of physical presence.</p>
        </section>
        <section>
          <h2>Who can see your information</h2>
          <p>You can see all of your own data. Your sponsor and authorised leaders can see your activity (attendance, goals, evaluations, orders) for their own team only. Your financial records are visible to finance administrators, and to a leader only if you explicitly share them. Your Maximus AI conversations are private to you.</p>
        </section>
        <section>
          <h2>Birthdays</h2>
          <p>Your birthday is shown to the team only if you opt in, and then only the day and month unless you choose otherwise.</p>
        </section>
        <section>
          <h2>Identity numbers</h2>
          <p>Maximus does not collect your NIN. Any future identity verification will only be introduced with a lawful basis, a clear explanation and your consent.</p>
        </section>
        <section>
          <h2>Your choices</h2>
          <p>You can edit your profile, change notification and birthday settings, turn Maximus AI memory on or off (turning it off deletes stored memories), and ask an administrator to export or delete your data.</p>
        </section>
      </div>
    </main>
  );
}
