// tests/e2e/global-teardown.ts
import { connectTestDb, cleanUserData, disconnectTestDb } from "./support/db";

async function globalTeardown(): Promise<void> {
  // Remove ONLY suite-owned data; preserve the restored real catalog.
  await connectTestDb();
  await cleanUserData();
  await disconnectTestDb();
}

export default globalTeardown;
