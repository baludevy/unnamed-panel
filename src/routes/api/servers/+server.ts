import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { ServerCreateSchema, type ServerCreationPayload } from '$lib/server/servers/servers.schema';
import {
	createMinecraftServer,
	listMinecraftServers,
	removeMinecraftServer
} from '$lib/server/servers/servers.actions';

export const GET: RequestHandler = async () => {
	const servers = await listMinecraftServers();
	return json(servers);
};

export const POST: RequestHandler = async ({ request }) => {
	let payload: ServerCreationPayload;

	try {
		const body = await request.json();
		payload = ServerCreateSchema.parse(body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{
					error: 'Invalid request data',
					details: error.issues.map((e) => ({ path: e.path, message: e.message }))
				},
				{ status: 400 }
			);
		}
		return json({ error: 'Invalid json format submitted' }, { status: 400 });
	}

	try {
		const server = await createMinecraftServer(payload);
		return json(
			{
				...server,
				message: `Server ${server.name} created and started successfully`
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error('Docker operation failed:', error.message);
		return json({ error: 'Failed to create server', details: error.message }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	const deleteData = url.searchParams.get('deleteData') !== 'false';

	if (!id) return json({ error: 'Missing server ID' }, { status: 400 });

	const ok = await removeMinecraftServer(id, deleteData);
	if (!ok) return json({ error: 'Server not found or already removed' }, { status: 404 });

	return json({ success: true });
};
