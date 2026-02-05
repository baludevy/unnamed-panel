import { DockerService } from './docker.service';
import type { ServerStats } from './schema';

const statsCache = new Map<string, ServerStats>();
const activeStreams = new Map<string, any>();

function formatDuration(startMs: number): string {
	const diff = Math.floor((Date.now() - startMs) / 1000);
	if (diff < 0) return '00:00:00';
	const h = Math.floor(diff / 3600)
		.toString()
		.padStart(2, '0');
	const m = Math.floor((diff % 3600) / 60)
		.toString()
		.padStart(2, '0');
	const s = (diff % 60).toString().padStart(2, '0');
	return `${h}:${m}:${s}`;
}

export async function getOrStartStats(
	serverId: string,
	containerId: string,
	serverName: string
): Promise<ServerStats | null> {
	try {
		const inspect = await DockerService.inspectContainer(containerId);
		const { Running, Restarting, Status } = inspect.State;

		if (!Running && !Restarting) {
			cleanup(serverId);
			return null;
		}

		if (activeStreams.has(serverId)) {
			const cached = statsCache.get(serverId);
			if (cached) {
				cached.name = serverName;
				cached.status = Restarting ? 'restarting' : Status;
				if (cached.startTime) cached.uptime = formatDuration(cached.startTime);
				return cached;
			}
		}

		const startTime = new Date(inspect.State.StartedAt).getTime();
		const stream = await DockerService.getContainerStats(containerId);
		activeStreams.set(serverId, stream);

		stream.on('data', (chunk: Buffer) => {
			try {
				const stats = JSON.parse(chunk.toString());
				const cpuDelta =
					stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
				const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
				const cpuPercent =
					systemDelta > 0 ? (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100 : 0;

				statsCache.set(serverId, {
					name: serverName,
					id: serverId,
					cpu: Number(cpuPercent.toFixed(2)),
					memory: stats.memory_stats.usage || 0,
					uptime: formatDuration(startTime),
					status: Restarting ? 'restarting' : Status,
					startTime
				});
			} catch {}
		});

		stream.on('error', () => cleanup(serverId));
		stream.on('end', () => cleanup(serverId));

		return statsCache.get(serverId) || null;
	} catch {
		cleanup(serverId);
		return null;
	}
}

function cleanup(serverId: string) {
	const stream = activeStreams.get(serverId);
	if (stream) {
		stream.destroy();
		activeStreams.delete(serverId);
	}
	statsCache.delete(serverId);
}

export function getAllStats() {
	for (const stat of statsCache.values()) {
		if (stat.startTime) stat.uptime = formatDuration(stat.startTime);
	}
	return Object.fromEntries(statsCache);
}

export function getStats(serverId: string): ServerStats | null {
	return statsCache.get(serverId) || null;
}
