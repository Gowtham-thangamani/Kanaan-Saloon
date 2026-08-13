/* ============================================================
   Meta Pixel — installed per marketing Work Order (Hammad Imdad).
   Pixel/Dataset ID: 1842915179738448 (existing Meta Business Manager asset).

   Loaded synchronously from <head> on every page, so PageView fires on
   page load (measurable in Meta Pixel Helper). This is the EXACT base
   pixel code from the work order, kept in one file so the ID lives in a
   single place. The matching <noscript> fallback is inlined per page.

   Task 3: also fires a "Lead" event on every WhatsApp click (link, branch
   button, or floating icon), in addition to the link opening normally.
   ============================================================ */

/* --- Meta Pixel base code (verbatim from the work order) --- */
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1842915179738448');
fbq('track', 'PageView');

/* --- Task 3: WhatsApp click -> Lead (fires in addition to opening the link) --- */
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  if (/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(a.href)) {
    if (window.fbq) fbq('track', 'Lead', { content_name: 'WhatsApp Click' });
  }
});
