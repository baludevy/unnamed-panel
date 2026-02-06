import { getMinecraftServerById } from '$lib/server/servers/actions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	return {
		server: await getMinecraftServerById(params.id)
	};
};
