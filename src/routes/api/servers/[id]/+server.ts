import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { getMinecraftServerById } from '$lib/server/servers/actions';

export const GET: RequestHandler = async ({ params }) => {
	let { id } = z.object({ id: z.string() }).parse(params);
	const server = await getMinecraftServerById(id);

	return json(server);
};
