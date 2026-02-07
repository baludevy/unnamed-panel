import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import {
	editMinecraftServer,
	getMinecraftServerById,
	removeMinecraftServer
} from '$lib/server/servers/actions';
import { ErrorMessages } from '$lib/api/error_codes';
import { parseId, zodError } from '../../_helpers';

export const GET: RequestHandler = async ({ params }) => {
	let { id } = z.object({ id: z.string() }).parse(params);
	const server = await getMinecraftServerById(id);

	return json(server);
};

export const PATCH: RequestHandler = async ({ request, params }) => {
	const parsed = parseId(params);
	if (!parsed.success) return zodError(parsed.error);

	const payload = await request.json();
	const result = await editMinecraftServer(parsed.data.id, payload);

	if (result.status === 'NOT_FOUND') {
		return json({ code: result.status, message: ErrorMessages[result.status] }, { status: 404 });
	}

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, url }) => {
	const parsed = parseId(params);
	if (!parsed.success) return zodError(parsed.error);

	const deleteData = url.searchParams.get('deleteData') !== 'false';
	const result = await removeMinecraftServer(parsed.data.id, deleteData);

	if (result.status === 'NOT_FOUND') {
		return json({ code: result.status, message: ErrorMessages[result.status] }, { status: 404 });
	}

	return json({ success: true });
};
