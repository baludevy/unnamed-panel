<script lang="ts">
	import type { Log } from '.';

	interface Props {
		logs: Log[];
		onCommand: (command: string) => Promise<void>;
	}

	let { logs, onCommand }: Props = $props();

	let command = $state('');
	let processing = $state(false);
	let viewport = $state<HTMLDivElement>();

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!command.trim() || processing) return;

		const cmdToSend = command;
		command = '';
		processing = true;

		try {
			await onCommand(cmdToSend);
		} finally {
			processing = false;
		}
	}

	$effect(() => {
		if (logs && viewport) {
			const threshold = 100;
			const isAtBottom =
				viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < threshold;
			if (isAtBottom) {
				setTimeout(() => {
					if (viewport) viewport.scrollTop = viewport.scrollHeight;
				}, 0);
			}
		}
	});
</script>

<div
	class="flex flex-col h-full w-full bg-card text-text font-mono text-xs overflow-hidden"
>
	<div
		bind:this={viewport}
		class="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-muted"
	>
		{#each logs as log}
			<div
				class="flex gap-3 px-2 py-0.5 rounded transition-colors hover:bg-white/5
                {log.type === 'warn'
					? 'text-warning bg-warning/5'
					: log.type === 'error'
						? 'text-destructive bg-destructive/5'
						: log.type === 'system'
							? 'text-blue-400 bg-blue-400/5'
							: ''}"
			>
				<span class="whitespace-pre-wrap break-all leading-relaxed">{log.text}</span>
			</div>
		{/each}

		{#if logs.length === 0}
			<div
				class="flex h-full items-center justify-center text-muted-foreground/50 italic select-none"
			>
				No logs available for this session
			</div>
		{/if}
	</div>

	<form
		onsubmit={handleSubmit}
		class="flex-none flex items-center gap-2 p-3 border-t border-border bg-card/50"
	>
		<span class="text-muted-foreground font-bold select-none">&gt;</span>
		<input
			bind:value={command}
			type="text"
			placeholder="Type a command..."
			class="flex-1 bg-transparent border-none text-foreground outline-none ring-0 focus:ring-0 placeholder:text-muted-foreground/50"
			disabled={processing}
			autocomplete="off"
			spellcheck="false"
		/>
	</form>
</div>
