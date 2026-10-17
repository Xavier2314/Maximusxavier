import { ShieldAlert } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { signOutAction } from "../(auth)/actions";

export const metadata = { title: "Account unavailable" };

export default function SuspendedPage() {
  return (
    <main className="auth-gradient grid min-h-dvh place-items-center px-6 text-white">
      <div className="max-w-sm text-center">
        <Logo variant="mark" className="mx-auto h-14 w-auto" />
        <ShieldAlert className="mx-auto mt-8 size-8 text-brand-lime" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Your account is not active</h1>
        <p className="mt-2 text-white/70">Your membership has been suspended or deactivated. Please contact your office manager or an administrator.</p>
        <form action={signOutAction} className="mt-6">
          <button className="inline-flex h-11 items-center rounded-xl bg-white/10 px-5 font-medium ring-1 ring-white/20 hover:bg-white/15">Sign out</button>
        </form>
      </div>
    </main>
  );
}
