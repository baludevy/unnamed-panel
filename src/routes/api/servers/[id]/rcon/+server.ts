import { json, type RequestHandler } from '@sveltejs/kit';
import { RconService } from '$lib/server/rcon/service';
import { logManager } from '$lib/server/servers/log_manager';
import { parseId } from '../../../_helpers';

export const POST: RequestHandler = async ({ params, request }) => {
    const parsed = parseId(params);
    if (!parsed.success) return json({ error: 'Invalid ID' }, { status: 400 });

    const { command } = await request.json();
    if (!command) return json({ error: 'Command required' }, { status: 400 });

    logManager.emitLog(parsed.data.id, `> ${command}`);

    const result = await RconService.executeCommand(parsed.data.id, command);

    if (result.success && result.response) {
        logManager.emitLog(parsed.data.id, result.response);
    } else if (!result.success) {
        logManager.emitLog(parsed.data.id, `Error: ${result.error}`);
    }

    return json({ success: result.success });
};