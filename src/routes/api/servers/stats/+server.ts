import { getAllStats, getOrStartStats } from '$lib/server/servers/stats';
import { ServerRepository } from '$lib/server/servers/repository';

export const GET = async ({ request }) => {
	const encoder = new TextEncoder();
	let intervalId: NodeJS.Timeout;

	const stream = new ReadableStream({
		async start(controller) {
			const sendUpdates = async () => {
				if (request.signal.aborted) {
					clearInterval(intervalId);
					try { controller.close(); } catch { }
					return;
				}

				try {
					const servers = await ServerRepository.getAll();
					
					await Promise.allSettled(
						servers
							.filter(s => s.containerId)
							.map(s => getOrStartStats(s.id, s.containerId!, s.name))
					);

					const allStats = getAllStats();
					const chunk = encoder.encode(`data: ${JSON.stringify(allStats)}\n\n`);
					
					if (controller.desiredSize !== null && controller.desiredSize > 0) {
						controller.enqueue(chunk);
					}
				} catch (err) {
					console.error('SSE Update Error:', err);
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
			'Cache-Control': 'no-cache, no-transform',
			'Connection': 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};