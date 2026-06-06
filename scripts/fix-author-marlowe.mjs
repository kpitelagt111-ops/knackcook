#!/usr/bin/env node
/**
 * Set the KnackCook brand author record (byline = "By KnackCook"):
 *   1. Set Author.name = "KnackCook" (brand byline, no fabricated individual).
 *   2. Upsert AuthorTranslation(locale="en") with an honest brand bio
 *      so the page renders a bio AND the JSON-LD gets a description.
 *
 * Idempotent — safe to re-run. The author slug stays "marlowe-finch" (record key).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/fix-author-marlowe.mjs
 */
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const prisma = new PrismaClient();

const SLUG = "marlowe-finch";
const NAME = "KnackCook";
const BIO_EN =
  "KnackCook is a research-first cookware site. Instead of one editor with one pan, " +
  "our recommendations triangulate manufacturer specifications, long-term owner reports, " +
  "and verified expert reviews — and a human signs off on every guide.";

async function main() {
  const author = await prisma.author.findUnique({ where: { slug: SLUG } });
  if (!author) {
    console.error(`No author with slug="${SLUG}" found. Aborting.`);
    process.exit(1);
  }

  const updates = [];

  if (author.name !== NAME) {
    await prisma.author.update({ where: { id: author.id }, data: { name: NAME } });
    updates.push(`name: "${author.name}" → "${NAME}"`);
  } else {
    updates.push(`name already "${NAME}"`);
  }

  const translation = await prisma.authorTranslation.upsert({
    where: { authorId_locale: { authorId: author.id, locale: "en" } },
    update: { bio: BIO_EN },
    create: { authorId: author.id, locale: "en", bio: BIO_EN },
  });
  updates.push(`bio (en) upserted (${translation.bio.length} chars)`);

  console.log(`Author ${SLUG}:`);
  for (const line of updates) console.log(`  - ${line}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
