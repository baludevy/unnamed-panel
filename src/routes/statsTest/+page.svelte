<script lang="ts">
	import { onMount } from 'svelte';

	let stats: Record<string, any> = {};

	onMount(() => {
		const eventSource = new EventSource('/api/servers/stats');

		eventSource.onmessage = (event) => {
			stats = JSON.parse(event.data);
		};

		eventSource.onerror = (err) => {
			console.error('EventSource failed:', err);
			eventSource.close();
		};

		return () => eventSource.close();
	});
</script>

<div class="grid">
	{#each Object.entries(stats) as [id, data]}
		<div class="stat-card">
			<h3>Server {id}</h3>
			<p>CPU: {data.cpu}%</p>
			<p>RAM: {(data.memory / 1024 / 1024).toFixed(0)}MB</p>
		</div>
	{/each}
</div>
