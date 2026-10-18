import { notFound, redirect } from "next/navigation";
import { DEFAULT_BRAND, OFFICE_BRAND_COLUMNS, officeBrand, platformBrand, type OfficeBrandRow, type PlatformBrandSetting } from "@/lib/branding";
import { METRIC_SECTIONS, formatMetric, type OfficeReport } from "@/lib/office-report";
import { addDays } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { PrintBar } from "./print-bar";

export const metadata = { title: "Office report" };

/** A clean, printable copy of a weekly office report: open it and choose "Save as PDF". */
export default async function PrintOfficeReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: report } = await supabase.from("office_reports").select("*").eq("id", id).maybeSingle<OfficeReport & { id: string }>();
  if (!report) notFound();

  const [{ data: office }, { data: setting }, { data: earlier }] = await Promise.all([
    supabase.from("offices").select(OFFICE_BRAND_COLUMNS).eq("id", report.office_id).single<OfficeBrandRow>(),
    supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle(),
    supabase.from("office_reports").select("week_start, metrics").eq("office_id", report.office_id)
      .in("week_start", [addDays(report.week_start, -7), addDays(report.week_start, -14)]),
  ]);
  const platform = platformBrand(setting?.value as PlatformBrandSetting | null);
  const brand = officeBrand(office, platform) ?? platform;
  const last = earlier?.find((e) => e.week_start === addDays(report.week_start, -7))?.metrics as Record<string, number | null> | undefined;
  const before = earlier?.find((e) => e.week_start === addDays(report.week_start, -14))?.metrics as Record<string, number | null> | undefined;
  const c = brand.primary;
  const th: React.CSSProperties = { border: `1.5px solid ${c}`, padding: "8px 10px", color: c, fontWeight: 700, textAlign: "left", fontSize: 12 };
  const td: React.CSSProperties = { border: `1.5px solid ${c}`, padding: "8px 10px", fontSize: 12.5, verticalAlign: "top" };
  const name = office?.display_name || office?.name || "Office";
  const period = `${formatDate(report.week_start, { day: "numeric", month: "long" })} – ${formatDate(addDays(report.week_start, 6), { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <div className="print-report" style={{ background: "#fff", color: "#1f2937", minHeight: "100vh", fontFamily: "var(--font-jost), system-ui, sans-serif" }}>
      <style>{`@page { size: A4; margin: 14mm; } @media print { .print-bar { display: none !important; } body { background: #fff !important; } } .print-report table { break-inside: auto; } .print-report tr { break-inside: avoid; }`}</style>
      <PrintBar />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        <header style={{ textAlign: "center", marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {brand.logo ? <img src={brand.logo} alt={name} style={{ maxHeight: 90, maxWidth: 260, margin: "0 auto", objectFit: "contain" }} />
            : <p style={{ fontSize: 28, fontWeight: 800, color: c, margin: 0 }}>{brand.isDefault ? DEFAULT_BRAND.name : brand.name}</p>}
        </header>

        <section style={{ lineHeight: 1.9, fontWeight: 600, color: brand.sidebar, marginBottom: 20 }}>
          <div>Office Name: <span style={{ fontWeight: 700 }}>{name}</span></div>
          <div>Team Leader(s): {report.team_leaders ?? ""}</div>
          <div>Director in Charge: {report.director ?? ""}</div>
          <div>Office Location: {report.location ?? ""}</div>
          <div>Duration of Report: {period}</div>
        </section>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr><th style={{ ...th, width: 40 }}>S/N</th><th style={th}>Metric</th><th style={{ ...th, width: 110 }}>This Week</th><th style={{ ...th, width: 110 }}>Last Week</th><th style={{ ...th, width: 110 }}>Week Before</th></tr>
          </thead>
          <tbody>
            {(() => {
              let n = 0;
              return METRIC_SECTIONS.flatMap((sec) => [
                ...(sec.title ? [<tr key={sec.title}><td style={td} /><td style={{ ...td, color: c, fontWeight: 700 }} colSpan={4}>{sec.title}:</td></tr>] : []),
                ...sec.metrics.map((m) => {
                  n += 1;
                  return (
                    <tr key={m.key}>
                      <td style={td}>{n}</td>
                      <td style={td}>{m.label}{m.hint ? <i style={{ fontSize: 11 }}> ({m.hint})</i> : null}</td>
                      <td style={td}>{formatMetric(report.metrics?.[m.key], m.money, report.currency)}</td>
                      <td style={td}>{formatMetric(last?.[m.key], m.money, report.currency)}</td>
                      <td style={td}>{formatMetric(before?.[m.key], m.money, report.currency)}</td>
                    </tr>
                  );
                }),
              ]);
            })()}
          </tbody>
        </table>

        <ReportTable title="Services Offered This Week" color={c} th={th} td={td}
          head={["S/N", "Services Offered This Week", "Orders Gotten", "Top Focus Keywords", "Typical Gig Title"]}
          rows={report.services.map((s, i) => [i + 1, s.name, s.orders ?? "", s.keywords ?? "", s.gig_title ?? ""])} />
        <ReportTable title="New Services Discovered" color={c} th={th} td={td}
          head={["S/N", "New Services Discovered", "Messages Gotten", "Orders Gotten", "Top Focus Keywords", "Typical Gig Title"]}
          rows={report.new_services.map((s, i) => [i + 1, s.name, s.messages ?? "", s.orders ?? "", s.keywords ?? "", s.gig_title ?? ""])} />
        <ReportTable title="Information" color={c} th={th} td={td}
          head={["S/N", "Information", "Response"]}
          rows={[
            [1, "No. of Training Taken", report.trainings_count ?? ""],
            [2, "Training Topic(s) Taken", report.training_topics ?? ""],
            [3, "Office Timetable", report.timetable ?? ""],
            [4, "Fresh Updates Discovered?", report.fresh_updates ?? ""],
          ]} />
        <ReportTable title="Challenges" color={c} th={th} td={td}
          head={["S/N", "Challenges / Issues Faced", "Solutions Applied"]}
          rows={report.challenges.map((ch, i) => [i + 1, ch.challenge, ch.solution ?? ""])} />
        {report.notes && (
          <section style={{ border: `1.5px solid ${c}`, padding: 12, marginBottom: 24 }}>
            <p style={{ color: c, fontWeight: 700, margin: "0 0 6px", fontSize: 12 }}>Other notes</p>
            <p style={{ margin: 0, whiteSpace: "pre-line", fontSize: 12.5 }}>{report.notes}</p>
          </section>
        )}
        <footer style={{ fontSize: 10.5, color: "#6b7280", textAlign: "center", marginTop: 32 }}>
          {report.status === "submitted" && report.submitted_at ? `Submitted ${formatDate(report.submitted_at, { day: "numeric", month: "long", year: "numeric" })}` : "Draft report"}
          {!brand.whiteLabel && ` · Generated with ${platform.name}`}
        </footer>
      </main>
    </div>
  );
}

function ReportTable({ head, rows, th, td }: { title: string; color: string; head: string[]; rows: (string | number)[][]; th: React.CSSProperties; td: React.CSSProperties }) {
  const body = rows.length ? rows : [head.map((_, i) => (i === 0 ? 1 : ""))];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
      <thead><tr>{head.map((h, i) => <th key={h} style={{ ...th, width: i === 0 ? 40 : undefined }}>{h}</th>)}</tr></thead>
      <tbody>{body.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={td}>{v}</td>)}</tr>)}</tbody>
    </table>
  );
}
