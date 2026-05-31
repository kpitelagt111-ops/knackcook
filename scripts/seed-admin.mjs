#!/usr/bin/env node
/**
 * Seed (or upsert) the bootstrap SUPER_ADMIN user.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/seed-admin.mjs
 *
 * Defaults: admin@knackcook.com / Admin12345! — change the password on first login.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@knackcook.com";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin12345!";
const NAME = process.env.ADMIN_NAME ?? "Super Admin";

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
      role: "SUPER_ADMIN",
      name: NAME,
    },
    create: {
      email: EMAIL,
      password: passwordHash,
      role: "SUPER_ADMIN",
      name: NAME,
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  console.log("Seeded admin:", user);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
