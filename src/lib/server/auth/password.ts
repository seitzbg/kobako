import { hash, verify } from '@node-rs/argon2';

// Argon2id parameters (OWASP-recommended baseline)
const opts = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
	return hash(password, opts);
}

export function verifyPassword(hashStr: string, password: string): Promise<boolean> {
	return verify(hashStr, password, opts);
}
