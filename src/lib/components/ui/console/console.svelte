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

<div class="flex flex-col gap-2 w-full">
	<div
		class="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden shadow-inner"
	>
		<div
			bind:this={viewport}
			class="h-[600px] overflow-y-auto font-mono text-xs leading-relaxed p-4 text-zinc-300"
		>
			{#each logs as log}
				<div
					class="group flex gap-3 py-0.5 px-2 hover:bg-zinc-900/50 rounded transition-colors
                    {log.type === 'warn'
						? 'text-yellow-400 bg-yellow-400/5'
						: log.type === 'error'
							? 'text-red-400 bg-red-400/5'
							: log.type === 'system'
								? 'text-blue-400 bg-blue-400/5'
								: ''}"
				>
					<span class="whitespace-pre-wrap break-all">{log.text}</span>
				</div>
			{/each}
			{#if logs.length === 0}
				<div class="h-full flex items-center justify-center text-zinc-600 italic">
					No logs available for this session
				</div>
			{/if}
		</div>

		<form
			onsubmit={handleSubmit}
			class="flex items-center gap-2 p-2 border-t border-zinc-800 bg-zinc-900/50"
		>
			<span class="pl-2 text-zinc-500 font-mono text-xs select-none">&gt;</span>
			<input
				bind:value={command}
				type="text"
				placeholder="Type a command..."
				class="flex-1 bg-transparent border-none text-zinc-200 font-mono text-xs focus:ring-0 outline-none placeholder:text-zinc-600"
				disabled={processing}
			/>
		</form>
	</div>
</div>
