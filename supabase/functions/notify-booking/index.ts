// Supabase Edge Function: notify-booking
// Triggered by a Database Webhook on INSERT into public.bookings.
// Sends an email to the Kanaan inbox via Resend.
// Deploy:  supabase functions deploy notify-booking
// Set secret:  supabase secrets set RESEND_KEY=re_xxxxxxxxxxxx

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_KEY = Deno.env.get("RESEND_KEY")!;
const NOTIFY_EMAIL = Deno.env.get("NOTIFY_EMAIL") || "kanaansaloon@gmail.com";
const FROM_ADDRESS = Deno.env.get("FROM_ADDRESS") || "Kanaan Bookings <bookings@kanaanspa.ae>";

interface BookingPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    created_at: string;
    status: string;
    branch: string | null;
    service: string | null;
    booking_date: string | null;
    booking_time: string | null;
    name: string | null;
    phone: string | null;
    email: string | null;
    dob: string | null;
    message: string | null;
    source: string | null;
    campaign: string | null;
    locale: string | null;
  };
}

serve(async (req) => {
  try {
    const payload: BookingPayload = await req.json();
    const r = payload.record;
    const phoneClean = (r.phone || "").replace(/[^0-9]/g, "");

    const html = `
      <h2 style="font-family: Georgia, serif; color: #C8A04A; margin: 0 0 12px;">
        New booking · Kanaan
      </h2>
      <p style="font-size: 15px; margin: 0 0 16px;">
        <strong>${r.name || "—"}</strong> · ${r.phone || "—"}
      </p>
      <table style="font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Booking ID</td><td>${r.id}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Branch</td><td>${r.branch || "—"}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">Service</td><td>${r.service || "—"}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #777;">When</td><td>${r.booking_date || ""} ${r.booking_time || ""}</td></tr>
        ${r.email ? `<tr><td style="padding: 4px 12px 4px 0; color: #777;">Email</td><td>${r.email}</td></tr>` : ""}
        ${r.dob   ? `<tr><td style="padding: 4px 12px 4px 0; color: #777;">DOB</td><td>${r.dob}</td></tr>` : ""}
        ${r.message ? `<tr><td style="padding: 4px 12px 4px 0; color: #777;">Notes</td><td>${r.message}</td></tr>` : ""}
      </table>
      ${phoneClean ? `<p style="margin: 16px 0 0;"><a href="https://wa.me/${phoneClean}" style="color: #C8A04A;">→ Reply on WhatsApp</a></p>` : ""}
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [NOTIFY_EMAIL],
        subject: `New booking · ${r.branch || "Kanaan"} · ${r.name || ""}`,
        html
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error", res.status, err);
      return new Response(JSON.stringify({ ok: false, error: err }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("notify-booking error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
