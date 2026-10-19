import Link from "next/link";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create your account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string; upline?: string; office?: string }> }) {
  const { ref, upline, office } = await searchParams;
  const supabase = await createClient();
  const [{ data: offices }, { data: invite }] = await Promise.all([
    supabase.rpc("list_public_offices"),
    upline ? supabase.rpc("upline_invite_info", { p_code: upline }) : Promise.resolve({ data: null }),
  ]);
  const joiningAbove = ((invite as { for_name: string; for_member_id: string }[] | null) ?? [])[0];
  // Company join links (/register?office=…) show the company's name and logo.
  const company = office && /^[0-9a-f-]{36}$/i.test(office) && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? (await createAdminClient().from("offices").select("id, name, display_name, logo_url, white_label").eq("id", office).eq("is_active", true).maybeSingle()).data
    : null;
  const companyName = company?.white_label ? (company.display_name || company.name) : null;
  return (
    <>
      {company?.logo_url && companyName && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={company.logo_url} alt={companyName} className="mb-4 h-14 w-auto max-w-[200px] object-contain" />
      )}
      <h1 className="text-3xl font-bold tracking-tight">{joiningAbove ? "Welcome, sponsor" : `Join ${companyName ?? "Maximus"}`}</h1>
      <p className="mt-1 text-fg-muted">Create your member account in three quick steps.</p>
      {joiningAbove && (
        <p className="mt-4 rounded-2xl bg-success-soft px-4 py-3 text-sm text-success" role="status">
          You&apos;re joining as <b>{joiningAbove.for_name}</b>&apos;s sponsor ({joiningAbove.for_member_id}).
          Once you create your account, {joiningAbove.for_name.split(" ")[0]} and their whole team will appear under you.
        </p>
      )}
      <RegisterForm offices={(offices as { id: string; name: string }[] | null) ?? []} referralCode={ref}
        uplineCode={joiningAbove ? upline : undefined} officeId={company?.id} />
      <p className="mt-8 text-center text-sm text-fg-muted">
        Already a member?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
      </p>
    </>
  );
}
