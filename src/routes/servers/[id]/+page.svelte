<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { ServerInfo, ServerStats } from '$lib/server/servers/schema';
	import { formatBytes, formatBytesAuto } from '$lib/conversions';
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
	import type { Log } from '$lib/components/ui/console';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import { Cpu, MemoryStick, Clock, ArrowDown, ArrowUp } from 'lucide-svelte';

	let id = $derived(page.params.id ?? '');
	let server = $state<ServerInfo | null>(null);
	let serverStats = $state<ServerStats | null>(null);
	let statsEventSource: EventSource | null = null;

	let logs: Log[] = [];

	let reconnectTimeout: ReturnType<typeof setTimeout>;
	let processing = $state(false);

	async function init(targetId: string) {
		cleanup();
		try {
			server = await getServerInfoById(targetId);
			if (server) {
				connectStats(targetId);
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

	function cleanup() {
		if (statsEventSource) statsEventSource.close();
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
	<div class="flex flex-col h-screen max-w-[1400px] mx-auto p-4 md:p-6 overflow-hidden">
		<header class="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
			<div class="flex flex-col">
				<h1 class="text-2xl font-bold tracking-tight">{server.name}</h1>
				<div class="flex items-center gap-2 mt-1">
					<div
						class="w-2 h-2 rounded-full {serverStats?.status === 'running'
							? 'bg-emerald-500 animate-pulse'
							: 'bg-zinc-500'}"
					></div>
					<span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						{serverStats?.status ?? 'Offline'}
					</span>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-2 w-full md:w-auto">
				<Button
					variant="default"
					class="font-bold"
					onclick={() => handleAction(startServer, 'Server started!')}
					disabled={processing || serverStats?.status === 'running'}
				>
					START
				</Button>

				<Button
					variant="outline"
					class="font-bold"
					onclick={() => handleAction(restartServer, 'Server restarting...', true)}
					disabled={processing || !serverStats || serverStats.status !== 'running'}
				>
					RESTART
				</Button>

				<Button
					variant="destructive"
					class="font-bold"
					onclick={() => handleAction(stopServer, 'Server stopped!')}
					disabled={processing || !serverStats || serverStats.status === 'offline'}
				>
					STOP
				</Button>
			</div>
		</header>

		<main class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 mt-6 overflow-hidden">
			<div
				class="lg:col-span-9 h-[40rem] min-h-0 order-2 lg:order-1 flex flex-col border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden"
			>
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

			<aside
				class="lg:col-span-3 order-1 lg:order-2 flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-none"
			>
				{#if serverStats}
					<StatCard name="CPU" value="{serverStats.cpu}%" icon={Cpu} />
					<StatCard
						name="Memory"
						value="{formatBytes(serverStats.memory)} / {formatBytes(
							server.memoryLimit * 1024 * 1024
						)}"
						icon={MemoryStick}
					/>
					<StatCard name="Uptime" value={serverStats.uptime} icon={Clock} />
					<StatCard
						name="Network In"
						value={formatBytesAuto(serverStats.networkInbound)}
						icon={ArrowDown}
					/>
					<StatCard
						name="Network Out"
						value={formatBytesAuto(serverStats.networkOutbound)}
						icon={ArrowUp}
					/>
				{:else}
					<div
						class="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-muted-foreground italic text-xs"
					>
						Awaiting statistics...
					</div>
				{/if}
			</aside>
		</main>
	</div>
{:else if !processing}
	<div class="flex items-center justify-center h-screen">
		<p class="text-muted-foreground font-mono">Server not found</p>
	</div>
{/if}
