<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Server from '$lib/components/ui/server/server.svelte';
	import type { ServerInfo } from '$lib/server/servers/schema';
	import { getAllServerInfo } from '$lib/api/server';

	let servers: ServerInfo[] = [];
	let serverStats: Record<string, any> = {};
	let eventSource: EventSource | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout>;

	async function loadServers() {
		try {
			servers = await getAllServerInfo();
		} catch (err) {
			console.error('Failed to load servers:', err);
		}
	}

	function subscribeToStats() {
		if (eventSource) eventSource.close();

		eventSource = new EventSource('/api/servers/stats');

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data && typeof data === 'object') {
					serverStats = data;
				}
			} catch (err) {
				console.error('Stats Parse Error:', err);
			}
		};

		eventSource.onerror = () => {
			eventSource?.close();
			clearTimeout(reconnectTimeout);
			reconnectTimeout = setTimeout(subscribeToStats, 5000);
		};
	}

	onMount(() => {
		loadServers();
		subscribeToStats();
	});

	onDestroy(() => {
		if (eventSource) eventSource.close();
		clearTimeout(reconnectTimeout);
	});
</script>

<div class="flex flex-col container mx-auto px-[15%] py-2 gap-3">
	{#each servers as server (server.id)}
		{@const live = serverStats[server.id]}

		<a href="/servers/{server.id}" class="block transition-transform active:scale-[0.99]">
			<Server
				serverName={server.name}
				status={live?.status ?? server.state ?? 'unknown'}
				cpuUsage={live?.cpu ?? 0}
				memoryUsage={live?.memory ?? 0}
				memoryLimit={server.memoryLimit ?? 0}
				uptime={live?.uptime ?? '00:00:00'}
			/>
		</a>
	{:else}
		<div class="text-center py-10 opacity-50">
			No servers found.
		</div>
	{/each}
</div>