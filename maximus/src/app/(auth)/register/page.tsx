import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create your account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const supabase = await createClient();
  const { data: offices } = await supabase.rpc("list_public_offices");
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Join Maximus</h1>
      <p className="mt-1 text-fg-muted">Create your member account in three quick steps.</p>
      <RegisterForm offices={(offices as { id: string; name: string }[] | null) ?? []} referralCode={ref} />
      <p className="mt-8 text-center text-sm text-fg-muted">
        Already a member?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
      </p>
    </>
  );
}
