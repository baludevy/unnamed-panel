<script lang="ts">
	import { onMount } from 'svelte';
	import type { ServerInfo, ServerStats } from '$lib/server/servers/schema';
	import { formatBytes, formatBytesAuto, formatMegabytes } from '$lib/conversions';
	import { getServerInfoById, startServer, restartServer, stopServer } from '$lib/api/server';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import { toast } from '$lib/toast';

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

	function handleStart() {
		startServer(id)
			.then(() => toast.success('Server started!'))
			.catch((error) => toast.error(`${error.message}`));
	}

	function handleRestart() {
		restartServer(id)
			.then(() => toast.warning('Server restarting...'))
			.catch((error) => toast.error(`${error.message}`));
	}

	function handleStop() {
		stopServer(id)
			.then(() => toast.success('Server stopped!'))
			.catch((error) => toast.error(`${error.message}`));
	}
</script>

{#if server}
	<h1>{server.name}</h1>
	{#if serverStats}
		<p>CPU: {serverStats.cpu}%</p>
		<p>
			RAM: {formatBytesAuto(serverStats.memory)} / {formatBytesAuto(
				server.memoryLimit * 1024 * 1024
			)}
		</p>
		<p>Uptime: {serverStats.uptime}</p>
		<p>
			Network:
			{formatBytesAuto(serverStats.networkInbound)} in /
			{formatBytesAuto(serverStats.networkOutbound)} out
		</p>
		<p>Version: {server.version} {server.type}</p>
		<p>Address: {server.name}:{server.port}</p>
		<p>Status: {serverStats.status}</p>
	{/if}

	<Button
		variant="default"
		onclick={() => {
			handleStart();
		}}
		disabled={serverStats?.status === 'running'}>START</Button
	>

	<Button
		variant="outline"
		onclick={() => {
			handleRestart();
		}}
		disabled={serverStats?.status !== 'running' || serverStats === null}>RESTART</Button
	>

	<Button
		variant="destructive"
		onclick={() => {
			handleStop();
		}}
		disabled={serverStats?.status === 'stopped' || serverStats === null}>STOP</Button
	>
{:else}
	<p>:(</p>
{/if}
