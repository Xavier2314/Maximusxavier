import { redirect } from "next/navigation";

/** The editor moved to a full-screen builder. */
export default async function EditFunnelRedirect({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/builder/${(await params).id}`);
}
