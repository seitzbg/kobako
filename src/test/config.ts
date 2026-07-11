// Number of Vitest workers and, therefore, of per-worker test databases.
// Pinned so provisioning (globalSetup) and pool size (vite.config) never drift.
export const TEST_DB_WORKERS = 4;
