import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { handlers, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const { email, password } = credentials as { email: string; password: string };
                const user = await prisma.user.findUnique({ where: { email } });
                if (!user || !user.passwordHash) return null;
                const valid = await bcrypt.compare(password, user.passwordHash);
                if (!valid) return null;

                // Return a minimal user object (don't return passwordHash)
                return { id: user.id, email: user.email, name: user.name ?? undefined };
            },
        }),
    ],
    // Using your secret word as a placeholder example
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NEXTAUTH_DEBUG === "true",
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.user = { id: (user as any).id, email: (user as any).email };
            }
            return token;
        },
        async session({ session, token }) {
            if (token.user) {
                session.user = token.user as any;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            console.log('redirect ', url, baseUrl);
            if (!url) return baseUrl;
            if (url?.startsWith("/")) return `${baseUrl}${url}`;
            try {
                const u = new URL(url);
                if (!url.includes('auth/signin') && u.origin === baseUrl) return url;
            } catch (e) { }
            return baseUrl;
        },
    },
})