import { getOrStartStats, getStats } from '$lib/server/servers/stats';
import { ServerRepository } from '$lib/server/servers/repository';

export const GET = async ({ params }) => {
	const { id } = params;
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
					const server = await ServerRepository.getById(id);
					if (server?.containerId) {
						await getOrStartStats(server.id, server.containerId, server.name);
					}

					const stats = getStats(id);
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
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
