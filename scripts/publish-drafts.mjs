#!/usr/bin/env node
/**
 * Publish the mock drafts created by scripts/n8n-mock.mjs so the site looks
 * like a real production catalogue.
 *
 * In production an editor does this manually from the back office
 * (DRAFT -> IN_REVIEW -> PUBLISHED). This script automates that step for the
 * seeded mock data only (scoped by the MOCK* ASINs and the mock article slugs).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/publish-drafts.mjs
 */
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const prisma = new PrismaClient();

const CATEGORY_ORDER = ["stand-mixers", "knives", "cookware", "coffee", "small-appliances"];
const AUTHOR_SLUG = "marlowe-finch";

const ARTICLE_SLUGS = [
  "best-stand-mixers-2026",
  "stand-mixer-vs-hand-mixer",
  "how-to-sharpen-a-chef-knife",
  "chef-knife-buying-guide",
  "cast-iron-vs-nonstick",
  "how-to-season-cast-iron",
  "pour-over-coffee-starter-guide",
  "best-coffee-grinders",
  "air-fryer-vs-oven",
  "best-blenders-for-smoothies",
];

async function main() {
  // 1. Publish mock products.
  const prod = await prisma.product.updateMany({
    where: { asin: { startsWith: "MOCK" } },
    data: { status: "PUBLISHED", isActive: true },
  });
  console.log(`Products published: ${prod.count}`);

  // 2. Publish mock articles + stamp publishedAt.
  const articles = await prisma.article.findMany({
    where: { slug: { in: ARTICLE_SLUGS } },
    select: { id: true, publishedAt: true },
  });
  let articlesPublished = 0;
  for (const a of articles) {
    await prisma.article.update({
      where: { id: a.id },
      data: { status: "PUBLISHED", publishedAt: a.publishedAt ?? new Date() },
    });
    articlesPublished += 1;
  }
  console.log(`Articles published: ${articlesPublished}`);

  // 3. Give the auto-created author a human display name.
  await prisma.author.updateMany({
    where: { slug: AUTHOR_SLUG },
    data: { name: "Marlowe Finch" },
  });

  // 4. Order the categories so the homepage grid reads naturally.
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    await prisma.category.updateMany({ where: { slug: CATEGORY_ORDER[i] }, data: { order: i } });
  }
  console.log("Category order set.");

  const liveProducts = await prisma.product.count({
    where: { status: "PUBLISHED", isActive: true },
  });
  const liveArticles = await prisma.article.count({ where: { status: "PUBLISHED" } });
  console.log(`\nLive products: ${liveProducts} | Live articles: ${liveArticles}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
