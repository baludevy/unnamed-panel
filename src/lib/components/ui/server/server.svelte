<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';

	export let serverName = 'Server';
	export let status: 'running' | 'stopped' | 'exited' | 'missing' = 'stopped';
	export let cpuUsage: number = 0;
	export let memoryUsage: number = 0;
	export let memoryLimit: number = 0;
	export let uptime: string = '00:00:00';

	function formatBytes(bytes: number) {
		if (bytes === 0) return '0 GB';
		const gb = bytes / (1024 * 1024 * 1024);
		return gb.toFixed(1) + ' GB';
	}

	$: isRunning = status === 'running';
	$: displayCpu = isRunning ? `${cpuUsage}%` : '0%';
	$: displayMem = isRunning
		? `${formatBytes(memoryUsage)}/${formatBytes(memoryLimit)}`
		: `0/${formatBytes(memoryLimit)}`;
	$: displayUptime = isRunning ? uptime : '00:00:00';
</script>

<Card class="relative py-4 hover:cursor-pointer hover:bg-secondary/50 transition-colors">
	<CardContent class="h-10 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<h3 class="text-lg font-bold tracking-tight">
				{serverName}
			</h3>
		</div>

		<div class="flex items-center gap-2">
			<div class="flex items-center gap-2">
				<div
					class="flex flex-col items-center gap-1 {isRunning
						? 'text-secondary-foreground'
						: 'text-secondary-foreground/30'}"
				>
					<p class="bg-secondary p-1.5 rounded-[0.5rem] text-sm min-w-[2rem] text-center">
						{displayCpu}
					</p>
					<p class="text-xs text-secondary-foreground/30 font-semibold">CPU</p>
				</div>

				<div
					class="flex flex-col items-center gap-1 {isRunning
						? 'text-secondary-foreground'
						: 'text-secondary-foreground/30'}"
				>
					<p class="bg-secondary p-1.5 rounded-[0.5rem] text-sm min-w-[4rem] text-center">
						{displayMem}
					</p>
					<p class="text-xs text-secondary-foreground/30 font-semibold">MEMORY</p>
				</div>

				<div
					class="flex flex-col items-center gap-1 {isRunning
						? 'text-secondary-foreground'
						: 'text-secondary-foreground/30'}"
				>
					<p class="bg-secondary p-1.5 rounded-[0.5rem] text-sm min-w-[5rem] text-center">
						{displayUptime}
					</p>
					<p class="text-xs text-secondary-foreground/30 font-semibold">UPTIME</p>
				</div>
			</div>

			<div>
				<div
					class="absolute right-2 top-[11.25%] h-[77.5%] w-1.5 {isRunning
						? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]'
						: 'bg-secondary-foreground/10'} rounded-full transition-all duration-500"
				></div>
			</div>
		</div>
	</CardContent>
</Card>
