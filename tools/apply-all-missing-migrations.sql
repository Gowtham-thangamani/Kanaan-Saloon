-- ==========================================================
-- Combined Kanaan admin migrations
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT).
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run.
--
-- If the blog-only editor role is in use (see supabase/EDITOR_ACCESS.md),
-- re-run supabase/migrations/20260812000000_editor_role_exclusion.sql
-- AFTER this bundle. This file recreates the content_sections and pages
-- write policies with "to authenticated using (true)" and no editor
-- exclusion, which would otherwise silently restore full access to a
-- tagged editor account.
-- ==========================================================


-- ==========================================================
-- 20260518000000_blog_posts.sql
-- ==========================================================
-- Migration: blog_posts table for admin-managed blog content.
-- Pattern mirrors public.bookings (init_bookings.sql + fix_bookings_rls.sql):
--   * anon SELECT is allowed for published posts only (active = true) so the
--     public website can render them without authentication.
--   * authenticated (admin) gets full read/write — drafts visible to admins only.
--   * Re-runnable: CREATE IF NOT EXISTS + INSERT ON CONFLICT DO NOTHING.
--
-- Apply: Supabase Dashboard → SQL Editor → New query → paste this file → Run.

create table if not exists public.blog_posts (
  id            text primary key,
  slug          text not null unique,
  title         text not null,
  excerpt       text default '',
  category      text default 'Insights',
  read_minutes  integer default 5,
  hero_image    text default '',
  hero_alt      text default '',
  publish_date  date,
  author        text default 'Kanaan Editorial',
  tldr          text default '',
  lede          text default '',
  body_html     text default '',
  active        boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Fast lookup by slug (used by the single-post page) and by (active, date)
-- for the index page sort.
create index if not exists idx_blog_posts_slug         on public.blog_posts (slug);
create index if not exists idx_blog_posts_active_date  on public.blog_posts (active, publish_date desc);

-- Auto-bump updated_at on every UPDATE.
create or replace function public.blog_posts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.blog_posts_set_updated_at();

-- RLS — same pattern as bookings.
alter table public.blog_posts enable row level security;

drop policy if exists "public read published" on public.blog_posts;
drop policy if exists "auth read all"          on public.blog_posts;
drop policy if exists "auth insert"            on public.blog_posts;
drop policy if exists "auth update"            on public.blog_posts;
drop policy if exists "auth delete"            on public.blog_posts;

-- Anyone (including unauthenticated site visitors) can read PUBLISHED posts.
create policy "public read published"
  on public.blog_posts
  for select
  to anon, authenticated
  using (active = true);

-- Signed-in admins can read every row (including drafts).
create policy "auth read all"
  on public.blog_posts
  for select
  to authenticated
  using (true);

-- Signed-in admins can insert/update/delete.
create policy "auth insert"
  on public.blog_posts
  for insert
  to authenticated
  with check (true);

create policy "auth update"
  on public.blog_posts
  for update
  to authenticated
  using (true)
  with check (true);

create policy "auth delete"
  on public.blog_posts
  for delete
  to authenticated
  using (true);

-- Seed with the 7 posts currently in content/blog.json.
-- ON CONFLICT keeps the migration re-runnable without overwriting admin edits.
insert into public.blog_posts
  (id, slug, title, excerpt, category, read_minutes, hero_image, hero_alt, publish_date, author, tldr, lede, body_html, active)
values
  ('how-to-talk-to-your-barber', 'how-to-talk-to-your-barber', 'How to talk to your barber.', 'The 30-second consultation that gets you the haircut you actually wanted.', 'Grooming', 4, '/assets/img/photos/service-hair-brand-wall-1600.webp', 'Master barber chair and product wall at Kanaan', '2026-05-15', 'Master Barber’s Desk', 'Bring a photo. Use clipper numbers (1-8) for the sides — not "short." Say what you don’t want, not just what you want. Mention your hair pattern (cowlicks, double crown). Be specific about how long you want the cut to last.', 'Most miscommunication between a man and his barber happens in the first 60 seconds. The fix isn’t to use barber jargon — it’s to be specific about three things.', '<h2>1. Bring a photo</h2><p>This is the single most useful thing you can do. Even if your hair will never look exactly like the photo (it won’t — different hair, different face, different lighting), the photo tells your barber the <em>shape</em> you’re aiming for. "Short on the sides, longer on top" describes 70% of men’s haircuts.</p><p>If you don’t have a photo, point at the barber’s reference book or open Instagram in the chair. No shame in it.</p><h2>2. Use clipper numbers for the sides</h2><p>Barbers think in clipper guard sizes (1 to 8). "Short" means nothing — to one barber it’s a #2, to another a #4. The difference is significant on the day-of look.</p><ul><li><strong>#1</strong> — very close, almost shaved</li><li><strong>#2</strong> — short fade, visible scalp through hair</li><li><strong>#3</strong> — classic short side, the most common ask</li><li><strong>#4</strong> — short but blended, not stark</li><li><strong>#5+</strong> — longer side, scissor finish often better</li></ul><p>If you don’t know the number, ask the barber what you had last time and adjust from there.</p><h2>3. Say what you don’t want</h2><p>"Don’t fade it all the way down" is more useful than "medium fade." "Leave some weight in the back" is clearer than "not too short."</p><p>The barber’s job is to navigate between your description and what the hair will actually do. Negative descriptions ("not this") are sometimes more informative than positive ones.</p><h2>4. Mention your hair pattern</h2><p>If you have a double crown, a strong cowlick, or a part that won’t behave, tell us upfront. We’ll see it eventually, but knowing in advance changes how we plan the cut — especially the top length.</p><h2>5. Tell us when your next visit is</h2><p>"I’m coming back in 3 weeks" lets us cut for that specific window. "I want this to last 6 weeks" means we leave more length so it grows out cleanly. Without that information, we default to the average — which may be the wrong call for you.</p><h2>The follow-up</h2><p>If something didn’t work, tell us at the next visit — or before, on <a href="https://wa.me/971505556795" class="text-gold">WhatsApp</a>. We’d rather you tell us "it was too short last time" than try to guess what you want.</p><p><a href="/book?service=hair-beard" class="text-gold">Book a haircut</a> at any Kanaan branch.</p>', true),
  ('haircut-frequency', 'haircut-frequency', 'How often should a man get a haircut?', 'Every 3 weeks? Every 6 weeks? Depends on what you want your hair to do.', 'Grooming', 4, '/assets/img/photos/service-hair-barber-stations-1600.webp', 'Inside a Kanaan barber room with master barber stations', '2026-05-08', 'Master Barber’s Desk', 'Skin fade or tight taper: 2-3 weeks. Short crop: 3-4 weeks. Mid-length textured: 5-6 weeks. Growing out / long hair: 6-8 weeks (still needs trims). Beards: every 3-4 weeks. If it’s been over 3 months, book a "shape-up" instead of a full cut.', 'It’s the question every man asks his barber within 90 seconds of sitting down. The answer is less about a calendar and more about what your hair is doing — and what you want it to do next.', '<h2>The honest answer</h2><p>If you keep a short, defined cut — fade, taper, sharp side part, anything where the lines need to read clean — you’ll feel it grow out in week three. Most men in this category settle on a 3-week rhythm. By week four it’s looking shaggy under a cap and your barber spends half the session catching up.</p><p>If your style is a longer crop or textured top, you can stretch to 5-6 weeks before the shape starts to fight you. Past that, the cut isn’t growing out — it’s becoming a different cut.</p><h2>Five honest categories</h2><h3>Buzz, skin fade, or tight taper</h3><p>Every 2-3 weeks. The whole point of these cuts is the contrast at the line. The moment it blurs, the cut looks unintentional.</p><h3>Short crop with definition</h3><p>Every 3-4 weeks. The top holds for longer; the sides give it away first.</p><h3>Mid-length, textured, or messy on purpose</h3><p>Every 5-6 weeks. Forgiving cuts that look better with a little weight on top.</p><h3>Growing out / long hair</h3><p>Every 6-8 weeks. Counterintuitive — you still need a trim. Without one, the ends split and the whole length starts to look thin.</p><h3>The "I’ll just deal with it later" approach</h3><p>Don’t. Three months between visits means your barber is rebuilding the cut from scratch every time, and you never get to enjoy the version that actually works.</p><h2>Beards follow a different rhythm</h2><p>Most beards need a maintenance trim every 3-4 weeks. The shape blurs faster than head hair, especially around the cheek line and neckline. A 15-minute beard sculpt at Kanaan starts at 35 AED.</p><h2>If you’re between visits</h2><p>If you can’t get to Kanaan for a full cut, book a 30-minute shape-up — cleans up the perimeter (neckline, sides, around the ears) without changing the cut. Buys you another two weeks easily.</p><p><a href="/book?service=hair-beard" class="text-gold">Book a haircut</a> or <a href="/branches" class="text-gold">find your nearest Kanaan branch</a>.</p>', true),
  ('choosing-your-massage', 'choosing-your-massage', 'Choosing your massage.', 'Swedish, deep tissue, hot stone, sports recovery. Which one your body actually needs.', 'Spa', 5, '/assets/img/photos/service-massage-tools-1600.webp', 'Massage tools and oils laid out at Kanaan Baniyas Spa', '2026-04-25', 'Kanaan Editorial', 'Swedish = recovery and relaxation. Deep tissue = chronic tension. Hot stone = stress relief in cold/AC environments. Sports = post-workout recovery. Hot herbal = aromatic ritual. All five at 150 AED for 60 minutes at any Kanaan branch with a massage room.', 'Most men book a massage by guessing. The names sound similar enough that picking feels arbitrary. It isn’t. Each style is designed for a different body and a different week.', '<h2>Swedish — the all-rounder</h2><p>Long, flowing strokes at moderate pressure. The default choice for a reason — it covers most of what people want from a massage: tension release, circulation, parasympathetic-nervous-system reset. If you don’t have a specific complaint and just want to unwind, this is the one.</p><p><strong>Choose if:</strong> first-time massage, general stress, want to relax without thinking too hard about it.</p><h2>Deep tissue — for chronic tightness</h2><p>Slower pressure, focused on specific muscle groups (shoulders, lower back, hamstrings). The therapist holds pressure on knots until they release. It can be uncomfortable in the moment; it’s not supposed to hurt, but it’s not Swedish either.</p><p><strong>Choose if:</strong> desk job, recurring back tension, neck stiffness, posture-related issues.<br><strong>Skip if:</strong> you’re in the mood to relax — this requires you to breathe through pressure points.</p><h2>Hot stone — temperature does half the work</h2><p>Heated basalt stones placed along the spine and used as massage tools. Heat penetrates deeper than hands can, which means less pressure for the same release. Excellent in winter and over-AC’d offices.</p><p><strong>Choose if:</strong> you find regular massage too rough, cold-prone, want maximum relaxation.</p><h2>Sports recovery — for the gym crowd</h2><p>Combines compression, stretching, and friction over muscle groups that have been worked. Best done within 48 hours of a hard session.</p><p><strong>Choose if:</strong> you train consistently and want recovery acceleration, not relaxation.</p><h2>Hot herbal — the aromatic version</h2><p>Muslin compresses filled with herbs (lemongrass, ginger, eucalyptus) are steamed and pressed along the body. Therapeutic and aromatic in equal measure.</p><p><strong>Choose if:</strong> you want the experience, the smell, the ritual. Excellent introduction if you’re not sure spa is for you.</p><h2>How long</h2><p>60 minutes is the standard and what most men should book. 90 minutes if you have specific tension that needs working through. 30 minutes if it’s a focused area only — head and shoulders after a long flight, for example.</p><p><a href="/book?service=massage" class="text-gold">Book a massage</a> — all five styles available at Baniyas Spa, Khalifa City, Al Ain, Khalidiya, Old Shahamah, and VIP Muroor. 150 AED for 60 minutes.</p>', true),
  ('choosing-the-right-facial', 'choosing-the-right-facial', 'Choosing the right facial for UAE skin.', 'Choosing between hydra, signature, and anti-fatigue.', 'Skin', 5, '/assets/img/photos/service-facial-candlelit-1600.webp', 'Candlelit facial treatment room at Kanaan', '2026-04-18', 'Kanaan Editorial', 'Hydra-facial = dehydrated, AC-burned skin. Signature = a maintenance treatment that suits most men. Anti-fatigue = under-eye puffiness, late nights, screen exhaustion. Anti-ageing = first lines, lost firmness. Pick by what your skin is doing right now, not your age.', 'Most clients arrive with the same question: "what''s the difference between these facials?" Here''s the honest version, from the perspective of the people who actually do them.', '<h2>Hydra-Facial — for the AC-burned</h2><p>If your skin feels tight by 4pm, looks dull under office light, and shows fine flakes around the nostrils, you''re dehydrated, not aged. The hydra-facial uses a vortex tool to flush impurities and infuse hyaluronic acid serum at the same time. The result is visible immediately. Best every 4–6 weeks.</p><h2>Signature Facial — the maintenance choice</h2><p>Cleanse, exfoliate, mask, massage, finish. Done well, it covers most needs and works on every skin type. If you don''t have a specific concern, this is the one to do. 75 minutes; deserves the time it takes.</p><h2>Anti-Fatigue Facial — for late nights</h2><p>Cold-stone massage around the eyes, caffeine serum, lymphatic drainage along the jaw. Designed to depuff and reduce dark circles in a single sitting. Best before an event or after a heavy travel week.</p><h2>Anti-Ageing Facial — for first lines</h2><p>If you''re noticing fine lines around the eyes or a softer jawline, the anti-ageing protocol uses peptide serum, micro-current, and a firming mask. Not magic, but the difference is real if you keep it monthly.</p><h2>Book the right one</h2><p>If you''re unsure, the signature is the safest pick — your therapist will adjust within the session. <a href="/book?service=facial-skin-care" class="text-gold">Book a facial</a>.</p>', true),
  ('pre-wedding-grooming', 'pre-wedding-grooming', 'A 14-day pre-wedding grooming plan.', 'Two weeks out from the wedding — the grooming schedule that means you look right in every photo.', 'Editorial', 6, '/assets/img/photos/arch-staircase-lemon-1600.webp', 'Editorial interior at Kanaan — marble staircase, lemon-gold light', '2026-04-12', 'Kanaan Editorial', 'Day 14: keratin + first facial. Day 10: haircut (it grows in by the day). Day 7: full grooming reset. Day 3: second facial. Day 2: beard shape + manicure + pedicure. Wedding morning: hot-towel shave only. Book the same barber and therapist across all sessions for consistency.', 'Wedding photos last. The way you look in the close-ups will not be a thing you reshoot. A 14-day plan is the single highest-leverage prep most grooms skip — and the difference is unmistakable in print.', '<h2>Why 14 days, not 14 hours</h2><p>Skin needs time to settle after a facial. Hair needs time to grow into a cut. A keratin treatment looks best a week in. Doing everything in the 48 hours before the wedding gives you the opposite of what you want: red skin, a too-fresh cut, products still being absorbed. The plan below sequences each step at the right interval.</p><h2>Day 14 — the foundation</h2><p>If your hair takes treatment, this is when to do <a href="/services/hair-treatment" class="text-gold">keratin</a>. It softens texture and adds shine — by the wedding day it’s settled and looks natural in photos.</p><p>Book your first <a href="/services/facial-skin-care" class="text-gold">facial</a> the same week. Pick a Hydra-Facial if your skin tends to look dull, Signature if you just want a general reset. The reason for booking now: your skin recovers and you’ll see what your face actually looks like clean for the next planning step.</p><h2>Day 10 — the haircut</h2><p>This is when the cut goes in. By the wedding day it will have grown out by ~2mm, which is exactly where most cuts look best — not still-from-the-chair fresh, not shaggy. Tell your barber it’s for a wedding and ask them to err on the conservative side of length.</p><h2>Day 7 — the full reset</h2><p>One week out, book a complete grooming session: haircut touch-up if needed, beard shape, facial, manicure. The point of this session is to identify anything that needs attention. Dry patches you didn’t notice. A scar healing slowly. The barber and therapist will tell you what to do at home for the next 6 days.</p><h2>Day 3 — second facial</h2><p>A second facial 3 days out gives the skin one more chance to look its best on the day. Skip if your skin is sensitive or has reacted to anything in the previous week.</p><h2>Day 2 — shape-up + nails</h2><p>Beard sculpt, hairline shape-up, full manicure and pedicure. Nails matter in the ring-exchange close-up. Don’t trim too aggressively — leave a sliver of white.</p><h2>Wedding morning — hot-towel shave</h2><p>One service only: a proper hot-towel shave (or a beard final-touch if you wear one). Skin will look its best 60-90 minutes after, and you avoid the unfocused look of doing too much same-day.</p><h2>Tell us in advance</h2><p>Book early — we can dedicate the same barber and therapist across all 14 days so the plan is consistent. WhatsApp us at <a href="https://wa.me/971505556795" class="text-gold">+971 50 555 6795</a> and ask for the pre-wedding programme.</p>', true),
  ('beard-care-abu-dhabi', 'beard-care-abu-dhabi', 'Beard care in Abu Dhabi''s climate.', 'Heat, dust, AC. How to keep your beard healthy through it all.', 'Grooming', 5, '/assets/img/photos/service-hair-brand-wall-1600.webp', 'Beard grooming station with professional product wall at Kanaan', '2026-04-02', 'Kanaan Editorial', 'Wash beard 3x/week with sulfate-free shampoo. Oil daily with argan or jojoba. Trim shape every 3 weeks. Drink water. Avoid alcohol-based products. Book a beard sculpt for the first cut to set a clean line.', 'A beard in Abu Dhabi has a harder job than a beard in Madrid. Our climate cycles through three things at once — outside heat, dehumidified AC indoors, and fine desert dust — all of which strip oils, irritate skin underneath, and leave the beard looking rougher than its owner. Here is what our master barbers actually recommend, simplified.', '<h2>Wash less, condition more</h2><p>Most men in Abu Dhabi wash their beard daily. The combination of dust on the skin and sweat under the hair seems to demand it. But every wash strips the natural oils — and the AC indoors already dries you out. The compromise: wash 2–3 times a week with a sulfate-free shampoo, and condition every time. A 60-second beard mask once a week makes a measurable difference.</p><h2>Oil it, every day</h2><p>Beard oil is not a marketing invention. Skin under a beard dries out faster than skin elsewhere, and the hair itself loses lustre when its cuticle goes rough. A few drops of argan or jojoba oil, worked in with fingertips down to the skin, restores both. Do it once in the morning, ideally after a shower while the pores are still open.</p><h2>Trim the shape, not the length</h2><p>The single biggest mistake men make: trimming all over to keep length down, instead of trimming the shape regularly. Beards in dry climates split at the ends faster. A simple maintenance trim keeps the shape. We do this in 15 minutes — a beard sculpt is 60 AED at most Kanaan branches.</p><h2>Hydrate from inside</h2><p>This sounds obvious until you realise how many men spend an entire workday on coffee. Water matters. The skin under a beard tells on you faster than face skin.</p><h2>Book a beard sculpt at Kanaan</h2><p>If your beard hasn''t had a professional shape in over a month, that''s the first move. We work with the natural growth pattern rather than against it. <a href="/book?service=hair-beard" class="text-gold">Book a beard sculpt</a>.</p>', true),
  ('moroccan-bath-guide', 'moroccan-bath-guide', 'A Moroccan bath, properly explained.', 'What it is, why men love it, and how to get the most from your visit.', 'Spa Craft', 6, '/assets/img/photos/service-moroccan-shower-1600.webp', 'Steam and stone of the Moroccan hammam at Kanaan Baniyas Spa', '2026-03-15', 'Kanaan Editorial', 'A Moroccan bath is a 4-step ritual: 12-15 min steam, black-soap cleanse, kessa-glove exfoliation, and a hydrating mask + argan-oil finish. Best every 4-6 weeks. Available at 6 Kanaan branches for 130-300 AED (Normal / Special / Royal tiers).', 'If you''ve never had a Moroccan bath, the first time can feel unfamiliar. The room is hotter than expected. There is steam. There is black soap. There is a glove that looks more like a kitchen tool than a spa one. And there is a person — usually one you''ve never met — who treats your skin with a gentle but committed firmness. Then you leave, somehow lighter, and you understand why men have been coming back for centuries.', '<p>Here is what''s actually happening, and how to get the most from a visit at Kanaan.</p>
<h2>The four steps</h2>
<h3>1. Steam (12–15 minutes)</h3>
<p>You start in our hammam — a steam room kept around 40°C with high humidity. The job here is simple: open the pores. Your therapist will check on you and bring water; sit, breathe slowly, and let your body soften. By the time the steam ends, your skin will release impurities easily.</p>
<h3>2. Black soap cleanse</h3>
<p>Beldi black soap is a paste made from olive oil and macerated olives. It''s deeply purifying without being harsh. Your therapist applies it to your whole body and lets it sit for 5–10 minutes. It tightens slightly as it works.</p>
<h3>3. Kessa exfoliation</h3>
<p>This is the heart of the ritual. The kessa glove is intentionally rough — it removes the layer of dead skin the steam and soap have loosened. Done properly, it''s brisk but never painful. You will see the result come off your skin. It is honest evidence that the work matters.</p>
<h3>4. Mask, rinse, finish</h3>
<p>A hydrating clay mask (we use ghassoul) is applied to lock moisture back in. Final rinse, towel dry, and a finish with argan oil. Your skin will feel — there''s no other way to say it — new.</p>
<h2>How often is right?</h2>
<p>For most men, every 4–6 weeks is the sweet spot. Your skin''s natural cell turnover is roughly 28 days; doing it more often than that doesn''t add benefit. Doing it less than once a quarter, you start to feel the difference between visits.</p>
<h2>What to bring (and not bring)</h2>
<p>Disposable underwear and a robe are provided. Bring nothing — leave watches, jewellery, phones in the locker. Hydrate well in the hour before your appointment. Don''t shave the same day; the skin will be sensitive after the kessa.</p>
<h2>Where to book</h2>
<p>The Moroccan bath is offered at six Kanaan branches: <a href="/branches/baniyas-spa" class="text-gold">Baniyas Spa</a> and <a href="/branches/khalifa-city" class="text-gold">Khalifa City</a> (our flagship spa houses), plus <a href="/branches/al-ain" class="text-gold">Al Ain</a>, <a href="/branches/khalidiya" class="text-gold">Khalidiya</a>, <a href="/branches/old-shahamah" class="text-gold">Old Shahamah</a>, and <a href="/branches/vip-muroor" class="text-gold">VIP Muroor</a>. Three tiers: Normal 130 AED, Special 180 AED, Royal 300 AED.</p>
<p><a href="/book?service=moroccan-bath" class="btn">Book a Moroccan Bath</a></p>', true)
on conflict (id) do nothing;


-- ==========================================================
-- 20260519000000_blog_rewrite.sql
-- ==========================================================
-- Migration: replace the original 7 seed posts with the 2026 editorial rewrite.
-- Generated from content/blog.json by tools/generate-blog-migration.js.
-- Re-runnable: DELETE is by id; the UPSERT uses on-conflict-do-update so an
-- admin who has since edited a post will get their copy overwritten only by
-- a deliberate re-run. To preserve admin edits, set ON CONFLICT DO NOTHING.

-- 1. Remove the original 7 posts that this rewrite replaces.
delete from public.blog_posts where id in ('how-to-talk-to-your-barber', 'haircut-frequency', 'choosing-your-massage', 'choosing-the-right-facial', 'pre-wedding-grooming', 'beard-care-abu-dhabi', 'moroccan-bath-guide');

-- 2. Upsert the 7 new posts.
insert into public.blog_posts
  (id, slug, title, excerpt, category, read_minutes, hero_image, hero_alt, publish_date, author, tldr, lede, body_html, active)
values
  ('uae-grooming-trends-2026', 'uae-grooming-trends-2026', 'Where men''s grooming is heading in the UAE, 2026.', 'Three shifts changing how the salon industry works in Abu Dhabi — and what they mean for the chair you sit in.', 'Industry', 6, '/assets/img/photos/brand-logo-wall-1600.webp', 'Kanaan brand wall in editorial light', '2026-05-19', 'Kanaan Editorial', 'Three shifts shaping UAE salons right now: (1) men''s grooming spend in the GCC is up roughly 40% over five years — facials, massages and treatments now equal haircuts in revenue; (2) barber-and-spa under one roof has stopped being unusual and become the default; (3) booking has moved from walk-in to WhatsApp first, with same-day still dominant. The market favours premium service at honest price.', 'It is easy to talk about men''s grooming as if nothing has changed since the 1980s — a chair, a clipper, a mirror, a tip. The chair is still there. Almost everything else has moved. Here is the state of the industry as we see it from inside ten branches, on the eve of summer 2026.', '<h2>1. Men no longer come in just for haircuts</h2><p>For most of the last decade, the average man''s salon visit was 25 minutes for a cut. Today the average across our branches is closer to 45 — and roughly half of that time is something other than scissors and clippers. Facials, beard masks, oil head massage, eyebrow shaping, hand grooming. Five years ago we tracked these as add-ons. Today, on most weekends, they are the main reason a man is in the chair.</p><p>The number that surprised us most: facial bookings at Kanaan have grown 4× since 2021. Massage bookings have nearly tripled. Haircut volume is up too, but it is no longer the dominant share.</p><h2>2. Barber and spa are the same building now</h2><p>Twenty years ago a barber was on a side street and a spa was inside a hotel. The two had little to do with each other. The first wave that changed this was Western — "man caves" and lounge-style barbers in London and New York. The second wave is here: the GCC version, where a man can have his beard shaped, a Moroccan bath, a facial, and walk out with a manicure, in one visit, under one roof, in 90 minutes.</p><p>This is the model Kanaan was built on. We didn''t invent it — but we did make a deliberate call early to keep both disciplines under the same brand standard, instead of running the spa as a separate revenue line. Six years on, it''s the format the rest of the market is moving toward.</p><h2>3. WhatsApp has replaced the phone</h2><p>If you had asked us in 2019, the channel mix was roughly 50% walk-in, 35% phone call, 10% Instagram DM, 5% online form. In 2026, more than half of all confirmed appointments at Kanaan come through WhatsApp. The phone still rings — especially for older customers and for VIP Muroor — but the day-to-day is messaging.</p><p>Same-day booking still dominates. About 60% of all bookings happen for the same day or next-day. This has consequences for how a salon operates: holding chairs in reserve for walk-ins is no longer the model, but neither is requiring 7-day advance notice. The new normal is honest visibility into the day, updated in real time.</p><h2>4. Price compression at the top, premium in the middle</h2><p>This one is less obvious. Five years ago, the highest end of the market (luxury hotel spas, signature treatments) was the only place men could get a fully attentive grooming experience. The price floor for a serious facial was upwards of 500 AED.</p><p>Today the highest end has compressed — hotel spas are no longer charging hotel-spa prices, partly because their clientele moved. At the same time, the middle of the market has gone up. A 60-minute facial at Kanaan is 150 AED, with the same products, materials and time as what cost 400 AED in 2019. The middle has eaten the top.</p><h2>5. Where it is going next</h2><p>Three things we expect to see by end of 2027:</p><ul><li><strong>Subscription</strong> — monthly packages that bundle haircut, beard, and one spa service for a fixed fee. Already common in fitness; unfamiliar in grooming. We are piloting one.</li><li><strong>Dedicated practitioner</strong> — the same barber for every visit, with a profile, your hair history, your preferred clipper number. The hairdresser side has done this for years. Men''s side is catching up.</li><li><strong>Longer service times</strong> — the 25-minute cut is dying. 45 minutes is the new baseline, 60 increasingly normal.</li></ul><h2>What stays the same</h2><p>Across all of it: craft. The reason a man comes back is not the WhatsApp chat or the loyalty programme. It is that the cut sits right in week two, that the beard line is clean, that the steam was hot, that the towel was warm, that someone took the time. Five years from now the technology will be different. The standard cannot move.</p><p><a href="/branches" class="text-gold">Find your nearest Kanaan branch</a>, or <a href="/book" class="text-gold">book any service</a>.</p>', true),
  ('the-hot-towel-shave', 'the-hot-towel-shave', 'The hot-towel shave, properly done.', 'A proper shave is six steps and thirty minutes — not seven minutes and a Mach 3.', 'Grooming', 5, '/assets/img/photos/service-massage-tools-1600.webp', 'Straight razor and pre-shave oils laid out at Kanaan', '2026-05-12', 'Master Barber''s Desk', 'A proper hot-towel shave is six steps: pre-shave oil, hot towel, first pass with the grain, hot towel again, second pass against the grain, cold towel and aftershave. Total time ~30 minutes. Closer than anything you can do at home. Best paired with a haircut, before an event, or as a monthly ritual. Available at every Kanaan branch.', 'There is a version of the hot-towel shave that takes seven minutes, leaves you faintly irritated, and could have been done with a Mach 3 in your bathroom. There is also the proper version — six deliberate steps performed by a barber who has done thousands. Most men have never had the second one. Here is what it actually looks like.', '<h2>Step 1 — Pre-shave oil</h2><p>Before any blade touches your face, your barber works a few drops of pre-shave oil into the beard. The point is not aroma. The oil sits between the skin and the foam that follows, so the razor glides on top of the hair instead of dragging through it. Skip this and the second pass against the grain becomes much harsher.</p><h2>Step 2 — Hot towel</h2><p>A folded cotton towel, soaked in water around 50°C, wrapped firmly around your jaw. It stays on for three to four minutes. What it does: opens the pores, lifts the beard, and softens the hair so it cuts at the base instead of breaking. If you have ever wondered why a home shave feels different from a barber shave, this is the largest reason.</p><h2>Step 3 — First pass, with the grain</h2><p>Your barber lathers a thick warm foam — usually with a badger brush, on the face, in circles — and shaves in the direction your hair grows. This pass removes most of the hair. It is the safe pass. A good barber will reapply foam to areas that need a second stroke rather than going back over dry skin.</p><h2>Step 4 — Hot towel, again</h2><p>Another hot towel. The face is now half-shaved. The second towel does two things: removes residual lather, and lifts the remaining shorter hairs for a closer cut on the next pass.</p><h2>Step 5 — Second pass, against the grain</h2><p>This is the pass that separates a real shave from a quick one. The razor moves against the direction of growth — close, careful, in short controlled strokes. Done by someone who has done it thousands of times, it is the closest cut your skin will ever have. Done by someone who hasn''t, it is razor burn. The reason to have this done by a master barber, with a straight razor, is the second pass. The rest you could get anywhere.</p><h2>Step 6 — Cold towel and aftershave</h2><p>A cold towel closes the pores. Aftershave balm (not the alcohol-based stuff) is pressed into the skin, not rubbed. You leave with skin that feels — there is no other word — clean. The smoothness lasts two to three days.</p><h2>Why a straight razor</h2><p>A modern multi-blade cartridge can give a close shave on flat skin. It cannot follow the contour of a jaw the way a straight razor can. The straight razor is also lifted between strokes, so it never drags re-cut hair across the face. The result is a shave that doesn''t irritate.</p><h2>Who should get a hot-towel shave</h2><p>Three groups, in our experience: men who get razor burn every time they shave at home; men preparing for an event (wedding, photoshoot, an interview that matters); and men who treat the monthly hot-towel shave as a quiet hour in an otherwise full month. All three are right reasons.</p><h2>Frequency</h2><p>Monthly works for most. Weekly if you can swing it — the skin tolerates it well as long as the barber knows the second pass technique.</p><h2>The day after</h2><p>Skip exfoliating cleansers for 24 hours. Use a non-alcohol moisturiser. If you have sensitive skin, ask your barber for an unscented aftershave balm instead of the standard one.</p><p><a href="/book?service=hair-beard" class="text-gold">Book a hot-towel shave</a> at any Kanaan branch — 50 AED at most branches, paired free with most haircut packages.</p>', true),
  ('skin-fade-fading', 'skin-fade-fading', 'Is the skin fade fading?', 'After six years of dominance, what men are asking for in the chair is starting to shift.', 'Industry', 4, '/assets/img/photos/service-hair-barber-stations-1600.webp', 'Barber chair stations at Kanaan, mid-cut', '2026-05-02', 'Master Barber''s Desk', 'After roughly six years of dominance, the skin fade is being replaced — slowly — by softer mid-fades, textured crops with weight on top, and the return of the scissor side. If you want a cut that ages well into 2027, ask your barber for a blended fade rather than a razor-fade. Both still available; the request pattern is just shifting.', 'If you walked into any Abu Dhabi barber between 2019 and 2024 and asked for "the usual," the chances are good you walked out with a skin fade. Tight at the temples, sharp at the line, scissor-finish on top. It became the default — for a while, the only thing men under 35 asked for. That is starting to change. From inside the chair, here is what we are seeing.', '<h2>The skin fade dominance, 2019–2024</h2><p>The skin fade — clippered down to the scalp at the bottom, blended up the side — became the most-requested haircut at almost every Kanaan branch from 2019 onward. It photographs well, it reads sharp, it is unambiguous. It also requires maintenance every 2 to 3 weeks, which is good for barbers and good for the people who like to be seen looking precise.</p><h2>What we are seeing now</h2><p>Three shifts in the request pattern over the last 18 months, consistent across our branches:</p><h3>1. Mid-fades over skin fades</h3><p>The fade is still there, but it starts higher and never goes to bare scalp. Around the ear, you can see soft hair texture instead of skin. The look is less stark and ages better between cuts.</p><h3>2. Weight returning to the top</h3><p>For five years the top of most men''s haircuts got shorter. The pendulum is swinging back — textured tops, weight pushed forward, a more lived-in look. It still needs a good cut to read well; messy and "messy on purpose" are not the same thing.</p><h3>3. The scissor side is back</h3><p>For some men, the clippers are coming out of the equation entirely — both sides finished with scissors, layered into the top, no fade at all. It is the most subtle of the new looks. It also takes longer (45–60 minutes) and a barber who can scissor-blend without leaving steps.</p><h2>Why is this happening</h2><p>Three forces, in our reading:</p><p><strong>Age.</strong> The men who got their first skin fade in their twenties are now in their thirties. The look that read sharp at 24 reads slightly aggressive at 33, especially in a meeting. A softer fade is the same haircut family — but more grown-up.</p><p><strong>Return to office.</strong> The high-contrast cut suits the era of small-screen video calls. It is less obviously suited to a real office in 2026, where the dress code has cooled and the haircut tends to follow.</p><p><strong>Trend exhaustion.</strong> No cut stays dominant for ten years. The skin fade had six. It is not going away — it is becoming one option among several, instead of the default.</p><h2>What stays great</h2><p>If your face shape suits a skin fade, it still suits one. The high-and-tight, the slick-back skin fade, the textured fringe with a tight side — these are not going anywhere. The change is in the average request, not the available menu.</p><h2>If you want a cut that ages well into next year</h2><p>Ask your barber for a <strong>blended fade</strong> instead of a <strong>razor-fade</strong>. The difference is small in week one and very obvious in week three: the blended version grows out cleanly, the razor version needs to be re-done.</p><p>If you are tempted by the scissor side, allow more chair time. The first appointment with a new shape takes about 50% longer than the maintenance ones. After the first cut, your barber can do it inside the normal window.</p><h2>What we tell first-time clients</h2><p>Bring a photo. We will tell you honestly which version of the fade your hair will actually do. If you walk in asking for a #0 skin fade and your hair pattern doesn''t suit it, we''d rather tell you on the way in than show you on the way out.</p><p><a href="/book?service=hair-beard" class="text-gold">Book a haircut</a> at the Kanaan branch nearest you, or <a href="/branches" class="text-gold">find your branch</a>.</p>', true),
  ('ramadan-grooming-schedule', 'ramadan-grooming-schedule', 'A grooming schedule for Ramadan.', 'When to book, what changes for your skin and beard, and how to plan Eid grooming without leaving it to Chand Raat.', 'Editorial', 5, '/assets/img/photos/hero-exterior-night-1600.webp', 'Kanaan storefront in evening light', '2026-04-30', 'Kanaan Editorial', 'During Ramadan, the salon industry shifts to evenings. Book post-Maghrib for less rushed haircuts — the 14:00–17:00 slots are also surprisingly quiet. Maintain the beard every two weeks (reduced water intake shows). Eid grooming should be booked 5+ days before Eid, not Chand Raat — all Kanaan branches stay open through Eid, but the best slots fill ten days out.', 'Ramadan rearranges the rhythm of the city. Office hours shrink. Restaurants come alive at sundown. And the salon — which spent eleven months operating on the daytime clock — pivots to the evening. If you want to keep your grooming routine through the month without spending hours in queues, the timing matters as much as the service.', '<h2>How Ramadan changes the salon day</h2><p>Across our branches, Ramadan hours shift to roughly 14:00 to 02:00. The first hour after Iftar is the busiest — men who have just broken fast, eaten quickly, and want to be out before Isha. The 14:00 to 17:00 slots are the quietest. Friday evenings, weekends, and the last ten days of the month fill up the fastest.</p><h2>The best time to book</h2><p>If you can plan ahead, the calmest service is in the afternoon (14:00 to 17:00) or post-Isha (after about 21:30). The hour after Iftar is the rush hour — everything runs, but the chair time is shorter and the waiting room is full. For a full grooming session — haircut plus beard plus facial — book late evening or the afternoon, never right after Maghrib.</p><h2>Your beard during fasting</h2><p>Reduced water intake during fasting shows in the skin under a beard before it shows anywhere else. The skin dries out, dandruff appears, and the beard itself loses lustre by week two of the month. Three things that help:</p><ul><li><strong>Oil daily, not weekly.</strong> A few drops of argan or jojoba into the beard each morning, worked down to the skin.</li><li><strong>Wash less.</strong> Once or twice a week with a sulfate-free shampoo. Too much washing during a low-hydration month strips the natural oils faster than your body can replace them.</li><li><strong>Maintenance trim every two weeks.</strong> The beard shape blurs faster in dry conditions. A 15-minute sculpt at Kanaan is enough to keep the line clean.</li></ul><h2>Your hair</h2><p>Lighter styling. Heavy waxes and pomades sit heavier on hair that isn''t washed as often. Switch to a light cream or oil-based finish for the month. If your hair runs flat by mid-day, a small spritz of leave-in conditioner usually does more than restyling.</p><h2>The skin question</h2><p>Many men book a facial in the second week of Ramadan to address the dryness and dullness that show up by then. The Hydra-Facial in particular suits this — its job is rehydration, not exfoliation. Booking late evening (after 22:00) is a nice ritual; many of our regulars find it the calmest time of their day.</p><h2>The Eid timeline</h2><p>The single biggest mistake men make is booking on Chand Raat. By the time the moon is sighted, the schedule is full at every branch — and the waiting time during the last 24 hours can be hours rather than minutes. The right window:</p><ul><li><strong>10–14 days before Eid:</strong> the keratin or hair treatment, if you do one. It looks best at week 1.5.</li><li><strong>5–7 days before Eid:</strong> the full grooming session — cut, beard sculpt, facial, manicure.</li><li><strong>2–3 days before Eid:</strong> a touch-up shape, if needed. Hairline cleanup, beard line cleanup, no full cut.</li><li><strong>Day before Eid:</strong> a hot-towel shave only, if at all. Save heavy services for at least 48 hours before.</li></ul><h2>Eid day and beyond</h2><p>All Kanaan branches stay open through Eid, with shorter Eid-morning hours. Most close at 23:00 as usual; some stay later on Eid evenings. If you are travelling for Eid, book the full session before you leave — flights and hotel mirrors are not kind to a six-day stubble.</p><p>To reserve a preferred Ramadan slot — particularly the late-evening ones, which book out fastest — message us on WhatsApp at <a href="https://wa.me/971505556795" class="text-gold">+971 50 555 6795</a>. We hold preferred slots for regulars during the month.</p>', true),
  ('hair-colour-for-men', 'hair-colour-for-men', 'Hair colour for men, done conservatively.', 'Henna, grey blend, or full coverage — which one suits the look you actually want.', 'Hair', 5, '/assets/img/photos/service-hair-brand-wall-1600.webp', 'Professional hair colour products at Kanaan', '2026-04-20', 'Kanaan Editorial', 'Three tiers of hair colour for men: henna (natural, warm tone, lasts 4–6 weeks, traditional), demi-permanent grey blend (subtle, washes out in 6–8 weeks, no commitment), and permanent colour (full coverage, root touch every 4 weeks). For first-time: start with grey blend. For traditional preference: henna. Both available at most Kanaan branches. The most common mistake is overdoing it — natural beats noticeable.', 'Most men who try hair colour do not get it wrong on the colour — they get it wrong on the saturation. The look is too uniform. There are no greys at the temples; the beard is the same shade as the hair at 25; the whole thing reads younger than the person wearing it. The fix is to think of colour as adjustment, not transformation.', '<h2>The three options</h2><p>At Kanaan we offer three approaches to colour for men. They are not interchangeable. Each one has a different purpose, a different commitment level, and a different look on the day.</p><h2>1. Henna — the traditional choice</h2><p>Henna is a natural plant dye that produces a warm reddish-brown to dark-brown finish. It deposits colour rather than penetrating the hair shaft, which means it is gentler than chemical dyes but also less precisely controllable. The colour develops over 24–48 hours and reaches its true shade by day two. It lasts 4–6 weeks, fading gradually rather than washing out abruptly.</p><p><strong>Choose if:</strong> you prefer natural products, want a warm tone (not stark black), like a richer beard colour, or have a cultural preference for henna. Excellent for grey blending — natural-looking and forgiving.</p><p>Henna also works on beards, where the warm tone tends to read more flattering than a hard chemical black.</p><h2>2. Demi-permanent grey blend</h2><p>A semi-permanent dye that blends grey into your existing colour rather than covering it. The result is a subtle reduction in visible greys — temples and beard look softer, not redder or darker. The colour washes out gradually over 6–8 weeks, leaving no harsh line at the roots when it goes.</p><p><strong>Choose if:</strong> you are trying colour for the first time, you don''t want anyone to notice you''ve done anything, you don''t want to commit to a monthly maintenance schedule, or you only want to blend rather than cover.</p><p>This is the option we recommend most often. The men who book this leave the salon looking exactly like themselves, just slightly less tired.</p><h2>3. Permanent colour</h2><p>Full coverage, full commitment. The dye penetrates the hair shaft and stays until it grows out. Root touch-ups are needed every 4 weeks if you have visible grey roots; less often if you started without much grey.</p><p><strong>Choose if:</strong> you want full grey coverage, your career or personal preference is for a younger look, or you have already been doing colour and prefer the consistency. Less appropriate as a starting point — easier to go up the commitment ladder than down it.</p><h2>The most common mistake</h2><p>Going one or two shades darker than your natural colour. The line at the temples gives it away in any natural light. Beard going darker than the hair is even more revealing. Our rule: match the natural mid-tone of your hair from when you were 25–30. Anything darker than that reads obvious.</p><h2>What to expect on the day</h2><p>A consultation first — your colourist will look at your natural base, your skin tone, and the grey distribution before recommending a shade. The application itself takes 30–45 minutes; the development time another 30–45 minutes. Total chair time: 90 minutes for first-time, less for maintenance.</p><p>Bring a photo of yourself from 5–10 years ago if you want a reference for your natural colour. It is genuinely useful — beats describing colour in words.</p><h2>Maintenance</h2><ul><li><strong>Henna:</strong> every 4–6 weeks. The fade is graceful, so the timing is flexible.</li><li><strong>Grey blend:</strong> every 6–8 weeks. Slip a week and no one notices.</li><li><strong>Permanent colour:</strong> every 4 weeks for visible roots. Less if you started with limited grey.</li></ul><h2>Beard colour</h2><p>If you colour your hair, the beard usually needs adjustment too — or you end up with one looking obviously younger than the other. Beard colour development is shorter (about 15–20 minutes) and the result tends to last 2–3 weeks. Most regulars do beard colour every other haircut.</p><p><a href="/book?service=hair-treatment" class="text-gold">Book a colour consultation</a> at your nearest Kanaan branch — consultations are free and there is no commitment to colour on the day.</p>', true),
  ('vip-muroor-explained', 'vip-muroor-explained', 'Inside VIP Muroor.', 'One suite, one client at a time, one master practitioner. What that actually means for the visit.', 'Editorial', 5, '/assets/img/photos/vip-muroor-suite-1600.webp', 'Inside the VIP Muroor private suite at Kanaan', '2026-04-08', 'Kanaan Editorial', 'VIP Muroor is one private suite — one client at a time, one master barber and one therapist on call. No waiting room, no chair next to another chair. Higher prices reflect dedicated time and exclusivity. Best for pre-wedding grooming, executives who can''t sit in a public salon, anniversaries, and regulars who treat grooming as a quiet hour. Open by appointment from 11:00 daily.', 'Most of Kanaan is built around the friendly chaos of a working barbershop — multiple chairs, conversation, the sound of clippers and steam. VIP Muroor is the opposite. Behind a single door on Muroor Road is one private suite, one master practitioner per session, and no one else. This is what the visit actually looks like, and who it is for.', '<h2>What VIP Muroor is</h2><p>A single-suite private grooming room. One client at a time. The suite includes a barber station, a facial treatment bed, a private bathroom, and a small lounge area. Your visit is staffed by one master barber and, if your booking includes spa services, one senior therapist. They are dedicated to you for the duration. No other clients in the space.</p><h2>Who books it</h2><p>Four kinds of men, in our experience.</p><p><strong>The pre-wedding groom.</strong> The single most common reason for first-time VIP Muroor bookings. The dedicated time matters: the consultation isn''t rushed, the cut is set in the right week of the pre-wedding plan, and the same barber sees you across all the pre-wedding appointments. Photos hold up because of this.</p><p><strong>The executive who can''t sit in a public salon.</strong> For senior figures in Abu Dhabi government and private sector, sitting in a row of chairs is not always practical. VIP Muroor solves this without anyone needing to discuss why.</p><p><strong>The anniversary or special occasion.</strong> A full 90-minute VIP hour as a gift to a partner — or as a quiet hour the day before an event. The gift voucher version of this is one of our most-requested.</p><p><strong>The regular.</strong> A smaller but steady share: men for whom 90 minutes of complete privacy is itself the service. They come monthly. They are usually our oldest clients.</p><h2>The 90-minute VIP Hour</h2><p>The flagship session. It combines: a full haircut, a hot-towel shave or beard sculpt, a facial appropriate to your skin (signature, hydra, or anti-fatigue), a 30-minute oil head massage or short Swedish massage, and a hand and foot grooming finish. Each step performed by the discipline''s specialist, with transitions that don''t involve waiting.</p><p>The detail that matters most to first-time bookers: the schedule is flexible inside the suite. If the cut runs five minutes long, the facial starts five minutes later. There is no next-client clock pressuring the work.</p><h2>Pricing</h2><p>VIP Muroor pricing reflects the dedicated time and the seniority of the practitioners. The VIP Hour is 800 AED. Individual services within the suite carry a roughly 40% premium over the same service at a standard branch — for the privacy and the dedicated time, not for different products.</p><p>If you have a one-off occasion (a wedding, an interview, an anniversary), the premium is straightforwardly worth it. If you are considering it as a regular monthly visit, the maths usually works out to roughly the same as the same services across two visits to a standard branch — but in one session, in one place, with one team.</p><h2>Booking</h2><p>VIP Muroor opens at 11:00 daily — later than our standard branches because the day starts with one-on-one prep. The last appointment is at 21:30. Friday hours start at 14:00.</p><p>Book at least 5–7 days in advance for VIP Hour slots. Same-day is sometimes possible for shorter services, but the full VIP Hour books out the fastest. The team will confirm by WhatsApp within an hour and send a calendar invite.</p><h2>Gift vouchers</h2><p>VIP Hour gift vouchers are by far the most-purchased Kanaan gift. They are issued as a physical card or a digital code, valid for 12 months, and transferable. <a href="/gift-voucher" class="text-gold">See gift voucher options</a>.</p><h2>The honest version</h2><p>VIP Muroor is not for every visit. For a quick beard trim or a between-cuts shape-up, our standard branches are better — faster, less formal, more central. For the occasions that matter, or for the hour you set aside for yourself, this is what we built it for.</p><p>To book, WhatsApp <a href="https://wa.me/971505556795" class="text-gold">+971 50 555 6795</a> and ask for VIP Muroor, or use the <a href="/book" class="text-gold">online booking form</a> and pick "VIP Muroor" as the branch.</p>', true),
  ('barbering-since-2020', 'barbering-since-2020', 'What''s changed in barbering since 2020.', 'Six years of quiet change in men''s grooming, told from the chair.', 'Industry', 5, '/assets/img/photos/arch-marble-staircase-1600.webp', 'Editorial interior at Kanaan — marble staircase', '2026-03-22', 'Master Barber''s Desk', 'Six years of change in men''s grooming: (1) men got comfortable with skincare; (2) appointment booking replaced walk-ins; (3) chair time stretched from 25 minutes to 45 minutes; (4) facial steam, beard masks, and oil head massage became normal add-ons; (5) the line between barber and spa keeps blurring. Most of this favours the customer.', 'In barbering we tend not to notice change while it is happening. The chair is the same. The clippers are the same. The conversation is the same. And yet a quiet revolution has run through men''s grooming since 2020 — the kind you only notice when you compare an average visit today with an average visit six years ago. Here is what is genuinely different.', '<h2>1. Men got comfortable with skincare</h2><p>The single biggest shift. In 2020, asking a man what moisturiser he used was a conversation. In 2026, half our facial bookings start with the client knowing what their skin type is. This is partly Instagram, partly K-beauty''s slow influence on the GCC, partly the realisation that AC and sun aren''t kind to anyone''s face. It is also good news. Men who care about their skin sleep better.</p><h2>2. Appointment booking replaced walk-ins</h2><p>In 2020, roughly 60% of all chairs across the chain were walk-ins. Today it is closer to 25%, and most of those are last-hour-of-the-day cuts. The rest is booked — by WhatsApp first, then phone, then the online form. The pattern is good for service quality (the chair is ready when you arrive) and for staffing (no idle hours followed by chaos). It is less forgiving on the days you forget to book.</p><h2>3. The chair time stretched</h2><p>The average length of a Kanaan visit was 28 minutes in 2020. It is 47 minutes today. Some of this is service mix — more facials, more beard work, more grooming combinations. Some is the slow death of the express cut. Men want the visit to feel like time spent, not transaction completed.</p><h2>4. Add-ons stopped being add-ons</h2><p>Five services that were considered "upsells" in 2020 and are now baseline parts of the visit:</p><ul><li>Hot-towel shave at the end of a beard service</li><li>Facial steam as part of a haircut over 40 minutes</li><li>Beard mask once a month</li><li>Oil head massage at the end of any service</li><li>Hand and nail finish for grooming packages</li></ul><p>These are no longer treated as add-ons. They are folded into the right package as standard.</p><h2>5. Barber and spa keep merging</h2><p>The cleanest division in 2020 was: barber for hair, spa for everything else. By 2026, that line is almost gone. Men book a haircut and a Moroccan bath in the same visit. The same therapist might do a facial in one room and a beard sculpt in the next. The Kanaan format — six branches with both disciplines, four with combined packages — is one version of where the industry is heading.</p><h2>6. The chair conversation changed</h2><p>Less small talk about football. More questions about hair pattern, product, skin type, sleep, what they ate the day before. Barbers and therapists are being asked for advice that used to belong to a doctor. We are not doctors. But we do have a lot of information about how a man''s face, hair, and skin change over decades — and the conversation has caught up to that.</p><h2>7. The premium price has stabilised</h2><p>Hotel-spa prices have stopped climbing. Mid-market salon prices have edged up slightly. The gap between the two has closed by roughly half over six years. The result: a serious facial, by a senior therapist, with high-quality products, is now available at 150 AED at Kanaan. Five years ago, the equivalent quality was 400 AED elsewhere.</p><h2>8. Bilingual service is the norm</h2><p>In 2020, bilingual (English/Arabic) staff was a selling point. In 2026, it is expected. Most of our master barbers also speak Urdu or Hindi, which matters for a city where the client base genuinely is global. The chair conversation works in three or four languages depending on who is in it.</p><h2>What hasn''t changed</h2><p>Craft. The reason a regular keeps coming back is the same as it was in 2020 and 2010 and 1990: the cut sits right; the beard line is clean; the steam is hot; the towel is warm; someone took the time. The tools and the packaging move. The standard does not.</p><p>If it has been a while since your last visit and you are curious what these changes feel like in practice — <a href="/book" class="text-gold">book a session</a> at the Kanaan branch nearest you.</p>', true)
on conflict (id) do update set
  slug         = excluded.slug,
  title        = excluded.title,
  excerpt      = excluded.excerpt,
  category     = excluded.category,
  read_minutes = excluded.read_minutes,
  hero_image   = excluded.hero_image,
  hero_alt     = excluded.hero_alt,
  publish_date = excluded.publish_date,
  author       = excluded.author,
  tldr         = excluded.tldr,
  lede         = excluded.lede,
  body_html    = excluded.body_html,
  active       = excluded.active;


-- ==========================================================
-- 20260519100000_blog_images_bucket.sql
-- ==========================================================
-- Migration: storage bucket for blog images uploaded from admin/blog.
-- Pattern mirrors blog_posts: public read so site visitors can fetch images,
-- authenticated INSERT/UPDATE/DELETE so only signed-in admins can upload.
--
-- Apply: Supabase Dashboard → SQL Editor → New query → paste this file → Run.

-- 1. Create the bucket. Public so the URLs are accessible without auth.
--    file_size_limit is 5 MB; allowed_mime_types restricts to image types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. RLS on storage.objects — Supabase enables RLS on this table by default.
--    Drop-and-create so the migration is re-runnable.

drop policy if exists "blog-images public read"   on storage.objects;
drop policy if exists "blog-images admin insert"  on storage.objects;
drop policy if exists "blog-images admin update"  on storage.objects;
drop policy if exists "blog-images admin delete"  on storage.objects;

-- Anyone (including site visitors) can GET objects in this bucket.
create policy "blog-images public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

-- Signed-in admin can upload/replace/remove.
create policy "blog-images admin insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'blog-images');

create policy "blog-images admin update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'blog-images')
  with check (bucket_id = 'blog-images');

create policy "blog-images admin delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'blog-images');


-- ==========================================================
-- 20260519200000_content_sections.sql
-- ==========================================================
-- Migration: generic content store for admin-editable site sections.
--
-- One row per "section" (e.g. 'offers', 'testimonials', 'site', 'banners'),
-- with the JSON payload in a single jsonb column. Reads are public; writes
-- require authenticated admin (same pattern as bookings + blog_posts).
--
-- Apply: Supabase Dashboard → SQL Editor → New query → paste this → Run.

create table if not exists public.content_sections (
  key        text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.content_sections_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_content_sections_updated_at on public.content_sections;
create trigger trg_content_sections_updated_at
  before update on public.content_sections
  for each row execute function public.content_sections_set_updated_at();

alter table public.content_sections enable row level security;

drop policy if exists "content public read"   on public.content_sections;
drop policy if exists "content auth insert"   on public.content_sections;
drop policy if exists "content auth update"   on public.content_sections;
drop policy if exists "content auth delete"   on public.content_sections;

-- Anyone (including site visitors) can read any section.
create policy "content public read"
  on public.content_sections
  for select
  to anon, authenticated
  using (true);

-- Signed-in admins can insert/update/delete.
create policy "content auth insert"
  on public.content_sections
  for insert
  to authenticated
  with check (true);

create policy "content auth update"
  on public.content_sections
  for update
  to authenticated
  using (true)
  with check (true);

create policy "content auth delete"
  on public.content_sections
  for delete
  to authenticated
  using (true);


-- ==========================================================
-- 20260519300000_pages.sql
-- ==========================================================
-- Migration: per-page editable body content, keyed by URL path.
--
-- A row exists only for a page that the admin has overridden — for every other
-- page, the live site keeps rendering the hard-coded HTML. The runtime checks
-- this table on page load and, if a row matches the current path, swaps the
-- [data-page-body] region's contents with the DB body_html.
--
-- Apply: Supabase Dashboard -> SQL Editor -> New query -> paste this -> Run.

create table if not exists public.pages (
  path             text primary key,
  title            text default '',
  meta_description text default '',
  body_html        text default '',
  updated_at       timestamptz not null default now()
);

create or replace function public.pages_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pages_updated_at on public.pages;
create trigger trg_pages_updated_at
  before update on public.pages
  for each row execute function public.pages_set_updated_at();

alter table public.pages enable row level security;

drop policy if exists "pages public read"  on public.pages;
drop policy if exists "pages auth insert"  on public.pages;
drop policy if exists "pages auth update"  on public.pages;
drop policy if exists "pages auth delete"  on public.pages;

create policy "pages public read"
  on public.pages for select
  to anon, authenticated
  using (true);

create policy "pages auth insert"
  on public.pages for insert
  to authenticated
  with check (true);

create policy "pages auth update"
  on public.pages for update
  to authenticated
  using (true)
  with check (true);

create policy "pages auth delete"
  on public.pages for delete
  to authenticated
  using (true);

