import type { LayoutServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';

// Defense-in-depth: every route under (app) is authed by default. Individual
// loads still call requireUser/requireAdmin as belt-and-suspenders.
export const load: LayoutServerLoad = ({ locals }) => {
	requireUser(locals);
	return {};
};
