<script lang="ts">
	import ToastHost from '$lib/components/ui/ToastHost.svelte';
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	let { children } = $props();
</script>

<ToastHost />
<ModeWatcher />
{@render children?.()}
