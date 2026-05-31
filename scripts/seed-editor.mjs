#!/usr/bin/env node
/**
 * Seed (or upsert) the bootstrap EDITOR user.
 *
 * Mirrors `scripts/seed-admin.mjs` — same upsert pattern, same env-var
 * overrides — but creates an EDITOR (not SUPER_ADMIN) so E2E specs that
 * test the RBAC redirect (`tests/e2e/admin.spec.ts`) have a real editor
 * account to log in with.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/seed-editor.mjs
 *
 * Defaults: editor@knackcook.com / Editor12345! — change the password
 * via the admin UI on first login for any non-CI / non-local environment.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const EMAIL = process.env.EDITOR_EMAIL ?? "editor@knackcook.com";
const PASSWORD = process.env.EDITOR_PASSWORD ?? "Editor12345!";
const NAME = process.env.EDITOR_NAME ?? "Editor";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash(PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      password: passwordHash,
      role: "EDITOR",
      name: NAME,
    },
    create: {
      email: EMAIL,
      password: passwordHash,
      role: "EDITOR",
      name: NAME,
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  console.log("Seeded editor:", user);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
