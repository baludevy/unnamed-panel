import { json, type RequestHandler } from '@sveltejs/kit';
import { listMinecraftServers } from '$lib/server/servers/actions';

export const GET: RequestHandler = async ({ url }) => {
	const servers = await listMinecraftServers();

	return json(servers);
};
