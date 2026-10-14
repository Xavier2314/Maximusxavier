import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="pt-safe flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-lg" />
          <h1 className="font-display text-3xl font-semibold tracking-tight">MY RHYTHM</h1>
          <p className="mt-1 text-muted">Structure Your Days. Build Your Future.</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-muted">Private app · for its owner only</p>
      </div>
    </main>
  );
}
