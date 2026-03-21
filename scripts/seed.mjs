#!/usr/bin/env node
/**
 * Seed script for Psy Tattoos database
 * Run with: node scripts/seed.mjs
 *
 * Creates:
 *   - 1 admin user (username: admin, password: admin@psy123)
 *   - 3 artists
 *   - 4 tattoo styles
 *   - 8 portfolio items
 *   - 6 products
 *   - 2 sample bookings
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

// Load .env manually (no dotenv needed in Node 20+)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf8");

const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").replace(/^["']|["']$/g, "").trim()];
    })
);

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function upsert(table, data, conflictOn) {
  const { error } = await supabase
    .from(table)
    .upsert(data, { onConflict: conflictOn, ignoreDuplicates: false });
  if (error) {
    console.error(`  ❌ Error upserting ${table}:`, error.message);
    throw error;
  }
  console.log(`  ✅ ${table}: ${Array.isArray(data) ? data.length : 1} row(s) seeded`);
}

/** For tables without a unique constraint — truncate then insert */
async function truncateInsert(table, data) {
  const { error: delErr } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) {
    console.error(`  ❌ Error clearing ${table}:`, delErr.message);
    throw delErr;
  }
  const { error } = await supabase.from(table).insert(data);
  if (error) {
    console.error(`  ❌ Error inserting ${table}:`, error.message);
    throw error;
  }
  console.log(`  ✅ ${table}: ${Array.isArray(data) ? data.length : 1} row(s) seeded`);
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

async function seedAdmin() {
  console.log("\n👤 Seeding admin user...");
  const passwordHash = await bcrypt.hash("admin@psy123", 12);
  await upsert(
    "admin_users",
    [{ username: "admin", password_hash: passwordHash }],
    "username"
  );
}

async function seedArtists() {
  console.log("\n🎨 Seeding artists...");
  const artists = [
    {
      name: "Aryan Mehta",
      slug: "aryan-mehta",
      bio: "Specializing in fine-line and geometric tattoos with 8 years of experience. Every line tells a story.",
      speciality: "Fine Line & Geometric",
      instagram: "aryan.ink",
      profile_photo_url: null,
    },
    {
      name: "Priya Sharma",
      slug: "priya-sharma",
      bio: "A lover of botanical and blackwork tattoos. Nature-inspired art meets precision inkwork.",
      speciality: "Botanical & Blackwork",
      instagram: "priya.tattoos",
      profile_photo_url: null,
    },
    {
      name: "Karan Dutt",
      slug: "karan-dutt",
      bio: "Neo-traditional and Japanese style artist bringing vibrant, story-driven pieces to life.",
      speciality: "Neo-Traditional & Japanese",
      instagram: "karan.dutt.ink",
      profile_photo_url: null,
    },
  ];
  await upsert("artists", artists, "slug");
}

async function seedStyles() {
  console.log("\n🖋️  Seeding styles...");
  const styles = [
    {
      name: "Fine Line",
      description:
        "Delicate, precise linework creating elegant minimalist tattoos. Perfect for subtle, sophisticated designs.",
      starting_price: 3500,
      example_image_url: null,
    },
    {
      name: "Blackwork",
      description:
        "Bold black ink work ranging from geometric patterns to intricate illustrative pieces.",
      starting_price: 4000,
      example_image_url: null,
    },
    {
      name: "Neo-Traditional",
      description:
        "A modern take on classic tattooing with bold lines, vivid colours and intricate details.",
      starting_price: 6000,
      example_image_url: null,
    },
    {
      name: "Japanese (Irezumi)",
      description:
        "Traditional Japanese motifs — koi, cherry blossoms, dragons — rendered in the classical style.",
      starting_price: 8000,
      example_image_url: null,
    },
  ];
  await truncateInsert("styles", styles);
}

async function seedPortfolioItems(artistIds) {
  console.log("\n🖼️  Seeding portfolio items...");
  const items = [
    {
      image_url: "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800",
      artist_id: artistIds[0],
      style_tag: "Fine Line",
      description: "Minimalist mountain range on forearm",
    },
    {
      image_url: "https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=800",
      artist_id: artistIds[0],
      style_tag: "Geometric",
      description: "Sacred geometry mandala on shoulder",
    },
    {
      image_url: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=800",
      artist_id: artistIds[1],
      style_tag: "Blackwork",
      description: "Botanical sleeve — rose & fern",
    },
    {
      image_url: "https://images.unsplash.com/photo-1575369422539-f2b8b3e0ee5c?w=800",
      artist_id: artistIds[1],
      style_tag: "Blackwork",
      description: "Intricate moth with moon phase",
    },
    {
      image_url: "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800",
      artist_id: artistIds[2],
      style_tag: "Neo-Traditional",
      description: "Neo-trad wolf with floral surround",
    },
    {
      image_url: "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800",
      artist_id: artistIds[2],
      style_tag: "Japanese",
      description: "Koi fish with cherry blossoms — half sleeve",
    },
    {
      image_url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800",
      artist_id: artistIds[0],
      style_tag: "Fine Line",
      description: "Celestial fine-line constellation on wrist",
    },
    {
      image_url: "https://images.unsplash.com/photo-1590246814883-57c511e76d1a?w=800",
      artist_id: artistIds[1],
      style_tag: "Blackwork",
      description: "Abstract floral blackwork on ribs",
    },
  ];
  await truncateInsert("portfolio_items", items);
}

async function seedProducts() {
  console.log("\n🛍️  Seeding products...");
  const products = [
    {
      name: "Psy Tattoos Classic Tee",
      slug: "psy-tattoos-classic-tee",
      description_short: "Premium cotton tee with the Psy Tattoos logo.",
      description_full:
        "Soft, heavyweight 100% organic cotton tee screen-printed with our iconic Psy Tattoos logo. Available in black and white. Unisex fit.",
      category: "apparel",
      price: 999,
      compare_at_price: 1299,
      material: "100% Organic Cotton",
      tags: ["tee", "apparel", "merch"],
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
      ],
      variants: [
        { size: "S", stock: 10 },
        { size: "M", stock: 15 },
        { size: "L", stock: 12 },
        { size: "XL", stock: 8 },
      ],
      stock_status: true,
      is_featured: true,
    },
    {
      name: "Ink & Soul Hoodie",
      slug: "ink-soul-hoodie",
      description_short: "Heavyweight pullover hoodie — stay warm in style.",
      description_full:
        "380gsm fleece pullover hoodie with embroidered Psy Tattoos wordmark on chest. Oversized fit, kangaroo pocket.",
      category: "apparel",
      price: 2499,
      compare_at_price: 2999,
      material: "80% Cotton / 20% Polyester",
      tags: ["hoodie", "apparel", "merch"],
      images: [
        "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800",
      ],
      variants: [
        { size: "S", stock: 5 },
        { size: "M", stock: 8 },
        { size: "L", stock: 10 },
        { size: "XL", stock: 6 },
      ],
      stock_status: true,
      is_featured: true,
    },
    {
      name: "Tattoo Aftercare Kit",
      slug: "tattoo-aftercare-kit",
      description_short: "Everything you need to heal your new tattoo perfectly.",
      description_full:
        "Our curated aftercare kit includes fragrance-free moisturiser, healing balm, and a gentle foam cleanser. Dermatologist-approved for fresh ink.",
      category: "aftercare",
      price: 799,
      compare_at_price: null,
      material: null,
      tags: ["aftercare", "healing", "care"],
      images: [
        "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=800",
      ],
      variants: [],
      stock_status: true,
      is_featured: true,
    },
    {
      name: "Flash Design Print — Set of 3",
      slug: "flash-design-print-set-3",
      description_short: "A3 giclée prints of exclusive Psy flash designs.",
      description_full:
        "Three A3 giclée art prints featuring original flash tattoo designs by our resident artists. Signed & numbered limited edition of 50.",
      category: "art",
      price: 1499,
      compare_at_price: null,
      material: "300gsm Fine Art Paper",
      tags: ["art", "print", "flash"],
      images: [
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800",
      ],
      variants: [],
      stock_status: true,
      is_featured: false,
    },
    {
      name: "Psy Enamel Pin Set",
      slug: "psy-enamel-pin-set",
      description_short: "3-piece hard enamel pin set with gold fill.",
      description_full:
        "Three unique hard enamel pins — skull rose, moon dagger, and celestial eye. Gold metal fill, rubber butterfly clutch.",
      category: "accessories",
      price: 499,
      compare_at_price: 699,
      material: "Hard Enamel, Gold Metal",
      tags: ["accessories", "pins", "merch"],
      images: [
        "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800",
      ],
      variants: [],
      stock_status: true,
      is_featured: false,
    },
    {
      name: "Gift Card",
      slug: "gift-card",
      description_short: "Give the gift of ink. Valid for any tattoo session or product.",
      description_full:
        "Digital gift cards redeemable for any tattoo session or shop purchase. Valid for 12 months. Delivered instantly by email.",
      category: "gift",
      price: 2000,
      compare_at_price: null,
      material: null,
      tags: ["gift", "voucher"],
      images: [
        "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800",
      ],
      variants: [
        { amount: 2000, label: "₹2,000" },
        { amount: 5000, label: "₹5,000" },
        { amount: 10000, label: "₹10,000" },
      ],
      stock_status: true,
      is_featured: false,
    },
  ];
  await upsert("products", products, "slug");
}

async function seedBookings(artistIds) {
  console.log("\n📅 Seeding sample bookings...");
  // Clear existing sample bookings first to avoid duplicates on re-run
  await supabase.from("bookings").delete().in("email", ["rohan@example.com", "meera@example.com"]);
  const bookings = [
    {
      name: "Rohan Kapoor",
      email: "rohan@example.com",
      phone: "9876543210",
      artist_id: artistIds[0],
      style: "Fine Line",
      description: "Small wolf head on inner forearm, fine line style.",
      preferred_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
      admin_notes: null,
    },
    {
      name: "Meera Nair",
      email: "meera@example.com",
      phone: "9123456789",
      artist_id: artistIds[1],
      style: "Blackwork",
      description: "Botanical half sleeve — roses and ferns, blackwork.",
      preferred_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: "confirmed",
      admin_notes: "Deposit received. First session ~3 hrs.",
    },
  ];
  const { error } = await supabase.from("bookings").insert(bookings);
  if (error) {
    console.error("  ❌ Error inserting bookings:", error.message);
  } else {
    console.log(`  ✅ bookings: ${bookings.length} row(s) seeded`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting Psy Tattoos database seed...\n");
  console.log(`   Supabase URL: ${SUPABASE_URL}`);

  try {
    await seedAdmin();
    await seedArtists();
    await seedStyles();

    // Fetch artist IDs for FK references
    const { data: artists, error: artistErr } = await supabase
      .from("artists")
      .select("id")
      .order("created_at");
    if (artistErr) throw artistErr;
    const artistIds = artists.map((a) => a.id);

    await seedPortfolioItems(artistIds);
    await seedProducts();
    await seedBookings(artistIds);

    console.log("\n🎉 Seed complete!\n");
    console.log("─────────────────────────────────");
    console.log("  Admin login credentials:");
    console.log("  Username : admin");
    console.log("  Password : admin@psy123");
    console.log("  URL      : http://localhost:3000/admin/login");
    console.log("─────────────────────────────────\n");
  } catch (err) {
    console.error("\n💥 Seed failed:", err.message);
    process.exit(1);
  }
}

main();
