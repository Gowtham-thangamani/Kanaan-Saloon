/**
 * Adds editorial-tone descriptions below each service row across all branch
 * HTML pages. Idempotent: skips rows that have already been transformed.
 *
 * Approach: regex match each <tr style="border-bottom:1px solid var(--hairline);">
 * service row, count its <td> cells (2/3/4 col tables supported), look up the
 * first cell's text in DESCRIPTIONS, and rewrite as:
 *   <tr>...row with reduced bottom padding...</tr>
 *   <tr style="border-bottom..."><td colspan="N"...>description...</td></tr>
 *
 * Rows whose service name isn't in DESCRIPTIONS are left untouched and
 * reported as "missed" so we can fill the gap and re-run.
 */
const fs = require('fs');
const path = require('path');

const DESCRIPTIONS = {
  // ===== Cuts & Colouring (barber branches) =====
  "Hair Cutting": "A classic gent's cut — measured to your features, scissor or clipper as you prefer, washed and finished by hand.",
  "Hair Colouring (Normal)": "Single-tone hair colour applied with care — even coverage, natural finish, no telltale lines along the temple.",
  "Hair Colouring (Special)": "Premium colour with lifted tone and dimension — for greys softened with intention, or a finish that asks for more than one shade.",
  "Beard Cutting / Shaping": "Beard trimmed and sculpted to your jawline — clean lines along the cheek and neck, hot-towel finish.",
  "Beard Colouring (Normal)": "Single-tone beard tint to cover greys or refresh the colour — natural finish, no harsh lines against the skin.",
  "Beard Colouring (Special)": "Refined beard colour with lifted depth — blended to your natural tone for a softer, more believable result.",

  // ===== Face & Head Care (barber + spa) =====
  "Steam Facial": "Warm steam to open the pores, soften the skin and lift impurities — the foundation step before any deeper facial work.",
  "Facial Wash (Sand Cream)": "Gentle exfoliating cream wash that lifts dead skin and surface grime — leaves the face brighter without drying it out.",
  "Facial Wash with Wax": "Deep cleanse paired with a light wax treatment to draw out impurities — fresh, soft, even-toned finish.",
  "Nose & Ears Wax Cleaning": "Quick, comfortable wax removal of unwanted nose and ear hair — done in minutes with no aftermath.",
  "Facial Cleansing Course": "Full multi-step facial — steam, deep cleanse, extraction, mask and moisturise — for skin that needs a proper reset.",
  "Head Oil Massage": "Warm-oil scalp massage to release tension and condition the hair — fifteen unhurried minutes.",
  "Oil Bath for the Head": "Deep oil saturation across the scalp and hair, worked in by hand and left to settle — for dryness, breakage or simple recovery.",
  "Face Mask": "Targeted mask matched to your skin condition — hydrating, clarifying or calming as needed.",
  "Nose Cleaning Adhesive": "Adhesive strip across the bridge of the nose to lift blackheads in a single, quick step.",
  "Total Deep Cleaning": "Deeper-than-usual facial cleanse — steam, extraction, exfoliation and mask — for skin that needs the works.",
  "Deluxe Facial with Treatment": "Premium facial with targeted skin treatment — addresses your skin's specific condition, layer by layer.",
  "Special Facial with Treatment": "A full editorial-grade facial — extended treatment, premium products, slow and considered start to finish.",
  "Back Facial Treatment": "Full back cleanse and treatment — steam, deep cleanse, mask and moisturise.",
  "Body Facial Treatment": "Whole-body cleanse and treatment — for skin that wants a proper reset, head to toe.",
  "Facial Wash + Steam Facial": "Combined cleanse and steam in one sitting — warmth opens the pores, the wash lifts what surfaces — quick, restorative, complete.",
  "Special Face Mask": "Premium mask matched to your skin's current condition — clarifying, soothing or rebalancing — for results you can feel by the next morning.",

  // ===== Nails, Legs & Keratin (barber) =====
  "Trim Hand Nails": "Careful trim and shape of the hand nails — buffed clean, edges smoothed, cuticles tidied with care.",
  "Trim Foot Nails": "Foot-nail trim and tidy with attention to the corners — neat, hygienic, and properly comfortable.",
  "Leg Cleaning Services": "Full lower-leg cleanse — exfoliation, a soothing wash, and a light massage to finish.",
  "Keratin (Short Hair)": "Smoothing keratin treatment for shorter hair — eases frizz, adds shine, holds for weeks.",
  "Keratin (Long Hair)": "Full keratin treatment for longer hair — smooths the cuticle end-to-end for a sleek, manageable finish.",

  // ===== Manicure & Pedicure (spa) =====
  "Manicure": "Hand and nail care done properly — soak, shape, cuticle work, and a soft, polished finish.",
  "Pedicure": "Foot and nail care from the heel up — soak, smooth, shape, and a comfortable, neat finish.",
  "Foot Spa": "A longer foot ritual — warm soak, scrub, mask and massage — for tired feet that have done their share of walking.",

  // ===== Massage (barber) =====
  "Thai Massage": "Stretching and pressure-point work along the body's energy lines — clears tension you forget you were carrying.",
  "Sports Massage": "Targeted deep work for tight muscles and worked-out limbs — built for recovery, not for floating.",
  "Swedish Massage": "Long, flowing strokes for whole-body relaxation — the classic spa massage, done properly.",
  "Hot Stone Massage": "Heated basalt stones laid along the body and worked into the muscle — deep warmth, real release.",
  "Hot Herbal Massage": "Herbal poultices warmed and pressed into the body — soothes joints, eases the breath, settles the mind.",

  // ===== Massage (spa) =====
  "Relaxing Swedish Massage": "Long, flowing strokes for whole-body relaxation — the classic spa massage, done properly.",
  "Sport Deep Tissue Massage": "Targeted deep-tissue work for tight muscles and overworked limbs — built for recovery, not for floating.",
  "Heated Bamboo with Hot Stone Massage": "Warm bamboo rolled along the muscle, paired with heated stones for deep release — slow, grounding, restorative.",
  "Foot Reflex Massage": "Pressure-point work on the soles — releases tension that travels back through the whole body.",
  "Head & Shoulder Massage": "Focused work along the neck, shoulders and scalp — for desk-bound tension and tight breath.",
  "Face Massage": "Gentle lymphatic and pressure-point work across the face — brightens the skin and softens the day from the eyes down.",

  // ===== Moroccan Bath (barber) =====
  "Moroccan Bath": "Traditional hammam ritual — steam, black-soap cleanse, kessa-glove exfoliation, rinse and finish.",
  "Private Moroccan Bath": "The same full ritual in your own private suite — undisturbed from start to finish.",

  // ===== Moroccan Bath (spa) =====
  "Normal Moroccan Bath": "Traditional hammam ritual — steam, black-soap cleanse, kessa-glove exfoliation, rinse and finish.",
  "Special Moroccan Bath": "Full hammam ritual with mineral mud wrap and extended exfoliation — for a deeper reset.",
  "Royal Moroccan Bath": "Extended ritual with mineral mud wrap, hair mask and full-body moisturise — the slow, unhurried version.",

  // ===== Hair Removal (barber) =====
  "Under Arms": "Smooth underarm finish by cream or wax — both quick, both clean, no irritation left behind.",
  "Upper Back": "Targeted upper-back removal — quick along the shoulder line, careful work around the spine.",
  "Chest": "Full chest hair removal — neat edges, no leftover patches, soft finish.",
  "Full Leg": "Both legs, top to ankle — even coverage, soft finish, no shadow left behind.",
  "Full Back": "Full back hair removal, shoulders to lower back — even work, careful around the spine.",
  "Full Body": "Full-body session — chest, back, arms, legs — completed in a single, well-paced sitting.",

  // ===== Hair Removal (spa) =====
  "Underarm": "Smooth underarm finish by waxing cream or sugar wax — both quick, both clean, no irritation left behind.",
  "Under-Stomach / Bikini": "Bikini-line removal with care for sensitive skin — neat, comfortable, discreet.",
  "Back & Shoulder": "Upper-back and shoulder hair removal — clean lines along the trapezius, careful around the neck.",
  "Chest & Stomach": "Chest and stomach removal in one session — clean edges, even finish, no leftover patches.",
  "Full Legs": "Both legs, top to ankle — even coverage, soft finish, no shadow left behind.",
  "Full Arms": "Both arms, shoulder to wrist — even and smooth, no missed patches at the elbow.",

  // ===== Body Rituals (spa) =====
  "Detoxifying": "Drawing-out body wrap to lift impurities and ease puffiness — leaves the skin lighter and the head quieter.",
  "Brightening": "Body treatment to even out skin tone and lift dull patches — soft glow, no shine.",
  "Hydrating": "Deep-moisture wrap to restore skin that's been worked hard by sun, sand or city air.",
};

const FILES = [
  'baniyas-barber.html',
  'baniyas-spa.html',
  'khalidiya.html',
  'khalifa-city.html',
  'muroor.html',
  'new-shahamah.html',
  'old-shahamah.html',
  'rabdan.html',
  'vip-muroor.html',
];

const BRANCH_DIR = path.join(__dirname, '..', 'branches');

function processFile(filename) {
  const filePath = path.join(BRANCH_DIR, filename);
  let content = fs.readFileSync(filePath, 'utf8');

  const stats = { matched: 0, missed: new Set(), file: filename };

  /* Match a service row: <tr style="border-bottom:..."> ... </tr>.
     Use [\s\S]*? to allow newlines and stay non-greedy so each <tr> is captured discretely. */
  const rowRegex = /<tr style="border-bottom:1px solid var\(--hairline\);">([\s\S]*?)<\/tr>/g;

  content = content.replace(rowRegex, (match, inner) => {
    /* Idempotency guard: rows already converted to description rows use colspan. */
    if (/<td[^>]*\bcolspan=/i.test(inner)) return match;

    /* Extract the service name from the first <td>. Plain-text content only — these
       tables don't put markup inside the name cell. */
    const tdMatch = inner.match(/<td[^>]*>([^<]+)<\/td>/);
    if (!tdMatch) return match;
    const serviceName = tdMatch[1].trim();

    /* Determine column count to pick the right colspan for the description row. */
    const tdCount = (inner.match(/<td\b/g) || []).length;
    if (tdCount < 2) return match; /* Skip degenerate rows */

    const desc = DESCRIPTIONS[serviceName];
    if (!desc) {
      stats.missed.add(serviceName);
      return match;
    }

    stats.matched++;

    /* Reduce bottom padding on the row's cells so the description tucks under. */
    const newInner = inner.replace(/padding:10px 12px;/g, 'padding:10px 12px 4px;');

    return (
      `<tr>${newInner}</tr>` +
      `<tr style="border-bottom:1px solid var(--hairline);">` +
        `<td colspan="${tdCount}" style="padding:0 12px 12px; font-size:12px; color:var(--c-stone); line-height:1.5; font-style:italic;">` +
          desc +
        `</td>` +
      `</tr>`
    );
  });

  fs.writeFileSync(filePath, content, 'utf8');
  return stats;
}

console.log('Adding service descriptions across branch pages...\n');
const results = FILES.map(processFile);
const allMissed = new Set();
let totalMatched = 0;
for (const r of results) {
  console.log(`  ${r.file.padEnd(30)} ${r.matched.toString().padStart(3)} services updated` +
    (r.missed.size ? `   missed: ${[...r.missed].join(' | ')}` : ''));
  totalMatched += r.matched;
  r.missed.forEach(m => allMissed.add(m));
}
console.log(`\nTotal services updated across all branches: ${totalMatched}`);
if (allMissed.size) {
  console.log(`\nUnique services WITHOUT descriptions (${allMissed.size}):`);
  for (const m of [...allMissed].sort()) console.log(`  - ${JSON.stringify(m)}`);
} else {
  console.log('\nEvery service row matched a description. Nothing left over.');
}
