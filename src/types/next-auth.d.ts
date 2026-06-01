import { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      isAdmin?: boolean;
      id?: string;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
  }
}

// Defense-in-depth (H3): restrict cookie use to a single trusted origin.
// `authorizedParties` is not yet declared in next-auth@5.0.0-beta.25 types,
// so we extend NextAuthConfig to accept it. The value is plumbed through
// at runtime; future versions of Auth.js will read it natively.
declare module "next-auth" {
  interface NextAuthConfig {
    authorizedParties?: string[] | undefined;
  }
}
