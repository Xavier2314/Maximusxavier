import Link from "next/link";
export const metadata = { title: "Offline" };
export default function Offline() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="font-display text-3xl font-semibold">You&rsquo;re offline</h1>
      <p className="max-w-sm text-muted">Pages you opened recently are still available. Your reminders are sent by the server, so they keep arriving once your phone is back online.</p>
      <Link href="/" className="mt-2 rounded-xl bg-navy px-4 py-2.5 text-white">Try again</Link>
    </main>
  );
}
