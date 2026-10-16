# Part-payment sheet: one-time setup (about 5 minutes)

When a member pays only part of their fee, the registration page lets them sign a
**Part Payment Commitment Letter** (PDF). Each signed letter can also be added automatically
as a new row in the Google Sheet **"Accelerators Events 2026 - Part Payments"**.

Sheet: https://docs.google.com/spreadsheets/d/1gOcSeovSq3zMdFoqGP7mSTWwih1sbyC0GySqGlBOu0g/edit

## 1. Add the script to the sheet
1. Open the sheet, then **Extensions → Apps Script**.
2. Delete everything in `Code.gs` and paste the script below.
3. Change `SECRET` to a long random word of your own (for example `summit-7Gq2xL9pWm4`). Keep it private.
4. Click **Save**.

```javascript
const SECRET = "CHANGE-ME-to-a-long-random-word";

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.secret !== SECRET) return out({ ok: false, error: "unauthorised" });
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow([
      new Date(), d.ref, d.fullName, "'" + d.phone, d.email, d.position,
      d.feeNaira, d.paidNaira, d.balanceNaira, d.receipts, d.balanceDate, d.signedAt, "Balance pending",
    ]);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
```

## 2. Publish it
1. Click **Deploy → New deployment**, choose type **Web app**.
2. Execute as: **Me**. Who has access: **Anyone**.
3. Click **Deploy**, allow the permissions, and copy the **Web app URL** (ends in `/exec`).

## 3. Connect it to the website (Vercel)
In Vercel: **accelerator-community → Settings → Environment Variables**, add for Production:

| Name | Value |
| --- | --- |
| `PART_PAYMENT_SHEET_URL` | the Web app URL from step 2 |
| `PART_PAYMENT_SHEET_SECRET` | the same SECRET word from step 1 |

Then redeploy (Deployments → latest → Redeploy). New part payments now appear in the sheet.
When a member pays their balance, change their **Status** cell to "Paid in full".

Until this is set up, the letter still downloads and the member can send it to the team on
WhatsApp with one tap.
