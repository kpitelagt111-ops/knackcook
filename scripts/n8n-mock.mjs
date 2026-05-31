/**
 * n8n ingestion API — end-to-end test + realistic mock seeder.
 *
 * Simulates exactly what the n8n workflow sends to the site:
 *   POST /api/ingest/products   (Bearer)
 *   POST /api/ingest/articles   (Bearer)
 *   POST /api/ingest/reindex    (Bearer)
 *
 * Phase A: negative tests (auth, validation, compliance guardrails).
 * Phase B: seed 10 fictional-but-realistic products + 10 blog articles.
 * Phase C: trigger Meilisearch reindex.
 *
 * Content is 100% fictional editorial (compliant): no Amazon price,
 * no Amazon review/stars, no Amazon image — only our own verdict /10,
 * pros/cons and rewritten prose.
 *
 * Usage:
 *   node scripts/n8n-mock.mjs
 * Env:
 *   BASE_URL        (default http://localhost:3000)
 *   INGEST_API_KEY  (default change-me-strong-random-secret)
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const KEY = process.env.INGEST_API_KEY ?? "change-me-strong-random-secret";

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function post(path, body, { auth = true, raw } = {}) {
  const headers = { "content-type": "application/json" };
  if (auth) headers.authorization = `Bearer ${KEY}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: raw ?? JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json };
}

// ---------------------------------------------------------------------------
// Mock dataset — 5 categories, 10 products, 10 articles, 1 author.
// ---------------------------------------------------------------------------

const AUTHOR = "marlowe-finch";

const PRODUCTS = [
  {
    asin: "MOCKMIX001",
    brand: "KitchenForge",
    category: "Stand Mixers",
    editorialDraft: {
      title: "KitchenForge Artisan 5.5Qt Stand Mixer",
      editorialReview:
        "After three weeks of near-daily doughs, the KitchenForge Artisan earned a permanent spot on our counter. The planetary action folds a stiff bread dough without the motor bogging down, and the tilt-head locks with a reassuring click. It is heavier than it looks, which is exactly what you want when whipping a double batch of meringue.",
      prosCons: {
        pros: [
          "Quiet, torque-rich motor",
          "Bowl-lift feels rock solid",
          "Wide accessory ecosystem",
        ],
        cons: ["Heavy to move", "Splash guard is fiddly"],
      },
      editorialRating: 9.1,
    },
  },
  {
    asin: "MOCKMIX002",
    brand: "ArtisanCraft",
    category: "Stand Mixers",
    editorialDraft: {
      title: "ArtisanCraft CompactPro Hand Mixer",
      editorialReview:
        "For small kitchens, the ArtisanCraft CompactPro hits a sweet spot. Nine speeds give you genuine low-end control for folding, and the beaters snap out with one thumb. It will not replace a full stand mixer for bread, but for whipped cream and cake batter it is faster to grab and faster to clean.",
      prosCons: {
        pros: ["Featherweight", "True low speed for folding", "Easy one-hand eject"],
        cons: ["Underpowered for stiff dough"],
      },
      editorialRating: 8.0,
    },
  },
  {
    asin: "MOCKKNF003",
    brand: "EdgeWright",
    category: "Knives",
    editorialDraft: {
      title: "EdgeWright Damascus 8-inch Chef Knife",
      editorialReview:
        "The EdgeWright Damascus arrived screaming sharp and held that edge through a month of onions, squash and the occasional careless cut on a glass board. The 67-layer blade is mostly cosmetic, but the full tang and the slightly rounded spine make long prep sessions painless.",
      prosCons: {
        pros: ["Out-of-box sharpness", "Comfortable spine", "Excellent balance"],
        cons: ["Premium price", "Hand-wash only"],
      },
      editorialRating: 9.4,
    },
  },
  {
    asin: "MOCKKNF004",
    brand: "DailyForge",
    category: "Knives",
    editorialDraft: {
      title: "DailyForge Everyday Santoku 7-inch",
      editorialReview:
        "Not every kitchen needs a boutique blade, and the DailyForge Santoku proves it. The granton edge keeps potato slices from sticking, and the stamped steel takes a keen edge on a basic whetstone. It is the knife we hand to nervous guests.",
      prosCons: {
        pros: ["Affordable", "Non-stick granton edge", "Lightweight"],
        cons: ["Needs frequent honing"],
      },
      editorialRating: 7.6,
    },
  },
  {
    asin: "MOCKCKW005",
    brand: "IronHarth",
    category: "Cookware",
    editorialDraft: {
      title: "IronHarth Pre-Seasoned 12-inch Cast Iron Skillet",
      editorialReview:
        "The IronHarth skillet seared a ribeye to a perfect crust and then slid into the oven for the finish without a second thought. Out of the box the seasoning was uneven, but two rounds of bacon fixed that. This is a buy-it-for-life pan at a forgiving price.",
      prosCons: {
        pros: ["Superb heat retention", "Oven-safe to 500F", "Improves with use"],
        cons: ["Requires seasoning care", "Heavy"],
      },
      editorialRating: 8.8,
    },
  },
  {
    asin: "MOCKCKW006",
    brand: "AeroClad",
    category: "Cookware",
    editorialDraft: {
      title: "AeroClad TriPly 10-inch Nonstick Frying Pan",
      editorialReview:
        "The AeroClad TriPly heats fast and evenly, and the reinforced nonstick coating released eggs cleanly even after a month of testing. The stay-cool handle is genuinely cool, and the flared rim pours without dribbling. We would skip metal utensils to protect the surface.",
      prosCons: {
        pros: ["Even heating", "Truly nonstick", "Comfortable handle"],
        cons: ["Avoid metal utensils"],
      },
      editorialRating: 8.3,
    },
  },
  {
    asin: "MOCKBRW007",
    brand: "BrewMark",
    category: "Coffee",
    editorialDraft: {
      title: "BrewMark Precision Pour-Over Kettle",
      editorialReview:
        "The BrewMark kettle nails the two things that matter for pour-over: a gooseneck spout that gives surgical control and a temperature readout that actually holds its setpoint. The flow is steady at a slow trickle, which made our coffee noticeably sweeter.",
      prosCons: {
        pros: [
          "Precise gooseneck flow",
          "Accurate temperature hold",
          "Comfortable counterweighted handle",
        ],
        cons: ["Small capacity"],
      },
      editorialRating: 9.0,
    },
  },
  {
    asin: "MOCKBRW008",
    brand: "RoastLab",
    category: "Coffee",
    editorialDraft: {
      title: "RoastLab Conical Burr Coffee Grinder",
      editorialReview:
        "Consistency is everything in a grinder, and the RoastLab conical burrs delivered a uniform grind from espresso-fine to French-press-coarse. It is a touch loud and retains a little grounds between doses, but the cup quality jump over a blade grinder is night and day.",
      prosCons: {
        pros: ["Uniform grind size", "Wide range of settings", "Sturdy build"],
        cons: ["Noisy", "Slight grind retention"],
      },
      editorialRating: 8.6,
    },
  },
  {
    asin: "MOCKAPP009",
    brand: "VitaWhirl",
    category: "Small Appliances",
    editorialDraft: {
      title: "VitaWhirl HighSpeed Countertop Blender",
      editorialReview:
        "The VitaWhirl pulverized frozen fruit and kale into a silky smoothie in under a minute, and the tamper meant no stopping to scrape. It is loud at full tilt, but the variable speed dial gives you real control for sauces and nut butters too.",
      prosCons: {
        pros: ["Crushes ice and frozen fruit", "Variable speed control", "Self-cleaning cycle"],
        cons: ["Loud", "Tall — check cabinet clearance"],
      },
      editorialRating: 8.9,
    },
  },
  {
    asin: "MOCKAPP010",
    brand: "CrispAir",
    category: "Small Appliances",
    editorialDraft: {
      title: "CrispAir 6L Digital Air Fryer",
      editorialReview:
        "The CrispAir delivered shatteringly crisp fries and juicy chicken thighs with a fraction of the oil. The 6-litre basket fits a whole small chicken, and the presets are a sensible starting point rather than a gimmick. The drawer is dishwasher-safe, which seals the deal.",
      prosCons: {
        pros: ["Large family-size basket", "Genuinely crisp results", "Dishwasher-safe drawer"],
        cons: ["Bulky footprint"],
      },
      editorialRating: 8.4,
    },
  },
];

const ARTICLES = [
  {
    slug: "best-stand-mixers-2026",
    type: "LISTICLE",
    title: "The Best Stand Mixers We Tested in 2026",
    excerpt:
      "We baked our way through a dozen mixers. Two rose to the top for power, control and longevity.",
    productAsins: ["MOCKMIX001", "MOCKMIX002"],
  },
  {
    slug: "stand-mixer-vs-hand-mixer",
    type: "COMPARISON",
    title: "Stand Mixer vs Hand Mixer: Which Do You Actually Need?",
    excerpt: "Power, counter space and budget all factor in. Here is how to choose the right tool.",
    productAsins: ["MOCKMIX001", "MOCKMIX002"],
  },
  {
    slug: "how-to-sharpen-a-chef-knife",
    type: "HOWTO",
    title: "How to Sharpen a Chef Knife at Home",
    excerpt:
      "A whetstone, ten minutes and a little patience will outperform any pull-through gadget.",
    productAsins: ["MOCKKNF003", "MOCKKNF004"],
  },
  {
    slug: "chef-knife-buying-guide",
    type: "GUIDE",
    title: "Chef Knife Buying Guide: Steel, Balance and Budget",
    excerpt: "Everything that matters before you spend on your most-used kitchen tool.",
    productAsins: ["MOCKKNF003", "MOCKKNF004"],
  },
  {
    slug: "cast-iron-vs-nonstick",
    type: "COMPARISON",
    title: "Cast Iron vs Nonstick: A Practical Showdown",
    excerpt: "Each pan has a job. We break down where each one wins in a real kitchen.",
    productAsins: ["MOCKCKW005", "MOCKCKW006"],
  },
  {
    slug: "how-to-season-cast-iron",
    type: "HOWTO",
    title: "How to Season Cast Iron the Easy Way",
    excerpt: "Skip the myths. This is the simplest method that actually builds a durable patina.",
    productAsins: ["MOCKCKW005"],
  },
  {
    slug: "pour-over-coffee-starter-guide",
    type: "GUIDE",
    title: "Pour-Over Coffee: A Starter Guide for Better Mornings",
    excerpt: "Grind, temperature and flow. Get these three right and the rest is detail.",
    productAsins: ["MOCKBRW007", "MOCKBRW008"],
  },
  {
    slug: "best-coffee-grinders",
    type: "LISTICLE",
    title: "Best Coffee Grinders for Home Baristas",
    excerpt:
      "A consistent grind is the cheapest upgrade to your cup. These earn their counter space.",
    productAsins: ["MOCKBRW008"],
  },
  {
    slug: "air-fryer-vs-oven",
    type: "COMPARISON",
    title: "Air Fryer vs Oven: When Each One Wins",
    excerpt: "Speed, crispness and energy use compared with real weeknight cooking in mind.",
    productAsins: ["MOCKAPP010"],
  },
  {
    slug: "best-blenders-for-smoothies",
    type: "LISTICLE",
    title: "The Best Blenders for Smoothies and Beyond",
    excerpt: "Power and a good tamper separate a great blender from a frustrating one.",
    productAsins: ["MOCKAPP009"],
  },
];

async function main() {
  console.log(`\n=== n8n ingestion API — tests against ${BASE} ===\n`);

  // --- Phase A: negative tests --------------------------------------------
  console.log("[A] Negative tests (auth + validation + compliance)");

  const noAuth = await post("/api/ingest/products", { products: [] }, { auth: false });
  check("rejects missing Bearer with 401", noAuth.status === 401, `got ${noAuth.status}`);

  const badAuth = await fetch(`${BASE}/api/ingest/products`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer wrong-key-value" },
    body: JSON.stringify({ products: [] }),
  });
  check("rejects wrong Bearer with 401", badAuth.status === 401, `got ${badAuth.status}`);

  const badJson = await post("/api/ingest/products", null, { raw: "{not json" });
  check("rejects invalid JSON with 400", badJson.status === 400, `got ${badJson.status}`);

  const emptyArr = await post("/api/ingest/products", { products: [] });
  check("rejects empty products array with 400", emptyArr.status === 400, `got ${emptyArr.status}`);

  const badAsin = await post("/api/ingest/products", {
    products: [{ asin: "tooshort", editorialDraft: { title: "x bad asin" } }],
  });
  check("rejects malformed ASIN with 400", badAsin.status === 400, `got ${badAsin.status}`);

  // COMPLIANCE: forbidden keys must be hard-rejected by .strict()
  const withPrice = await post("/api/ingest/products", {
    products: [
      {
        asin: "MOCKBAD001",
        price: 199.99,
        editorialDraft: { title: "Has a forbidden price field" },
      },
    ],
  });
  check(
    "COMPLIANCE: rejects payload with Amazon price (422)",
    withPrice.status === 422,
    `got ${withPrice.status}`,
  );

  const withRating = await post("/api/ingest/products", {
    products: [
      {
        asin: "MOCKBAD002",
        rating: 4.5,
        reviewCount: 1200,
        editorialDraft: { title: "Has Amazon stars" },
      },
    ],
  });
  check(
    "COMPLIANCE: rejects payload with Amazon rating/reviewCount (422)",
    withRating.status === 422,
    `got ${withRating.status}`,
  );

  const withImage = await post("/api/ingest/products", {
    products: [
      {
        asin: "MOCKBAD003",
        imageUrl: "https://m.media-amazon.com/x.jpg",
        editorialDraft: { title: "Has Amazon image" },
      },
    ],
  });
  check(
    "COMPLIANCE: rejects payload with Amazon imageUrl (422)",
    withImage.status === 422,
    `got ${withImage.status}`,
  );

  // --- Phase B: seed products ---------------------------------------------
  console.log("\n[B] Seeding 10 products via /api/ingest/products");
  const prodRes = await post("/api/ingest/products", { products: PRODUCTS });
  check(
    "products ingest returns 200",
    prodRes.status === 200,
    `got ${prodRes.status} ${JSON.stringify(prodRes.json)}`,
  );
  check(
    "products created+updated == 10",
    prodRes.json && prodRes.json.created + prodRes.json.updated === 10,
    JSON.stringify(prodRes.json),
  );
  check(
    "products no errors",
    prodRes.json && prodRes.json.errors.length === 0,
    JSON.stringify(prodRes.json?.errors),
  );

  // idempotency: a second run should update, not duplicate
  const prodRes2 = await post("/api/ingest/products", { products: PRODUCTS.slice(0, 2) });
  check(
    "idempotent re-ingest updates (no create)",
    prodRes2.json && prodRes2.json.created === 0 && prodRes2.json.updated === 2,
    JSON.stringify(prodRes2.json),
  );

  // --- Phase B: seed articles ---------------------------------------------
  console.log("\n[B] Seeding 10 articles via /api/ingest/articles");
  const articles = ARTICLES.map((a) => ({
    ...a,
    authorSlug: AUTHOR,
    body: buildArticleBody(a),
  }));
  const artRes = await post("/api/ingest/articles", { articles });
  check(
    "articles ingest returns 200",
    artRes.status === 200,
    `got ${artRes.status} ${JSON.stringify(artRes.json)}`,
  );
  check(
    "articles created+updated == 10",
    artRes.json && artRes.json.created + artRes.json.updated === 10,
    JSON.stringify(artRes.json),
  );
  check(
    "articles no errors",
    artRes.json && artRes.json.errors.length === 0,
    JSON.stringify(artRes.json?.errors),
  );

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) {
    console.log("Failures:", failures.join("; "));
    process.exit(1);
  }
}

function buildArticleBody(a) {
  const intro =
    `<p>${a.excerpt} Our verdicts below are based on hands-on editorial testing in our own kitchen — ` +
    `we never reproduce retailer ratings or reviews.</p>`;
  const sections = a.productAsins
    .map(
      (_asin, i) =>
        `<h2>Pick ${i + 1}</h2><p>We put this one through a fortnight of everyday cooking. ` +
        `See the full breakdown on its review page for our pros, cons and score out of ten.</p>`,
    )
    .join("");
  const outro =
    `<h2>How we test</h2><p>Every product is scored on performance, build quality, ease of use and value. ` +
    `As an Amazon Associate we may earn from qualifying purchases — this never affects our verdicts.</p>`;
  return intro + sections + outro;
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
