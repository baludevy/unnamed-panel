<script lang="ts">
	import Server from '$lib/components/ui/server/server.svelte';
</script>

<div class="flex flex-col container mx-auto px-[20%] gap-3">
	<Server serverName="Server 1" status="running" />
	<Server serverName="Server 2" status="stopped" />
</div>
