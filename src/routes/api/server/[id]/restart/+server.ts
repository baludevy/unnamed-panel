import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { restartMinecraftServer } from '$lib/server/servers/actions';

export const POST: RequestHandler = async ({ params }) => {
	let id: string = params.id ?? '';
	let payload: { id: string } = { id };
	try {
		payload = z.object({ id: z.string() }).parse(payload);
		restartMinecraftServer(payload.id);
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
