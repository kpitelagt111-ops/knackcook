#!/usr/bin/env node
/**
 * Fix the Marlowe Finch author record:
 *   1. Set Author.name = "Marlowe Finch" (was "marlowe-finch" — slug leaked).
 *   2. Upsert AuthorTranslation(locale="en") with an honest research-analyst bio
 *      so the page renders a bio AND the JSON-LD Person schema gets a description.
 *
 * Idempotent — safe to re-run. Required for E-E-A-T credibility before Google
 * indexes the published articles.
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
const NAME = "Marlowe Finch";
const BIO_EN =
  "Marlowe Finch is the research analyst behind KnackCook's buying guides. " +
  "Marlowe doesn't test in a home kitchen — instead, every recommendation " +
  "triangulates manufacturer specifications, long-term owner reports, and " +
  "verified expert reviews. Methodology and sourcing are published for every guide.";

async function main() {
  const author = await prisma.author.findUnique({ where: { slug: SLUG } });
  if (!author) {
    console.error(`No author with slug="${SLUG}" found. Aborting.`);
    process.exit(1);
  }

  let updates = [];

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
