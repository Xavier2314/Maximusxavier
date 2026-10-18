import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { QrCheckIn } from "./qr-check-in";

export const metadata = { title: "Office check-in" };

/** Opened by scanning the office's QR poster with the phone camera. */
export default async function QrCheckInPage({ params }: { params: Promise<{ code: string }> }) {
  await requireViewer();
  const { code } = await params;
  return (
    <>
      <PageHeader eyebrow="Attendance" title="Office check-in" />
      <QrCheckIn code={code} />
    </>
  );
}
