import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      jobTitle?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    jobTitle?: string | null;
  }
}
