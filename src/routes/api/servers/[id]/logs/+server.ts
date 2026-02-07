import { DockerService } from '$lib/server/servers/docker.service';
import { ServerRepository } from '$lib/server/servers/repository';
import { logManager } from '$lib/server/servers/log_manager';
import { parseId } from '../../../_helpers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const parsed = parseId(params);
    if (!parsed.success) return new Response('Invalid ID', { status: 400 });

    const server = await ServerRepository.getById(parsed.data.id);
    if (!server || !server.containerId) return new Response('Not Found', { status: 404 });

    const stream = new ReadableStream({
        async start(controller) {
            const send = (line: string) => {
                const data = JSON.stringify({ line: line.trim() });
                controller.enqueue(`data: ${data}\n\n`);
            };

            const logListener = (line: string) => send(line);
            logManager.on(`log:${parsed.data.id}`, logListener);

            try {
                const dockerStream = await DockerService.getContainerLogs(server.containerId!);
                
                dockerStream.on('data', (chunk: Buffer) => {
                    send(chunk.toString('utf8'));
                });

                dockerStream.on('end', () => {
                    logManager.off(`log:${parsed.data.id}`, logListener);
                    controller.close();
                });
            } catch (e) {
                logManager.off(`log:${parsed.data.id}`, logListener);
                controller.close();
            }
        },
        cancel() {
            logManager.removeAllListeners(`log:${parsed.data.id}`);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
};