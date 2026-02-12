<script lang="ts">
	import type { Component } from 'lucide-svelte';
	export let name: string;
	export let value: string;
	export let icon: typeof Component;
</script>

<div class="group flex items-center justify-between p-4 bg-card border rounded-md">
	<div class="space-y-1">
		<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
			{name}
		</p>
		<p class="text-md font-semibold tracking-tight">
			{value}
		</p>
	</div>
	<div
		class="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary/50 text-secondary-foreground"
	>
		<svelte:component this={icon} size={20} strokeWidth={2.5} />
	</div>
</div>
