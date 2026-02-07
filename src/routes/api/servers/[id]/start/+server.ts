import { json, type RequestHandler } from '@sveltejs/kit';
import { startMinecraftServer } from '$lib/server/servers/actions';
import { ErrorMessages } from '$lib/api/error_codes';
import { parseId, zodError } from '../../../_helpers';

export const POST: RequestHandler = async ({ params }) => {
	const parsed = parseId(params);
	if (!parsed.success) return zodError(parsed.error);

	const result = await startMinecraftServer(parsed.data.id);

	switch (result.status) {
		case 'NOT_FOUND':
			return json({ code: result.status, message: ErrorMessages[result.status] }, { status: 404 });
		case 'ALREADY_RUNNING':
			return json({ code: result.status, message: ErrorMessages[result.status] }, { status: 400 });
		case 'STARTED':
			return json({
				code: result.status,
				message: ErrorMessages[result.status]
			});
	}
	return json({ success: true });
};
