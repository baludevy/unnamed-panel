<script lang="ts">
	import { onMount } from 'svelte';
	import type { ServerInfo, ServerStats } from '$lib/server/servers/schema';
	import type { PageData } from './$types';
    import { formatBytes, formatMegabytes } from '$lib/conversions';

	export let data: PageData;

	let serverStats: ServerStats | null = null;

	onMount(() => {
		if (data.server?.id) {
			subscribeToStats();
		}
	});

	function subscribeToStats() {
		const eventSource = new EventSource(`/api/server/stats/${data.server?.id}`);

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

		return () => {
			eventSource.close();
		};
	}
</script>

{#if data.server}
	<h1>{data.server.name}</h1>
	{#if serverStats}
		<p>CPU: {serverStats.cpu}%</p>
		<p>RAM: {formatBytes(serverStats.memory)} / {formatMegabytes(data.server.memoryLimit)}</p>
	{/if}
{:else}
	<p>Server not found.</p>
{/if}
