import NextAuth, { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,   // ← add
  trustHost: true,                                                  // ← helpful locally/behind proxy
  session: { strategy: "jwt" },
  debug: process.env.NODE_ENV !== "production",

  adapter: PrismaAdapter(prisma),

  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        return ok ? { id: user.id, name: user.name ?? user.email!, email: user.email! } : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, trigger }) {
      // set once at sign-in; keep existing value during session refreshes
      if (trigger === "signIn" || !("loginAt" in token)) {
        (token as any).loginAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).loginAt = (token as any).loginAt ?? null;
      return session;
    },
  },
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
