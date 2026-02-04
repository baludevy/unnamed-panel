import { listMinecraftServers } from '$lib/server/servers/servers.actions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		servers: await listMinecraftServers()
	};
};
