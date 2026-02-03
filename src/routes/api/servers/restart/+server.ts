import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { ServerStartSchema, type ServerStartPayload } from '$lib/server/minecraft/server.schema';
import { restartMinecraftServer } from '$lib/server/minecraft/server.actions';

export const POST: RequestHandler = async ({ request }) => {
	let payload: ServerStartPayload;
	try {
		const body = await request.json();
		payload = ServerStartSchema.parse(body);
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
		await restartMinecraftServer(payload.id);
		return json({ message: `Server ${payload.id} restarted successfully` });
	} catch (error: any) {
		console.error(`Failed to restart server ${payload.id}:`, error.message);
		return json({ error: 'Failed to restart server', details: error.message }, { status: 500 });
	}
};
