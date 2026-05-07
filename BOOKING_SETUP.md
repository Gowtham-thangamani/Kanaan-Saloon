# Kanaan Booking Database — Setup Guide

Total time: ~10 minutes. Cost: $0/month forever. Result: every booking → row in your Google Sheet + email to kanaansaloon@gmail.com.

---

## STEP 1 — Create the Google Sheet

1. Go to [sheets.new](https://sheets.new) (signed in as **kanaansaloon@gmail.com**).
2. Rename it: **`Kanaan Bookings`** (top-left, click the title).
3. Rename the first tab from "Sheet1" to **`Bookings`** (right-click the tab → Rename).

That's it. The script in Step 2 will auto-populate the headers when the first booking comes in.

---

## STEP 2 — Add the Apps Script

1. In your Sheet, click **Extensions → Apps Script**. A new tab opens.
2. Delete everything in the editor (the empty `function myFunction()` block).
3. Paste **this entire block** in its place:

```javascript
/* Kanaan Bookings webhook — receives form submissions, logs to sheet, emails admin. */
const SHEET_NAME = 'Bookings';
const NOTIFY_EMAIL = 'kanaansaloon@gmail.com';
const HEADERS = [
  'Booking ID','Timestamp','Status','Branch','Service','Date','Time',
  'Name','Phone','Email','DOB','Notes','Source','Campaign','Locale'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Initialize header row if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0E0F11').setFontColor('#C8A04A');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      data.bookingId || '',
      data.timestamp || new Date().toISOString(),
      'New',
      data.branch || '',
      data.service || '',
      data.date || '',
      data.time || '',
      data.name || '',
      data.phone || '',
      data.email || '',
      data.dob || '',
      data.message || '',
      data.utm_source || '',
      data.utm_campaign || '',
      data.locale || 'en'
    ]);

    // Email admin
    const subject = 'New booking · ' + (data.branch || 'Kanaan') + ' · ' + (data.name || '');
    const phoneClean = (data.phone || '').replace(/[^0-9]/g, '');
    const body = [
      'New booking received at Kanaan.',
      '',
      'Booking ID:  ' + (data.bookingId || ''),
      'Branch:      ' + (data.branch || ''),
      'Service:     ' + (data.service || ''),
      'When:        ' + (data.date || '') + ' ' + (data.time || ''),
      'Customer:    ' + (data.name || ''),
      'Phone:       ' + (data.phone || ''),
      data.email ? 'Email:       ' + data.email : '',
      data.dob   ? 'DOB:         ' + data.dob   : '',
      data.message ? 'Notes:       ' + data.message : '',
      '',
      phoneClean ? 'Reply on WhatsApp: https://wa.me/' + phoneClean : '',
      'Open Sheet:        ' + ss.getUrl()
    ].filter(Boolean).join('\n');

    MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: subject, body: body });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, id: data.bookingId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('Kanaan Bookings webhook is live.');
}
```

4. Click the floppy-disk icon (or `Ctrl+S`) to save. Name the project **`Kanaan Bookings Webhook`**.

---

## STEP 3 — Deploy as Web App

1. Top-right of the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon ⚙️ next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `Kanaan booking webhook v1`
   - **Execute as:** `Me (kanaansaloon@gmail.com)`
   - **Who has access:** **`Anyone`** *(important — the form needs to POST without authentication)*
4. Click **Deploy**.
5. Google will ask you to authorize → click **Authorize access** → pick your Google account → it warns "unverified" → click **Advanced → Go to Kanaan Bookings Webhook (unsafe)** → **Allow**. (This warning is normal for personal scripts.)
6. **Copy the Web app URL** — looks like:
   `https://script.google.com/macros/s/AKfycbXXX...XXX/exec`

Keep this URL — you'll paste it in Step 4.

---

## STEP 4 — Wire the URL into the website

1. Open the file: **`assets/js/config.js`**
2. Find this line:
   ```js
   webhookUrl: '',
   ```
3. Paste your URL between the quotes:
   ```js
   webhookUrl: 'https://script.google.com/macros/s/AKfycbXXX...XXX/exec',
   ```
4. Save.

That's it. Every booking submitted on the site now flows to your Sheet + emails you.

---

## STEP 5 — Connect the admin panel (optional but recommended)

To see all bookings in `/admin/leads.html` from any device:

1. Back in your Sheet, click **File → Share → Publish to web**.
2. Dropdowns:
   - **Bookings** (the tab name)
   - **Comma-separated values (.csv)**
3. Click **Publish** → confirm → copy the URL it gives you.
4. Open `/admin/index.html` → log in (`kanaan2026`) → **Settings** → paste the CSV URL into "Leads CSV URL" → **Save**.

Your `/admin/leads.html` page will now show every booking from any device.

---

## Test it

1. Open your site → submit a test booking.
2. Within 5 seconds:
   - **A new row** appears in the `Bookings` tab.
   - **An email** lands in kanaansaloon@gmail.com with all the details + a WhatsApp reply link.
   - **Admin panel** shows it (refresh `/admin/leads.html`).
   - **Your phone** gets a WhatsApp message (the existing flow — independent of the Sheet).

---

## What's stored per booking

| Column | Example |
|---|---|
| Booking ID | KNN-VIP-LXY8K3M2 |
| Timestamp | 2026-05-08T14:32:18.456Z |
| Status | New *(you change this manually to Confirmed/Canceled)* |
| Branch | VIP Muroor |
| Service | Hair & Beard |
| Date | 2026-05-10 |
| Time | 17:30 |
| Name | Ahmed Khalid |
| Phone | +971 50 555 1234 |
| Email | ahmed@example.com |
| DOB | 1990-03-15 |
| Notes | Preferred barber: Yusuf |
| Source | google / instagram / direct |
| Campaign | (UTM) |
| Locale | en / ar |

---

## Optional upgrades (later)

- **Branch view-only access:** in the Sheet → File → Share → enter each branch manager's email as Viewer. They can filter rows by branch.
- **Auto-stats dashboard:** add a second tab `Dashboard` with `=COUNTA('Bookings'!A2:A)` for total bookings, `=COUNTIF('Bookings'!D:D,"VIP Muroor")` per branch.
- **WhatsApp via Twilio:** if you want bookings auto-sent to a WhatsApp Business number with formatting, add a `MailApp` → Twilio call inside `doPost`. Costs $0.005/message.
- **Reschedule webhook:** add a `doPost` branch that listens for `action: 'reschedule'` and updates the matching row.

---

## Troubleshooting

- **"Authorization required" loop:** redeploy with "Anyone" access (Step 3.3).
- **Bookings appearing twice:** check you only deployed once. Look in **Deploy → Manage deployments** — keep one active deployment, archive others.
- **No email:** check kanaansaloon@gmail.com spam folder. Apps Script daily quota is 100 emails for free accounts — plenty for a salon.
- **CORS errors in browser console:** the Web App URL must end in `/exec` — not `/dev`.

That's the whole system. Free, owned by you, scales to 100k+ rows, no monthly fees ever.
