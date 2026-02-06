<script lang="ts">
	import { toasts } from '$lib/toast';
	import {
		CheckCircle,
		CircleCheck,
		CircleX,
		Info,
		TriangleAlert,
		X,
		XCircle
	} from 'lucide-svelte';
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
	{#each $toasts as toast (toast.id)}
		<div
			class="
				flex
				items-center
				gap-3
				pointer-events-auto
				min-w-[260px]
				rounded-lg
				border
				border-current
				px-4
				py-2
				text-sm
				font-mono
				transition-colors
				motion-safe:animate-layout
				motion-safe:transition-transform
				motion-safe:duration-200
				motion-safe:ease-out
				motion-safe:animate-in
				motion-safe:fade-in
				motion-safe:slide-in-from-bottom-2

				{toast.type === 'default' && 'text-foreground'}
				{toast.type === 'success' && 'text-success '}
				{toast.type === 'warning' && 'text-warning'}
				{toast.type === 'error' && 'text-destructive'}
			"
		>
			{#if toast.type === 'default'}
				<div><Info size={20} /></div>
			{:else if toast.type === 'success'}
				<div><CircleCheck size={20} /></div>
			{:else if toast.type === 'warning'}
				<div><TriangleAlert size={20} /></div>
			{:else if toast.type === 'error'}
				<div><CircleX size={20} /></div>
			{/if}
			<div>{toast.message}</div>
		</div>
	{/each}
</div>
