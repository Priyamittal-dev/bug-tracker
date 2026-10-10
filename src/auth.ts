import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import authConfig from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-key-production-32chars",
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers.filter(
      (p) => (typeof p === "function" ? (p as any).id : p.id) !== "credentials"
    ),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let email = (credentials.email as string).toLowerCase().trim();
        let password = credentials.password as string;

        // Auto-correct if user accidentally swapped email and password fields
        if (!email.includes("@") && password.includes("@")) {
          const temp = email;
          email = password.toLowerCase().trim();
          password = temp;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) return null;

        // Verify password with raw input, or trimmed input if copy-pasted with whitespace
        let isValid = await bcrypt.compare(password, user.password);
        if (!isValid && password.trim() !== password) {
          isValid = await bcrypt.compare(password.trim(), user.password);
        }

        if (isValid) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatar,
            jobTitle: user.jobTitle,
          };
        }

        return null;
      },
    }),
  ],
});

