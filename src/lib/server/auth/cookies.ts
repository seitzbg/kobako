import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { SESSION_COOKIE } from './session';

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date): void {
	cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires: expiresAt,
		path: '/'
	});
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
