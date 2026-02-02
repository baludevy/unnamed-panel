import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { ServerStartSchema, type ServerStartPayload } from '$lib/server/minecraft/schema';
import { startMinecraftServer } from '$lib/server/minecraft/service';

export const POST: RequestHandler = async ({ request }) => {
    let payload: ServerStartPayload;
    try {
        const body = await request.json();
        payload = ServerStartSchema.parse(body);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return json({
                error: 'Invalid request data',
                details: error.issues.map((e) => ({ path: e.path, message: e.message }))
            }, { status: 400 });
        }
        return json({ error: 'Invalid json format submitted' }, { status: 400 });
    }

    startMinecraftServer(payload.id).then(() => {
        console.log(`Server ${payload.id} started successfully`);
    }).catch((error) => {
        console.error(`Failed to start server ${payload.id}:`, error.message);
    });

    return json({ message: `Start request for server ${payload.id} received` });
}