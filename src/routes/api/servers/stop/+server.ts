import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { ServerStopSchema, type ServerStartPayload } from '$lib/server/minecraft/schema';
import { stopMinecraftServer } from '$lib/server/minecraft/service';

export const POST: RequestHandler = async ({ request }) => {
	let payload: ServerStartPayload;
	try {
		const body = await request.json();
		payload = ServerStopSchema.parse(body);
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

	stopMinecraftServer(payload.id)
		.then(() => {
			console.log(`Server ${payload.id} stopped successfully`);
		})
		.catch((error) => {
			console.error(`Failed to stop server ${payload.id}:`, error.message);
		});

	return json({ message: `Stop request for server ${payload.id} received` });
};
