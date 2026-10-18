import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create your account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string; upline?: string }> }) {
  const { ref, upline } = await searchParams;
  const supabase = await createClient();
  const [{ data: offices }, { data: invite }] = await Promise.all([
    supabase.rpc("list_public_offices"),
    upline ? supabase.rpc("upline_invite_info", { p_code: upline }) : Promise.resolve({ data: null }),
  ]);
  const joiningAbove = ((invite as { for_name: string; for_member_id: string }[] | null) ?? [])[0];
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{joiningAbove ? "Welcome, sponsor" : "Join Maximus"}</h1>
      <p className="mt-1 text-fg-muted">Create your member account in three quick steps.</p>
      {joiningAbove && (
        <p className="mt-4 rounded-2xl bg-success-soft px-4 py-3 text-sm text-success" role="status">
          You&apos;re joining as <b>{joiningAbove.for_name}</b>&apos;s sponsor ({joiningAbove.for_member_id}).
          Once you create your account, {joiningAbove.for_name.split(" ")[0]} and their whole team will appear under you.
        </p>
      )}
      <RegisterForm offices={(offices as { id: string; name: string }[] | null) ?? []} referralCode={ref}
        uplineCode={joiningAbove ? upline : undefined} />
      <p className="mt-8 text-center text-sm text-fg-muted">
        Already a member?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
      </p>
    </>
  );
}
