import { getOrStartStats, getStats } from '$lib/server/servers/stats';
import { ServerRepository } from '$lib/server/servers/repository';

export const GET = async ({ params, request }) => {
	const { id } = params;
	const encoder = new TextEncoder();
	let intervalId: NodeJS.Timeout;

	const stream = new ReadableStream({
		async start(controller) {
			const sendUpdates = async () => {
				if (request.signal.aborted || controller.desiredSize === null) {
					clearInterval(intervalId);
					try { controller.close(); } catch { }
					return;
				}

				try {
					const server = await ServerRepository.getById(id);
					
					if (server?.containerId) {
						await getOrStartStats(server.id, server.containerId, server.name);
					}

					const stats = getStats(id);
					const data = stats ? JSON.stringify(stats) : JSON.stringify({ status: 'offline' });
					
					controller.enqueue(encoder.encode(`data: ${data}\n\n`));
				} catch (err) {
					console.error(`SSE Error for server ${id}:`, err);
					clearInterval(intervalId);
					try { controller.close(); } catch { }
				}
			};

			await sendUpdates();
			intervalId = setInterval(sendUpdates, 1000);

			const heartbeatId = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': heartbeat\n\n'));
				} catch {
					clearInterval(heartbeatId);
				}
			}, 15000);
		},
		cancel() {
			if (intervalId) clearInterval(intervalId);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			'Connection': 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};