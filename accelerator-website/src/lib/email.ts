import "server-only";

/** Sends email through Resend when RESEND_API_KEY is set; otherwise logs and returns false. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info(`[email] skipped (not configured): ${subject} -> ${to}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) console.error("[email] failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[email] error", e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function confirmationEmail(p: { name: string; reference: string; ticket: string; amount: string; eventName: string; eventWhen: string | null; eventWhere: string | null }) {
  return `<!doctype html><html><body style="margin:0;background:#F4F1EA;font-family:Arial,sans-serif;color:#1A1A1A">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff">
<tr><td style="background:#0B1E3F;padding:28px 32px;color:#fff;font-family:Georgia,serif;font-size:24px">Accelerator Community</td></tr>
<tr><td style="padding:32px">
<p style="font-size:12px;letter-spacing:3px;color:#E11E2D;font-weight:bold;margin:0 0 12px">REGISTRATION CONFIRMED</p>
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:28px;color:#0B1E3F;margin:0 0 16px">You're in, ${esc(p.name.split(" ")[0])}.</h1>
<p style="line-height:1.6">Your payment was verified and your place at <b>${esc(p.eventName)}</b> is confirmed.</p>
<table cellpadding="8" style="border-collapse:collapse;width:100%;margin:20px 0;font-size:14px">
<tr style="border-top:1px solid #ddd"><td style="color:#5E6678">Reference</td><td><b>${esc(p.reference)}</b></td></tr>
<tr style="border-top:1px solid #ddd"><td style="color:#5E6678">Ticket</td><td>${esc(p.ticket)}</td></tr>
<tr style="border-top:1px solid #ddd"><td style="color:#5E6678">Amount paid</td><td>${esc(p.amount)}</td></tr>
<tr style="border-top:1px solid #ddd"><td style="color:#5E6678">Date</td><td>${esc(p.eventWhen ?? "To be announced")}</td></tr>
<tr style="border-top:1px solid #ddd;border-bottom:1px solid #ddd"><td style="color:#5E6678">Venue</td><td>${esc(p.eventWhere ?? "To be announced")}</td></tr>
</table>
<p style="line-height:1.6">Keep this email. Show your reference at check-in.</p>
</td></tr></table></td></tr></table></body></html>`;
}
