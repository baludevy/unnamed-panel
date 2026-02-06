import { json, type RequestHandler } from '@sveltejs/kit';
import { stopMinecraftServer } from '$lib/server/servers/actions';
import { ErrorMessages } from '$lib/api/error_codes';
import { parseId, zodError } from '../../../_helpers';

export const POST: RequestHandler = async ({ params }) => {
	const parsed = parseId(params);
	if (!parsed.success) return zodError(parsed.error);

	const result = await stopMinecraftServer(parsed.data.id);

	switch (result.status) {
		case 'NOT_FOUND':
			return json({ code: result.status, message: ErrorMessages[result.status] }, { status: 404 });
		case 'ALREADY_STOPPED':
			return json({ code: result.status, message: ErrorMessages[result.status] }, { status: 400 });
		case 'STOPPED':
			return json({
				code: result.status,
				message: ErrorMessages[result.status]
			});
	}

	return json({ success: true });
};
