import Link from "next/link";
import { companyFromCookie } from "@/lib/company-brand";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const company = await companyFromCookie();
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-fg-muted">Sign in to continue your growth journey.</p>
      {error === "link_expired" && (
        <p className="mt-4 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning" role="alert">
          That link has expired or was already used. Please sign in or request a new one.
        </p>
      )}
      <LoginForm next={next} />
      <p className="mt-8 text-center text-sm text-fg-muted">
        New to {company?.full ? company.name : "Maximus"}?{" "}
        <Link href={company ? `/register?office=${company.id}` : "/register"} className="font-semibold text-primary hover:underline">Create your account</Link>
      </p>
    </>
  );
}
