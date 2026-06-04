// tests/e2e/global-setup.ts
import fs from "node:fs/promises";
import path from "node:path";
import { seedTestDb, disconnectTestDb } from "./support/db";
import { writeAuthStates, AUTH_DIR } from "./support/auth";

async function globalSetup(): Promise<void> {
  const seed = await seedTestDb();
  await writeAuthStates(seed.userId, seed.adminId);
  await fs.mkdir(AUTH_DIR, { recursive: true });
  await fs.writeFile(
    path.join(AUTH_DIR, "seed.json"),
    JSON.stringify(seed, null, 2),
  );
  await disconnectTestDb();
}

export default globalSetup;
