// Supabase Edge Function: notify-booking
// Generic notifier for any of the form tables: bookings, contacts, newsletter, careers, vouchers.
// Triggered by a Database Webhook on INSERT into the relevant table.
// Sends an email to the Kanaan inbox via Resend.
// Deploy:      supabase functions deploy notify-booking
// Set secret:  supabase secrets set RESEND_KEY=re_xxxxxxxxxxxx

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_KEY = Deno.env.get("RESEND_KEY")!;
const NOTIFY_EMAIL = Deno.env.get("NOTIFY_EMAIL") || "kanaansaloon@gmail.com";
const FROM_ADDRESS = Deno.env.get("FROM_ADDRESS") || "Kanaan Notifications <bookings@kanaanspa.ae>";
// Set this when deploying so the QR codes + reschedule links in emails point at
// your live domain (no trailing slash). Fallback is the production URL.
const SITE_URL = Deno.env.get("SITE_URL") || "https://kanaanspa.ae";

/* Build the booking-confirmation URL the QR encodes. The customer's QR scan
   re-opens this URL in any browser; the same URL is also a good plain-text
   fallback link inside the email. */
function bookingConfirmationUrl(r: Record<string, unknown>): string {
  const params = new URLSearchParams();
  if (r.id)            params.set("id",      String(r.id));
  if (r.branch)        params.set("branch",  String(r.branch));
  if (r.service)       params.set("service", String(r.service));
  if (r.booking_date)  params.set("date",    String(r.booking_date));
  if (r.booking_time)  params.set("time",    String(r.booking_time));
  return `${SITE_URL}/thank-you.html?${params.toString()}`;
}

/* Build a QR image URL (PNG, 240x240, no margin) using the qrserver.com API.
   The encoded payload is the booking confirmation URL — same as the QR shown
   on the thank-you page so they're visually identical. */
function bookingQrUrl(confirmationUrl: string): string {
  const data = encodeURIComponent(confirmationUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${data}`;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

const SUBJECT_BY_TABLE: Record<string, (r: Record<string, unknown>) => string> = {
  bookings:   (r) => `New booking · ${r.branch || "Kanaan"} · ${r.name || ""}`,
  contacts:   (r) => `Contact form · ${r.subject || r.name || ""}`,
  newsletter: (r) => `Newsletter signup · ${r.email || ""}`,
  careers:    (r) => `Job application · ${r.role || ""} · ${r.name || ""}`,
  vouchers:   (r) => `Gift voucher request · ${r.amount || ""} AED · for ${r.recipient || ""}`,
};

const HEADING_BY_TABLE: Record<string, string> = {
  bookings:   "New booking · Kanaan",
  contacts:   "New contact-form enquiry",
  newsletter: "New newsletter signup",
  careers:    "New job application",
  vouchers:   "New gift voucher order",
};

function row(label: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return `<tr><td style="padding: 4px 12px 4px 0; color: #777;">${label}</td><td>${escapeHtml(String(value))}</td></tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildBody(table: string, r: Record<string, unknown>): string {
  const heading = HEADING_BY_TABLE[table] || `New ${table} record`;
  const phone = (r.phone as string | undefined) || "";
  const phoneClean = phone.replace(/[^0-9]/g, "");

  let rows = "";
  if (table === "bookings") {
    rows += row("Booking ID", r.id);
    rows += row("Branch", r.branch);
    rows += row("Service", r.service);
    rows += row("When", `${r.booking_date || ""} ${r.booking_time || ""}`.trim());
    rows += row("Email", r.email);
    rows += row("DOB", r.dob);
    rows += row("Notes", r.message);
  } else if (table === "contacts") {
    rows += row("Subject", r.subject);
    rows += row("Email", r.email);
    rows += row("Message", r.message);
    rows += row("Page", r.page);
  } else if (table === "newsletter") {
    rows += row("Email", r.email);
    rows += row("Page", r.page);
  } else if (table === "careers") {
    rows += row("Role", r.role);
    rows += row("Experience", r.experience);
    rows += row("Branch preference", r.branch_preference);
    rows += row("Email", r.email);
    rows += row("Portfolio", r.portfolio);
    rows += row("CV path (Storage)", r.cv_path);
    rows += row("CV filename", r.cv_filename);
    rows += row("Cover note", r.message);
  } else if (table === "vouchers") {
    rows += row("Amount (AED)", r.amount);
    rows += row("Recipient", r.recipient);
    rows += row("From", r.sender);
    rows += row("Occasion", r.occasion);
    rows += row("Note", r.note);
  } else {
    // Unknown table — dump everything except internal fields.
    Object.entries(r).forEach(([k, v]) => {
      if (!["id", "created_at", "status", "source", "campaign", "locale"].includes(k)) {
        rows += row(k, v);
      }
    });
  }
  rows += row("Source", r.source);
  rows += row("Campaign", r.campaign);

  const headerLine = `<strong>${escapeHtml(String(r.name || r.recipient || r.email || ""))}</strong>${phone ? " · " + escapeHtml(phone) : ""}`;

  return `
    <h2 style="font-family: Georgia, serif; color: #C8A04A; margin: 0 0 12px;">${heading}</h2>
    <p style="font-size: 15px; margin: 0 0 16px;">${headerLine}</p>
    <table style="font-size: 14px; border-collapse: collapse;">${rows}</table>
    ${phoneClean ? `<p style="margin: 16px 0 0;"><a href="https://wa.me/${phoneClean}" style="color: #C8A04A;">→ Reply on WhatsApp</a></p>` : ""}
  `;
}

/* Customer-facing confirmation email — only sent for `bookings` inserts when the
   record has an email and the booking is in 'new' or 'confirmed' state. */
function buildCustomerBody(r: Record<string, unknown>): string {
  const name = String(r.name || "there");
  const branch = String(r.branch || "Kanaan");
  const date = String(r.booking_date || "");
  const time = String(r.booking_time || "");
  const id = String(r.id || "");
  const confirmationUrl = bookingConfirmationUrl(r);
  const qrUrl = bookingQrUrl(confirmationUrl);

  return `
    <h2 style="font-family: Georgia, serif; color: #C8A04A; margin: 0 0 12px;">Your chair is reserved.</h2>
    <p style="font-size: 15px; margin: 0 0 16px;">Hi ${escapeHtml(name)}, this is Kanaan — confirming we received your booking.</p>

    <table style="font-size: 14px; border-collapse: collapse; margin-bottom: 16px;">
      ${row("Booking ID", id)}
      ${row("Branch", branch)}
      ${row("Service", r.service)}
      ${row("When", `${date} ${time}`.trim())}
    </table>

    <!-- Per-booking QR — shown at the chair so staff can pull up your booking instantly. -->
    <div style="border: 1px solid #E8E5DD; border-top: 2px solid #C8A04A; padding: 16px; margin: 0 0 16px; text-align: center;">
      <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #777; margin: 0 0 12px;">Show this at the desk</p>
      <img src="${qrUrl}" alt="Booking QR ${escapeHtml(id)}" width="200" height="200" style="display: inline-block;" />
      <p style="font-family: Georgia, serif; font-size: 18px; color: #C8A04A; margin: 12px 0 0; letter-spacing: 0.04em;">${escapeHtml(id)}</p>
      <p style="font-size: 12px; color: #999; margin: 6px 0 0;">If the QR doesn't render, just read your Booking ID out loud at the desk.</p>
    </div>

    <p style="font-size: 13px; margin: 0 0 16px;">
      <a href="${confirmationUrl}" style="color: #C8A04A;">Open your booking confirmation page →</a>
    </p>

    <p style="font-size: 14px; margin: 0 0 8px;"><strong>What happens next:</strong></p>
    <ol style="font-size: 14px; padding-left: 20px; margin: 0 0 16px;">
      <li>The branch will WhatsApp you within 30 minutes during open hours to confirm.</li>
      <li>You'll get a reminder 24 hours before — reply <em>reschedule</em> or <em>cancel</em> any time, free up to 2 hours before.</li>
      <li>Arrive 5 minutes early; pay at the chair after. Show the QR or quote the Booking ID.</li>
    </ol>
    <p style="font-size: 13px; color: #777;">Need to change something now? Reply to this email or message us on <a href="https://wa.me/971505556795" style="color: #C8A04A;">WhatsApp</a>.</p>
  `;
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    if (payload.type !== "INSERT" || !payload.record) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    const table = payload.table || "bookings";
    const r = payload.record;
    const subject = (SUBJECT_BY_TABLE[table] || ((rec: Record<string, unknown>) => `New ${table} record`))(r);
    const html = buildBody(table, r);

    // 1. Admin notification (always)
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [NOTIFY_EMAIL],
        subject,
        html,
      }),
    });
    if (!adminRes.ok) {
      const err = await adminRes.text();
      console.error("Resend admin error", adminRes.status, err);
    }

    // 2. Customer confirmation (bookings table only, and only if email present)
    let customerOk: boolean | null = null;
    if (table === "bookings" && r.email && typeof r.email === "string" && r.email.includes("@")) {
      const customerRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [r.email],
          reply_to: NOTIFY_EMAIL,
          subject: `Your Kanaan booking — ${r.branch || "confirmation"}`,
          html: buildCustomerBody(r),
        }),
      });
      customerOk = customerRes.ok;
      if (!customerRes.ok) {
        const err = await customerRes.text();
        console.error("Resend customer error", customerRes.status, err);
      }
    }

    return new Response(JSON.stringify({ ok: true, admin: adminRes.ok, customer: customerOk }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-booking error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
