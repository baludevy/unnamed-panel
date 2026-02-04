import { getAllStats, getOrStartStats } from '$lib/server/servers/servers.stats';
import { ServerRepository } from '$lib/server/servers/servers.repository';

export const GET = async () => {
    let intervalId: NodeJS.Timeout;

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            const sendUpdates = async () => {
                if (controller.desiredSize === null) {
                    clearInterval(intervalId);
                    return;
                }

                try {
                    const servers = await ServerRepository.getAll();
                    for (const server of servers) {
                        if (server.containerId) {
                            await getOrStartStats(server.id, server.containerId, server.name);
                        }
                    }

                    const data = JSON.stringify(getAllStats());
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch (err) {
                    clearInterval(intervalId);
                    try {
                        controller.close();
                    } catch {}
                }
            };

            await sendUpdates();

            intervalId = setInterval(sendUpdates, 1000);
        },
        cancel() {
            if (intervalId) clearInterval(intervalId);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
        }
    });
};