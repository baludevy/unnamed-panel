<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { ServerInfo, ServerStats } from '$lib/server/servers/schema';
	import { formatBytesAuto } from '$lib/conversions';
	import { getServerInfoById, startServer, restartServer, stopServer } from '$lib/api/server';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import { toast } from '$lib/toast';

	let id = $derived(page.params.id ?? '');
	let server = $state<ServerInfo | null>(null);
	let serverStats = $state<ServerStats | null>(null);
	let eventSource: EventSource | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout>;
	let processing = $state(false);

	async function init(targetId: string) {
		cleanup();
		try {
			server = await getServerInfoById(targetId);
			if (server) connectStats(targetId);
		} catch (err) {
			toast.error('Could not fetch server information');
		}
	}

	function connectStats(targetId: string) {
		if (eventSource) eventSource.close();

		eventSource = new EventSource(`/api/servers/${targetId}/stats`);

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data) serverStats = data;
			} catch {
				console.error('Failed to parse server stats');
			}
		};

		eventSource.onerror = () => {
			eventSource?.close();
			clearTimeout(reconnectTimeout);
			reconnectTimeout = setTimeout(() => connectStats(targetId), 5000);
		};
	}

	function cleanup() {
		if (eventSource) eventSource.close();
		clearTimeout(reconnectTimeout);
		server = null;
		serverStats = null;
	}

	async function handleAction(
		action: (id: string) => Promise<any>,
		successMsg: string,
		isWarning = false
	) {
		if (processing || !id) return;
		processing = true;
		try {
			await action(id);
			if (isWarning) toast.warning(successMsg);
			else toast.success(successMsg);
		} catch (err: any) {
			toast.error(err.message || 'Action failed');
		} finally {
			processing = false;
		}
	}

	$effect(() => {
		if (id) init(id);
		return cleanup;
	});

	onDestroy(cleanup);
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
			Network: {formatBytesAuto(serverStats.networkInbound)} in / {formatBytesAuto(
				serverStats.networkOutbound
			)} out
		</p>
		<p>Version: {server.version} {server.type}</p>
		<p>Address: {server.name}:{server.port}</p>
		<p>Status: {serverStats.status}</p>
	{/if}

	<Button
		variant="default"
		onclick={() => handleAction(startServer, 'Server started!')}
		disabled={processing || serverStats?.status === 'running'}
	>
		START
	</Button>

	<Button
		variant="outline"
		onclick={() => handleAction(restartServer, 'Server restarting...', true)}
		disabled={processing || !serverStats || serverStats.status !== 'running'}
	>
		RESTART
	</Button>

	<Button
		variant="destructive"
		onclick={() => handleAction(stopServer, 'Server stopped!')}
		disabled={processing || !serverStats || serverStats.status === 'offline'}
	>
		STOP
	</Button>
{:else if !processing}
	<p>:(</p>
{/if}
