import { json, type RequestHandler } from '@sveltejs/kit';
import { restartMinecraftServer } from '$lib/server/servers/actions';
import { ErrorMessages } from '$lib/api/error_codes';
import { parseId, zodError } from '../../../_helpers';

export const POST: RequestHandler = async ({ params }) => {
	const parsed = parseId(params);
	if (!parsed.success) return zodError(parsed.error);

	const result = await restartMinecraftServer(parsed.data.id);

	if (result?.status === 'NOT_FOUND') {
		return json(
			{ code: 'NOT_FOUND', message: ErrorMessages.NOT_FOUND },
			{ status: 404 }
		);
	}

	return json({
		code: 'RESTARTED',
		message: `server ${parsed.data.id} restarted`
	});
};