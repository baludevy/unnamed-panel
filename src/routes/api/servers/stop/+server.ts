import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { ServerStopSchema, type ServerStartPayload } from '$lib/server/servers/servers.schema';
import { stopMinecraftServer } from '$lib/server/servers/servers.actions';

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

    try {
        await stopMinecraftServer(payload.id);
        return json({ message: `Server ${payload.id} stopped successfully` });
    } catch (error: any) {
        console.error(`Failed to stop server ${payload.id}:`, error.message);
        return json({ error: 'Failed to stop server', details: error.message }, { status: 500 });
    }
};