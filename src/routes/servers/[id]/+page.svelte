<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { ServerInfo, ServerStats } from '$lib/server/servers/schema';
	import { formatBytesAuto } from '$lib/conversions';
	import {
		getServerInfoById,
		startServer,
		restartServer,
		stopServer,
		sendRconCommand
	} from '$lib/api/server';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import { toast } from '$lib/toast';
	import Console from '$lib/components/ui/console/console.svelte';

	interface LogEntry {
		text: string;
		timestamp: string;
		type: 'info' | 'warn' | 'error' | 'system';
	}

	let id = $derived(page.params.id ?? '');
	let server = $state<ServerInfo | null>(null);
	let serverStats = $state<ServerStats | null>(null);
	let statsEventSource: EventSource | null = null;

	let logs = $state<LogEntry[]>([]);
	let logsEventSource: EventSource | null = null;

	let reconnectTimeout: ReturnType<typeof setTimeout>;
	let processing = $state(false);

	function getLogType(line: string): LogEntry['type'] {
		const upper = line.toUpperCase();
		if (upper.includes('/WARN') || upper.includes('WARNING')) return 'warn';
		if (upper.includes('/ERROR') || upper.includes('SEVERE') || upper.includes('EXCEPTION'))
			return 'error';
		if (line.startsWith('[init]') || line.startsWith('Starting')) return 'system';
		return 'info';
	}

	async function init(targetId: string) {
		cleanup();
		try {
			server = await getServerInfoById(targetId);
			if (server) {
				connectStats(targetId);
				connectLogs(targetId);
			} else {
				toast.error('Server not found');
			}
		} catch (err) {
			toast.error('Could not fetch server information');
		}
	}

	function connectStats(targetId: string) {
		if (statsEventSource) statsEventSource.close();
		statsEventSource = new EventSource(`/api/servers/${targetId}/stats`);
		statsEventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data) serverStats = data;
			} catch {
				console.error('Failed to parse server stats');
			}
		};
		statsEventSource.onerror = () => {
			statsEventSource?.close();
			clearTimeout(reconnectTimeout);
			reconnectTimeout = setTimeout(() => connectStats(targetId), 5000);
		};
	}

	function connectLogs(targetId: string) {
		if (logsEventSource) logsEventSource.close();
		logsEventSource = new EventSource(`/api/servers/${targetId}/logs`);

		logsEventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				const line = data.line || '';
				if (!line) return;

				const newLog: LogEntry = {
					text: line,
					timestamp: data.timestamp || new Date().toISOString(),
					type: getLogType(line)
				};

				logs = [...logs.slice(-499), newLog];
			} catch (e) {
				console.error('Log parse error', e);
			}
		};

		logsEventSource.onerror = () => {
			logsEventSource?.close();
			clearTimeout(reconnectTimeout);
			reconnectTimeout = setTimeout(() => connectLogs(targetId), 5000);
		};
	}

	function cleanup() {
		if (statsEventSource) statsEventSource.close();
		if (logsEventSource) logsEventSource.close();
		clearTimeout(reconnectTimeout);
		server = null;
		serverStats = null;
		logs = [];
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
	<div class="flex flex-col items-center justify-center p-6">
		<!--<h1 class="text-2xl font-bold mb-4">{server.name}</h1>

		{#if serverStats}
			<div>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
					<div class="p-3 bg-secondary rounded shadow-sm">
						<span class="block text-muted-foreground uppercase text-[10px]">CPU</span>
						<strong>{serverStats.cpu}%</strong>
					</div>
					<div class="p-3 bg-secondary rounded shadow-sm">
						<span class="block text-muted-foreground uppercase text-[10px]">RAM</span>
						<strong>
							{formatBytesAuto(serverStats.memory)} / {formatBytesAuto(
								server.memoryLimit * 1024 * 1024
							)}
						</strong>
					</div>
					<div class="p-3 bg-secondary rounded shadow-sm">
						<span class="block text-muted-foreground uppercase text-[10px]">Status</span>
						<strong class="capitalize">{serverStats.status}</strong>
					</div>
					<div class="p-3 bg-secondary rounded shadow-sm">
						<span class="block text-muted-foreground uppercase text-[10px]">Version</span>
						<strong>{server.version}</strong>
					</div>
				</div>
			</div>
		{/if}!-->

		<div></div>

		<div class="w-[80%]">
			<div class="flex justify-between items-center mb-4">
				<h1 class="text-2xl font-bold">{server.name}</h1>
				<div class="flex gap-2">
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
				</div>
			</div>
			<div class="w-[80%]">
				<Console
					{logs}
					onCommand={async (cmd) => {
						try {
							await sendRconCommand(id, cmd);
						} catch (err) {
							toast.error('Failed to send command');
						}
					}}
				/>
			</div>
			<div class="w-[20%]">
				<div class="flex flex-col gap-2"></div>
			</div>
		</div>
	</div>
{:else if !processing}
	<div class="p-6 text-center">
		<p class="text-xl">Server not found</p>
	</div>
{/if}
