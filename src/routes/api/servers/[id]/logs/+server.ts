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
            let isClosed = false;

            const safeClose = () => {
                if (isClosed) return;
                isClosed = true;
                logManager.off(`log:${parsed.data.id}`, logListener);
                try {
                    controller.close();
                } catch (e) {
                    
                }
            };

            const send = (raw: string) => {
                if (isClosed) return;
                let cleanLine = raw;
                
                try {
                    const parsedJson = JSON.parse(raw);
                    if (parsedJson.line) cleanLine = parsedJson.line;
                } catch {}

                cleanLine = cleanLine.replace(/^[\u0001\u0002].{7}/gm, '');

                const data = JSON.stringify({ 
                    line: cleanLine.trim(),
                    timestamp: new Date().toISOString() 
                });

                try {
                    controller.enqueue(`data: ${data}\n\n`);
                } catch (e) {
                    safeClose();
                }
            };

            const logListener = (line: string) => send(line);
            logManager.on(`log:${parsed.data.id}`, logListener);

            try {
                const dockerStream = await DockerService.getContainerLogs(server.containerId!);
                
                dockerStream.on('data', (chunk: Buffer) => {
                    let offset = 0;
                    while (offset < chunk.length) {
                        if (offset + 8 > chunk.length) break;
                        
                        const type = chunk.readUInt8(offset);
                        const length = chunk.readUInt32BE(offset + 4);
                        
                        if (offset + 8 + length > chunk.length) break;

                        if (type === 1 || type === 2) {
                            const content = chunk.toString('utf8', offset + 8, offset + 8 + length);
                            send(content);
                        }
                        
                        offset += 8 + length;
                    }
                });

                dockerStream.on('end', safeClose);
                dockerStream.on('error', safeClose);
            } catch (e) {
                safeClose();
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