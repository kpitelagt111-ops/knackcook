import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth, { type DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/lib/db";

export type { JWT };

/**
 * Auth.js v5 (NextAuth) configuration for the KnackCook admin.
 *
 * - Prisma adapter persists OAuth Accounts/Users.
 * - Credentials provider verifies email + bcryptjs-hashed password against `User`.
 * - JWT session strategy (required because Credentials is in use).
 * - `session.user.role` is populated from the User row via JWT callbacks so
 *   RBAC checks in server components/actions do not need a DB round-trip.
 *
 * See docs/AGENTS.md §8 — `/admin/*` and `/api/admin/*` MUST be guarded
 * server-side on every action; middleware-level checks are the first gate.
 */

type UserRole = "SUPER_ADMIN" | "EDITOR";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    userId?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    // Auth.js v5 auto-reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from env.
    Google,
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
          },
        });

        if (!user?.password) return null;

        const valid = await compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in (user is defined), seed the token from the authorize/adapter user.
      if (user) {
        token.userId = user.id ?? token.sub;
        if (user.role) token.role = user.role;
      }

      // For OAuth, the `authorize` path is not taken — backfill role from DB
      // the first time we see this token (or whenever role is missing).
      if (!token.role && token.userId) {
        const dbUser = await db.user.findUnique({
          where: { id: token.userId },
          select: { role: true },
        });
        if (dbUser) token.role = dbUser.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      else if (token.sub) session.user.id = token.sub;
      session.user.role = (token.role ?? "EDITOR") as UserRole;
      return session;
    },
  },
});
