<script lang="ts">
	import { onMount } from 'svelte';
	import Server from '$lib/components/ui/server/server.svelte';
	import type { ServerInfo } from '$lib/server/servers/schema';

	export let data: { servers: ServerInfo[] };

	let stats: Record<string, any> = {};

	onMount(() => {
		const eventSource = new EventSource('/api/servers/stats');

		eventSource.onmessage = (event) => {
			try {
				stats = JSON.parse(event.data);
			} catch (err) {
				console.error('Failed to parse stats:', err);
			}
		};

		eventSource.onerror = () => {
			eventSource.close();
		};

		return () => eventSource.close();
	});
</script>

<div class="flex flex-col container mx-auto px-[20%] py-2 gap-3">
	{#each data.servers as server}
		{@const live = stats[server.id]}

		<Server
			serverName={server.name}
			status={live?.status || server.state}
			cpuUsage={live?.cpu || 0}
			memoryUsage={live?.memory || 0}
			memoryLimit={live?.memoryLimit || 0}
			uptime={live?.uptime || '00:00:00'}
		/>
	{/each}
</div>
