import { json, type RequestHandler } from '@sveltejs/kit';
import { editMinecraftServer } from '$lib/server/minecraft/server.actions';

export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const { id, ...payload } = await request.json();

		if (!id) {
			return json({ error: 'Server ID is required' }, { status: 400 });
		}

		await editMinecraftServer(id, payload);

		return json({ success: true });
	} catch (err: any) {
		return json({ error: err.message }, { status: 500 });
	}
};
