#!/usr/bin/env node
// Bulk-create Psy Tattoos WhatsApp marketing templates in Meta Business Manager.
// Usage: node --env-file=.env scripts/create-whatsapp-templates.mjs
// Requires: WHATSAPP_ACCESS_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID. Optional: WHATSAPP_GRAPH_API_VERSION (default v19.0).

const TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
const WABA_ID = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "").trim();
const VERSION = (process.env.WHATSAPP_GRAPH_API_VERSION || "v19.0").trim();

if (!TOKEN || !WABA_ID) {
  console.error("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID.");
  console.error("Run with: node --env-file=.env scripts/create-whatsapp-templates.mjs");
  process.exit(1);
}

const BOOKING_URL = "https://psyonline.in/studio";
const EXAMPLE_NAME = "Priya";

const templates = [
  {
    name: "psy_post_enquiry_followup",
    category: "MARKETING",
    language: "en",
    body: "Hey {{1}}! You'd reached out about getting a tattoo — just checking if you're still keen or if any questions came up. Slots are open — happy to help you plan it out 🖤",
    buttonText: "Book Now",
    url: BOOKING_URL,
  },
  {
    name: "psy_incomplete_booking",
    category: "MARKETING",
    language: "en",
    body: "Hey {{1}}! Your booking didn't go through last time — still interested? We have slots open. Tap below and we'll sort it 🖤",
    buttonText: "Complete Booking",
    url: BOOKING_URL,
  },
  {
    name: "psy_referral_ask",
    category: "MARKETING",
    language: "en",
    body: "Hey {{1}}! If any of your friends have been thinking about getting inked, send them our way 🙏 Word of mouth from people we've worked with means more than any ad 🖤",
    buttonText: "Visit Studio",
    url: BOOKING_URL,
  },
  {
    name: "psy_seasonal_occasion",
    category: "MARKETING",
    language: "en",
    body: "Hey {{1}}! Festive season is the perfect time to mark something permanent 🖤 Slots fill up fast — tap below to book.",
    buttonText: "Book Now",
    url: BOOKING_URL,
  },
  {
    name: "psy_slot_scarcity",
    category: "MARKETING",
    language: "en",
    body: "Hey {{1}}! Our artists' slots are filling up fast this month — wanted to give you first pick before we open it up. Tap below to grab one 🖤",
    buttonText: "Book Now",
    url: BOOKING_URL,
  },
  {
    name: "psy_lapsed_winback",
    category: "MARKETING",
    language: "en",
    body: "Hey {{1}}! Long time 👋 Lots of new work coming out of the studio — if you've been sitting on an idea, we'd love to bring it to life when you're ready 🖤",
    buttonText: "Visit Studio",
    url: BOOKING_URL,
  },
];

const endpoint = `https://graph.facebook.com/${VERSION}/${WABA_ID}/message_templates`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createOne(tpl) {
  const payload = {
    name: tpl.name,
    category: tpl.category,
    language: tpl.language,
    components: [
      {
        type: "BODY",
        text: tpl.body,
        example: { body_text: [[EXAMPLE_NAME]] },
      },
      {
        type: "BUTTONS",
        buttons: [{ type: "URL", text: tpl.buttonText, url: tpl.url }],
      },
    ],
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

let failures = 0;
let created = 0;
let skipped = 0;

for (const tpl of templates) {
  try {
    const { ok, data } = await createOne(tpl);
    if (ok) {
      console.log(`✓ ${tpl.name} (id=${data.id ?? "?"}, status=${data.status ?? "PENDING"})`);
      created++;
    } else {
      const err = data?.error;
      const msg = err?.message || JSON.stringify(data);
      const code = err?.code;
      // Code 100 + "already exists" = idempotent skip.
      if (code === 100 && /already exists/i.test(msg)) {
        console.log(`✓ ${tpl.name} (already exists — skipped)`);
        skipped++;
      } else {
        console.error(`✗ ${tpl.name} — ${msg}`);
        failures++;
      }
    }
  } catch (e) {
    console.error(`✗ ${tpl.name} — ${e instanceof Error ? e.message : String(e)}`);
    failures++;
  }
  await sleep(500);
}

console.log(`\nDone. created=${created} skipped=${skipped} failed=${failures}`);
process.exit(failures > 0 ? 1 : 0);
