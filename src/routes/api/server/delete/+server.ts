import { json, type RequestHandler } from '@sveltejs/kit';
import { removeMinecraftServer } from '$lib/server/servers/actions';

export const DELETE: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	const deleteData = url.searchParams.get('deleteData') !== 'false';

	if (!id) return json({ error: 'Missing server ID' }, { status: 400 });

	const ok = await removeMinecraftServer(id, deleteData);
	if (!ok) return json({ error: 'Server not found or already removed' }, { status: 404 });

	return json({ success: true });
};
