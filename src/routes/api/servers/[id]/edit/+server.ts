import { json, type RequestHandler } from '@sveltejs/kit';
import { editMinecraftServer } from '$lib/server/servers/actions';
import { ErrorMessages } from '$lib/api/error_codes';
import { parseId, zodError } from '../../../_helpers';

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
