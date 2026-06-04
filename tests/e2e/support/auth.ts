// tests/e2e/support/auth.ts
import path from "node:path";
import fs from "node:fs/promises";
import { encode } from "next-auth/jwt";
import { SEED_USER, SEED_ADMIN } from "./db";

export const SESSION_COOKIE_NAME = "authjs.session-token"; // http localhost

export const AUTH_DIR = path.join(process.cwd(), "tests", "e2e", ".auth");
export const USER_STATE = path.join(AUTH_DIR, "user.json");
export const ADMIN_STATE = path.join(AUTH_DIR, "admin.json");

async function tokenFor(identity: {
  email: string;
  name: string;
  isAdmin: boolean;
  sub: string;
}): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET missing (load .env.local).");
  return encode({
    token: {
      sub: identity.sub,
      name: identity.name,
      email: identity.email,
      isAdmin: identity.isAdmin,
    },
    secret,
    salt: SESSION_COOKIE_NAME,
    maxAge: 30 * 24 * 60 * 60,
  });
}

function stateFor(token: string) {
  return {
    cookies: [
      {
        name: SESSION_COOKIE_NAME,
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
    ],
    origins: [],
  };
}

/**
 * Write user/admin storageState. `userId`/`adminId` come from the seed so the
 * JWT `sub` matches the seeded _id (server lookups use email, but keep sub
 * aligned for correctness).
 */
export async function writeAuthStates(
  userId: string,
  adminId: string,
): Promise<void> {
  await fs.mkdir(AUTH_DIR, { recursive: true });
  const userToken = await tokenFor({ ...SEED_USER, sub: userId });
  const adminToken = await tokenFor({ ...SEED_ADMIN, sub: adminId });
  await Promise.all([
    fs.writeFile(USER_STATE, JSON.stringify(stateFor(userToken), null, 2)),
    fs.writeFile(ADMIN_STATE, JSON.stringify(stateFor(adminToken), null, 2)),
  ]);
}
