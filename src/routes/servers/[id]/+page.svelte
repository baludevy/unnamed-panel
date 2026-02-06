<script lang="ts">
	import { onMount } from 'svelte';
	import type { ServerInfo, ServerStats } from '$lib/server/servers/schema';
	import { formatBytes, formatMegabytes } from '$lib/conversions';
	import { getServerInfoById, startServer, stopServer } from '$lib/api/server';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';

	let id: string = page.params.id ?? '';

	let server: ServerInfo | null = null;
	let serverStats: ServerStats | null = null;

	onMount(async () => {
		subscribeToStats();
		server = await getServerInfoById(id);
	});

	function subscribeToStats() {
		const eventSource = new EventSource(`/api/servers/${id}/stats`);

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

{#if server}
	<h1>{server.name}</h1>
	{#if serverStats}
		<p>CPU: {serverStats.cpu}%</p>
		<p>RAM: {formatBytes(serverStats.memory)} / {formatMegabytes(server.memoryLimit)}</p>
	{/if}

	<Button variant="default" onclick={() => startServer(id)}>START</Button>
	<Button variant="outline" onclick={() => stopServer(id)}>STOP</Button>
{:else}
	<p>:(</p>
{/if}
