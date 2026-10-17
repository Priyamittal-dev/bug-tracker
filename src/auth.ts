import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import authConfig, { AUTH_SECRET } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: AUTH_SECRET,
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

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password || user.status !== "ACTIVE") return null;
          if (!(await bcrypt.compare(password, user.password))) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatar,
            jobTitle: user.jobTitle,
          };
        } catch (err) {
          console.error("Auth authorize error:", err);
          return null;
        }
      },
    }),
  ],
});
