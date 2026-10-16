import { redirect } from "next/navigation";
import { adminConfigured, getSession } from "@/lib/admin-auth";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm bg-white p-8">
        <Logo variant="horizontal-colour" width={180} />
        <h1 className="mt-8 font-display text-3xl text-navy">Admin sign in</h1>
        {adminConfigured() ? (
          <div className="mt-6"><LoginForm /></div>
        ) : (
          <p className="mt-6 text-sm text-slate">The admin area is not configured yet. Set <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> (32+ characters) in the Vercel environment variables, then redeploy.</p>
        )}
      </div>
    </main>
  );
}
