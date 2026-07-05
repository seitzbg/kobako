import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
	it('verifies a correct password and rejects a wrong one', async () => {
		const hash = await hashPassword('correct horse battery staple');
		expect(hash).not.toContain('correct horse'); // not plaintext
		expect(hash.startsWith('$argon2id$')).toBe(true); // Argon2id, not an implicit default

		expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true);
		expect(await verifyPassword(hash, 'wrong password')).toBe(false);
	});
});
