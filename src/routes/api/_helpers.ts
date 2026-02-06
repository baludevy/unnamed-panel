import { json } from '@sveltejs/kit';
import { z } from 'zod';

export const idSchema = z.object({
	id: z.string().min(1)
});

export function parseId(params: Record<string, string | undefined>) {
	return idSchema.safeParse({ id: params.id });
}

export function zodError(error: z.ZodError) {
	return json(
		{
			code: 'INVALID_REQUEST',
			details: error.issues.map((e) => ({
				path: e.path,
				message: e.message
			}))
		},
		{ status: 400 }
	);
}