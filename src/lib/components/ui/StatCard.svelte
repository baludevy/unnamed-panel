<script lang="ts">
	import Card from '$lib/components/ui/card/card.svelte';

	export let name: string;
	export let value: string;
</script>

<Card class="p-4">
	<div class="text-sm text-muted-foreground">{name}</div>
	<div class="text-lg font-semibold">{value}</div>
</Card>
