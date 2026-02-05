<script lang="ts">
	import { onMount } from 'svelte';
	import Server from '$lib/components/ui/server/server.svelte';
	import type { ServerInfo } from '$lib/server/servers/schema';

	export let data: { servers: ServerInfo[] };

	let serverStats: Record<string, any> = {};

	onMount(() => {
		subscribeToStats();
	});

	function subscribeToStats() {
		const eventSource = new EventSource('/api/servers/stats');

		eventSource.onmessage = (event) => {
			try {
				serverStats = JSON.parse(event.data);
			} catch (err) {
				console.error('Failed to parse stats:', err);
			}
		};

		eventSource.onerror = () => {
			eventSource.close();
		};
	}
</script>

<div class="flex flex-col container mx-auto px-[15%] py-2 gap-3">
	{#each data.servers as server}
		{@const live = serverStats[server.id]}

		<Server
			serverName={server.name}
			status={live?.status || server.state}
			cpuUsage={live?.cpu || 0}
			memoryUsage={live?.memory || 0}
			memoryLimit={server.memoryLimit || 0}
			uptime={live?.uptime || '00:00:00'}
		/>
	{/each}
</div>
