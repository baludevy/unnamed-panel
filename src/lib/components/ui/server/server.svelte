<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';

	export let serverName = 'Survival World';
	export let status: 'running' | 'stopped' = 'stopped';
	export let cpuUsage: string = '21%';
	export let memoryUsage: string = '4.1/6 GB';
	export let uptime: string = '06:07:41';

	if (status === 'stopped') {
		uptime = '00:00:00';
		cpuUsage = '0%';
		memoryUsage = '0/7 GB';
	}

	function setStatus(newStatus: 'running' | 'stopped') {
		status = newStatus;
	}
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
				<!-- cpu -->
				<div
					class="flex flex-col items-center gap-1 text-secondary-foreground{status === 'running'
						? ''
						: '/30'}"
				>
					<p class="bg-secondary p-1.5 rounded-[0.5rem] text-sm">{cpuUsage}</p>
					<p class="text-xs text-secondary-foreground/30">CPU</p>
				</div>

				<!-- memory -->
				<div
					class="flex flex-col items-center gap-1 text-secondary-foreground{status === 'running'
						? ''
						: '/30'}"
				>
					<p class="bg-secondary p-1.5 rounded-[0.5rem] text-sm">{memoryUsage}</p>
					<p class="text-xs text-secondary-foreground/30">MEMORY</p>
				</div>

				<!-- uptime -->
				<div
					class="flex flex-col items-center gap-1 text-secondary-foreground{status === 'running'
						? ''
						: '/30'}"
				>
					<p class="bg-secondary p-1.5 rounded-[0.5rem] text-sm">{uptime}</p>
					<p class="text-xs text-secondary-foreground/30">UPTIME</p>
				</div>
			</div>

			<div>
				<div
					class="absolute right-2 top-[11.25%] h-[77.5%] w-1.5 {status === 'running'
						? 'bg-secondary-foreground'
						: 'bg-secondary-foreground/10'} rounded-full"
				></div>
			</div>
		</div>
	</CardContent>
</Card>
