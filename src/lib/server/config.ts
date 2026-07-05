// Where cached product images live. A persistent volume in the container
// (/data), a git-ignored ./data in dev. Read from process.env (server-only,
// adapter-node runtime) so it also works cleanly under vitest.
export const DATA_DIR = process.env.KOBAKO_DATA_DIR ?? '/data';
