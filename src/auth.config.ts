import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

const providers: NextAuthConfig["providers"] = [];

const googleId = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;
if (googleId && googleSecret && !googleId.includes("your-")) {
  providers.push(
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
    })
  );
}

const githubId = process.env.GITHUB_ID || process.env.AUTH_GITHUB_ID;
const githubSecret = process.env.GITHUB_SECRET || process.env.AUTH_GITHUB_SECRET;
if (githubId && githubSecret && !githubId.includes("your-")) {
  providers.push(
    GitHub({
      clientId: githubId,
      clientSecret: githubSecret,
    })
  );
}

providers.push(
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize() {
      return null; // Implemented in auth.ts (Node runtime)
    },
  })
);

export default {
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.jobTitle = (user as any).jobTitle;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.jobTitle = token.jobTitle as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;

